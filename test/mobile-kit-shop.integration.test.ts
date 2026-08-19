import { readFile } from "node:fs/promises";
import postgres, { type Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const databaseUrl = process.env.MOBILE_KIT_SHOP_INTEGRATION_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;
const PLAYER_ID = "60000000-0000-4000-8000-000000000001";
const FIREBASE_UID = "kit-shop-concurrency-user";

integration("mobile kit shop transaction locking", () => {
  let setupSql: Sql;
  let databaseModule: typeof import("../db/client");
  let kitShop: typeof import("../server/services/mobile-kit-shop");

  beforeAll(async () => {
    process.env.NUXT_DATABASE_URL = databaseUrl!;
    setupSql = postgres(databaseUrl!, { prepare: false, max: 4 });
    await setupSql.unsafe(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      CREATE TABLE playerdata (
        id uuid PRIMARY KEY,
        name varchar(255),
        coins integer NOT NULL DEFAULT 0
      );
      CREATE TABLE minigame_progression (
        player_id uuid NOT NULL REFERENCES playerdata(id),
        minigame varchar(255) NOT NULL,
        level integer NOT NULL DEFAULT 1,
        experience integer NOT NULL DEFAULT 0,
        unlocked_kits varchar,
        last_selected_kit_name varchar(255),
        last_selected_kit_level integer NOT NULL DEFAULT 0,
        updated_at timestamp,
        last_progress_at timestamp,
        PRIMARY KEY (player_id, minigame)
      );
      CREATE TABLE coin_transactions (
        id uuid PRIMARY KEY,
        player_id uuid NOT NULL REFERENCES playerdata(id),
        amount integer NOT NULL,
        source varchar(180) NOT NULL,
        created_at timestamp NOT NULL,
        CONSTRAINT uq_coin_transaction_player_source UNIQUE (player_id, source)
      );
    `);
    const foundation = await readFile(
      new URL("../drizzle/0001_mobile_foundation.sql", import.meta.url),
      "utf8",
    );
    await setupSql.unsafe(foundation);
    await setupSql`
      INSERT INTO playerdata (id, name, coins) VALUES (${PLAYER_ID}, 'KitRace', 1000)
    `;
    await setupSql`
      INSERT INTO minigame_progression
        (player_id, minigame, level, experience, unlocked_kits)
      VALUES (${PLAYER_ID}, 'microbattles', 10, 0, '[]')
    `;
    await setupSql`
      INSERT INTO mobile_users (firebase_uid) VALUES (${FIREBASE_UID})
    `;
    await setupSql`
      INSERT INTO mobile_player_links (firebase_uid, player_id, edition, is_primary)
      VALUES (${FIREBASE_UID}, ${PLAYER_ID}, 'java', true)
    `;
    databaseModule = await import("../db/client");
    kitShop = await import("../server/services/mobile-kit-shop");
  }, 30_000);

  afterAll(async () => {
    await databaseModule?.postgresClient.end({ timeout: 2 });
    await setupSql?.end({ timeout: 2 });
  });

  it("preserves an in-game progression update while a mobile purchase waits on playerdata", async () => {
    let releaseGameplay!: () => void;
    let signalLocked!: () => void;
    const release = new Promise<void>((resolve) => { releaseGameplay = resolve; });
    const locked = new Promise<void>((resolve) => { signalLocked = resolve; });

    const gameplayMutation = setupSql.begin(async (tx) => {
      await tx`SELECT id FROM playerdata WHERE id = ${PLAYER_ID} FOR UPDATE`;
      signalLocked();
      await release;
      const [progression] = await tx<{ unlockedKits: string }[]>`
        SELECT unlocked_kits AS "unlockedKits"
          FROM minigame_progression
         WHERE player_id = ${PLAYER_ID} AND minigame = 'microbattles'
         FOR UPDATE
      `;
      const unlocked = JSON.parse(progression!.unlockedKits) as string[];
      unlocked.push("gameplay-owned-unlock");
      await tx`
        UPDATE minigame_progression
           SET experience = 42, unlocked_kits = ${JSON.stringify(unlocked)}
         WHERE player_id = ${PLAYER_ID} AND minigame = 'microbattles'
      `;
    });
    await locked;

    let purchaseFinished = false;
    const purchase = kitShop.purchaseMobileKit(
      FIREBASE_UID,
      "microbattles",
      "explosive_archer",
      1,
    ).then((value) => {
      purchaseFinished = true;
      return value;
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(purchaseFinished).toBe(false);
    releaseGameplay();
    await Promise.all([gameplayMutation, purchase]);

    await kitShop.purchaseMobileKit(FIREBASE_UID, "microbattles", "explosive_archer", 1);
    const [state] = await setupSql<{
      coins: number;
      experience: number;
      unlockedKits: string;
      ledgerRows: number;
    }[]>`
      SELECT player.coins,
             progression.experience,
             progression.unlocked_kits AS "unlockedKits",
             (SELECT count(*)::int FROM coin_transactions WHERE player_id = ${PLAYER_ID}) AS "ledgerRows"
        FROM playerdata player
        JOIN minigame_progression progression ON progression.player_id = player.id
       WHERE player.id = ${PLAYER_ID} AND progression.minigame = 'microbattles'
    `;
    expect(state).toMatchObject({ coins: 750, experience: 42, ledgerRows: 1 });
    expect(JSON.parse(state!.unlockedKits)).toEqual(expect.arrayContaining([
      "gameplay-owned-unlock",
      "Explosive Archer:L1",
    ]));
  });
});
