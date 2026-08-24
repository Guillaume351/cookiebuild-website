import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import process from "node:process";

const contract = JSON.parse(
  await readFile(
    new URL("../contracts/skyblock-schema-v1.json", import.meta.url),
  ),
);
const schema = await readFile(
  new URL("../db/schema.ts", import.meta.url),
  "utf8",
);

const camel = (value) =>
  value.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
for (const [table, columns] of Object.entries(contract.tables)) {
  const marker = `"${table}"`;
  const start = schema.indexOf(marker);
  if (start < 0) throw new Error(`db/schema.ts is missing ${table}`);
  const next = schema.indexOf("\nexport const ", start + marker.length);
  const definition = schema.slice(start, next < 0 ? schema.length : next);
  for (const column of columns) {
    if (
      !definition.includes(`"${column}"`) &&
      !definition.includes(`${camel(column)}:`)
    ) {
      throw new Error(`db/schema.ts ${table} is missing ${column}`);
    }
  }
}

const gameplayContracts = [
  {
    path: process.env.COOKIEBUILD_GAMEPLAY_SCHEMA_SQL,
    digest: contract.gameplayMigrationSha256,
    label: "Skyblock V1",
  },
  {
    path: process.env.COOKIEBUILD_GAMEPLAY_ECONOMY_V2_SQL,
    digest: contract.gameplayEconomyV2MigrationSha256,
    label: "Skyblock economy V2",
  },
];
const configuredGameplayContracts = gameplayContracts.filter(
  (gameplayContract) => gameplayContract.path,
);
if (
  configuredGameplayContracts.length > 0 &&
  configuredGameplayContracts.length !== gameplayContracts.length
) {
  const missingLabels = gameplayContracts
    .filter((gameplayContract) => !gameplayContract.path)
    .map((gameplayContract) => gameplayContract.label)
    .join(", ");
  throw new Error(
    `Gameplay schema verification requires both V1 and V2 migrations; missing ${missingLabels}.`,
  );
}

let matchedGameplayContracts = 0;
for (const gameplayContract of gameplayContracts) {
  if (!gameplayContract.path) continue;
  const gameplay = await readFile(gameplayContract.path);
  const digest = createHash("sha256").update(gameplay).digest("hex");
  if (digest !== gameplayContract.digest) {
    throw new Error(
      `${gameplayContract.label} migration drifted (${digest}); review both schemas and update the contract atomically.`,
    );
  }
  matchedGameplayContracts += 1;
}

process.stdout.write(
  `Skyblock schema contract verified (${Object.keys(contract.tables).length} tables${matchedGameplayContracts ? `, ${matchedGameplayContracts} gameplay hash${matchedGameplayContracts === 1 ? "" : "es"} matched` : ", website-only mode"}).\n`,
);
