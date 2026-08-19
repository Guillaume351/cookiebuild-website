import { sql } from "drizzle-orm";
import { createError } from "h3";
import db from "../../db/client";
import {
  MOBILE_KIT_CATALOG,
  weeklyFreeMicroKits,
  type KitDefinition,
  type KitLevelDefinition,
} from "./mobile-kit-catalog";
import { requirePrimaryLinkedPlayer } from "./mobile-social";
import type { MobileDbTransaction } from "./mobile-user";

export { MOBILE_KIT_CATALOG, weeklyFreeMicroKits } from "./mobile-kit-catalog";

interface ProgressionRow extends Record<string, unknown> {
  level: number;
  experience: number;
  unlockedKits: string | null;
  selectedKitName: string | null;
  selectedKitLevel: number;
}

interface PlayerRow extends Record<string, unknown> {
  coins: number;
  playerName: string | null;
}

interface LedgerRow extends Record<string, unknown> {
  exists: boolean;
}

function parseUnlocked(value: string | null) {
  try {
    const parsed: unknown = JSON.parse(value ?? "[]");
    return new Set(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []);
  } catch {
    throw createError({ statusCode: 500, statusMessage: "Invalid kit progression" });
  }
}

function unlockKey(gamemode: keyof typeof MOBILE_KIT_CATALOG, kit: KitDefinition, level: number) {
  return gamemode === "skywars" ? `kit:${kit.id}` : `${kit.name}:L${level}`;
}

function selectedName(gamemode: keyof typeof MOBILE_KIT_CATALOG, kit: KitDefinition) {
  return gamemode === "skywars" ? kit.id : kit.name;
}

function defaultSelection(gamemode: keyof typeof MOBILE_KIT_CATALOG) {
  return gamemode === "skywars" ? { name: "scout", level: 1 } : { name: "Default", level: 0 };
}

function kitLevelUnlocked(
  gamemode: keyof typeof MOBILE_KIT_CATALOG,
  kit: KitDefinition,
  level: KitLevelDefinition,
  unlocked: Set<string>,
  freeKits: Set<string>,
) {
  return level.defaultUnlocked === true
    || (gamemode === "microbattles" && level.level === 1 && freeKits.has(kit.name))
    || unlocked.has(unlockKey(gamemode, kit, level.level));
}

function catalogKey(value: string): keyof typeof MOBILE_KIT_CATALOG {
  if (value === "microbattles" || value === "skywars") return value;
  throw createError({ statusCode: 404, statusMessage: "Kit shop unavailable for this game" });
}

function requestedKit(gamemode: keyof typeof MOBILE_KIT_CATALOG, kitId: string, level: number) {
  const kit = MOBILE_KIT_CATALOG[gamemode].kits.find((candidate) => candidate.id === kitId);
  const tier = kit?.levels.find((candidate) => candidate.level === level);
  if (!kit || !tier) throw createError({ statusCode: 404, statusMessage: "Kit upgrade not found" });
  return { kit, tier };
}

async function lockProgression(tx: MobileDbTransaction, playerId: string, gamemode: keyof typeof MOBILE_KIT_CATALOG) {
  await tx.execute(sql`
    INSERT INTO minigame_progression
      (player_id, minigame, level, experience, unlocked_kits, last_selected_kit_level)
    VALUES (${playerId}, ${gamemode}, 1, 0, '[]', 0)
    ON CONFLICT (player_id, minigame) DO NOTHING
  `);
  const rows = await tx.execute<ProgressionRow>(sql`
    SELECT level,
           experience,
           unlocked_kits AS "unlockedKits",
           last_selected_kit_name AS "selectedKitName",
           last_selected_kit_level AS "selectedKitLevel"
      FROM minigame_progression
     WHERE player_id = ${playerId} AND minigame = ${gamemode}
     FOR UPDATE
  `);
  return rows[0]!;
}

/**
 * Shared mutation order with CookieDough: mobile identity/link, playerdata, then
 * minigame_progression. Every writer must hold the player row before replacing
 * unlocked_kits so an XP update or in-game selection cannot be lost.
 */
async function lockKitMutation(
  tx: MobileDbTransaction,
  firebaseUid: string,
  gamemode: keyof typeof MOBILE_KIT_CATALOG,
) {
  const actor = await requirePrimaryLinkedPlayer(tx, firebaseUid);
  const players = await tx.execute<PlayerRow>(sql`
    SELECT name AS "playerName", coins
      FROM playerdata
     WHERE id = ${actor.playerId}
     FOR UPDATE
  `);
  const player = players[0];
  if (!player) throw createError({ statusCode: 428, statusMessage: "Primary player link required" });
  const progression = await lockProgression(tx, actor.playerId, gamemode);
  return { actor, player, progression };
}

async function shopSnapshot(tx: MobileDbTransaction, firebaseUid: string, now = new Date()) {
  const actor = await requirePrimaryLinkedPlayer(tx, firebaseUid);
  const players = await tx.execute<PlayerRow>(sql`
    SELECT name AS "playerName", coins
      FROM playerdata
     WHERE id = ${actor.playerId}
     LIMIT 1
  `);
  const player = players[0]!;
  const progressionRows = await tx.execute<(ProgressionRow & { minigame: string })>(sql`
    SELECT minigame,
           level,
           experience,
           unlocked_kits AS "unlockedKits",
           last_selected_kit_name AS "selectedKitName",
           last_selected_kit_level AS "selectedKitLevel"
      FROM minigame_progression
     WHERE player_id = ${actor.playerId}
       AND minigame IN ('microbattles', 'skywars')
  `);
  const progressionByGame = new Map(progressionRows.map((row) => [row.minigame, row]));
  const freeKits = new Set(weeklyFreeMicroKits(now));

  return {
    player: {
      playerId: actor.playerId,
      playerName: player.playerName ?? actor.playerName,
      coins: Number(player.coins),
    },
    gamemodes: Object.entries(MOBILE_KIT_CATALOG).map(([rawGamemode, definition]) => {
      const gamemode = rawGamemode as keyof typeof MOBILE_KIT_CATALOG;
      const progression = progressionByGame.get(gamemode);
      const unlocked = parseUnlocked(progression?.unlockedKits ?? "[]");
      const fallback = defaultSelection(gamemode);
      const currentName = progression?.selectedKitName || fallback.name;
      const currentLevel = Number(progression?.selectedKitLevel ?? fallback.level);
      const playerLevel = Math.max(1, Number(progression?.level ?? 1));
      return {
        id: gamemode,
        name: definition.name,
        playerLevel,
        experience: Math.max(0, Number(progression?.experience ?? 0)),
        weeklyFreeKits: gamemode === "microbattles" ? [...freeKits] : [],
        kits: definition.kits.map((kit) => ({
          id: kit.id,
          name: kit.name,
          description: kit.description,
          levels: kit.levels.map((level) => {
            const unlockedNow = kitLevelUnlocked(gamemode, kit, level, unlocked, freeKits);
            const previous = level.level <= 1
              || kitLevelUnlocked(gamemode, kit, kit.levels[level.level - 2]!, unlocked, freeKits);
            return {
              level: level.level,
              price: level.price,
              requiredLevel: level.requiredLevel,
              unlocked: unlockedNow,
              weeklyFree: gamemode === "microbattles" && level.level === 1 && freeKits.has(kit.name),
              selected: unlockedNow
                && currentName.toLowerCase() === selectedName(gamemode, kit).toLowerCase()
                && currentLevel === level.level,
              canPurchase: !unlockedNow && previous && playerLevel >= level.requiredLevel && Number(player.coins) >= level.price,
              canSelect: unlockedNow,
            };
          }),
        })),
      };
    }),
  };
}

export async function mobileKitShopSnapshot(firebaseUid: string) {
  return db.transaction((tx) => shopSnapshot(tx, firebaseUid));
}

export async function purchaseMobileKit(
  firebaseUid: string,
  rawGamemode: string,
  kitId: string,
  level: number,
) {
  const gamemode = catalogKey(rawGamemode);
  const { kit, tier } = requestedKit(gamemode, kitId, level);
  await db.transaction(async (tx) => {
    const { actor, player, progression } = await lockKitMutation(tx, firebaseUid, gamemode);
    const unlocked = parseUnlocked(progression.unlockedKits);
    const freeKits = new Set(weeklyFreeMicroKits());
    const alreadyUnlocked = kitLevelUnlocked(gamemode, kit, tier, unlocked, freeKits);
    const source = `kit:${gamemode}:${unlockKey(gamemode, kit, tier.level)}`;
    const ledgerRows = await tx.execute<LedgerRow>(sql`
      SELECT true AS exists
        FROM coin_transactions
       WHERE player_id = ${actor.playerId} AND source = ${source}
       LIMIT 1
    `);
    const purchaseRecorded = ledgerRows[0]?.exists === true;
    const previousUnlocked = tier.level <= 1
      || kitLevelUnlocked(gamemode, kit, kit.levels[tier.level - 2]!, unlocked, freeKits);
    if (!alreadyUnlocked && Number(progression.level) < tier.requiredLevel) {
      throw createError({ statusCode: 409, statusMessage: "Player level too low" });
    }
    if (!alreadyUnlocked && !previousUnlocked) {
      throw createError({ statusCode: 409, statusMessage: "Previous kit tier required" });
    }
    if (!alreadyUnlocked && !purchaseRecorded && Number(player.coins) < tier.price) {
      throw createError({ statusCode: 409, statusMessage: "Not enough coins" });
    }
    if (!alreadyUnlocked) {
      unlocked.add(unlockKey(gamemode, kit, tier.level));
      if (!purchaseRecorded) {
        await tx.execute(sql`
          UPDATE playerdata SET coins = coins - ${tier.price}
           WHERE id = ${actor.playerId}
        `);
        await tx.execute(sql`
          INSERT INTO coin_transactions (id, player_id, amount, source, created_at)
          VALUES (gen_random_uuid(), ${actor.playerId}, ${-tier.price}, ${source}, now())
        `);
      }
    }
    await tx.execute(sql`
      UPDATE minigame_progression
         SET unlocked_kits = ${JSON.stringify([...unlocked])},
             last_selected_kit_name = ${selectedName(gamemode, kit)},
             last_selected_kit_level = ${tier.level},
             updated_at = now(),
             last_progress_at = now()
       WHERE player_id = ${actor.playerId} AND minigame = ${gamemode}
    `);
    console.info(`[funnel] event=${alreadyUnlocked ? "kit_selected" : "kit_purchased"} edition=unknown game=${MOBILE_KIT_CATALOG[gamemode].name} source=mobile kit=${kit.id} level=${tier.level}`);
  });
  return mobileKitShopSnapshot(firebaseUid);
}

export async function selectMobileKit(
  firebaseUid: string,
  rawGamemode: string,
  kitId: string,
  level: number,
) {
  const gamemode = catalogKey(rawGamemode);
  const { kit, tier } = requestedKit(gamemode, kitId, level);
  await db.transaction(async (tx) => {
    const { actor, progression } = await lockKitMutation(tx, firebaseUid, gamemode);
    const unlocked = parseUnlocked(progression.unlockedKits);
    if (!kitLevelUnlocked(gamemode, kit, tier, unlocked, new Set(weeklyFreeMicroKits()))) {
      throw createError({ statusCode: 409, statusMessage: "Unlock this kit first" });
    }
    await tx.execute(sql`
      UPDATE minigame_progression
         SET last_selected_kit_name = ${selectedName(gamemode, kit)},
             last_selected_kit_level = ${tier.level},
             updated_at = now(),
             last_progress_at = now()
       WHERE player_id = ${actor.playerId} AND minigame = ${gamemode}
    `);
    console.info(`[funnel] event=kit_selected edition=unknown game=${MOBILE_KIT_CATALOG[gamemode].name} source=mobile kit=${kit.id} level=${tier.level}`);
  });
  return mobileKitShopSnapshot(firebaseUid);
}
