import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const websiteRoot = path.resolve(import.meta.dirname, "..");
const cookiesRoot = path.resolve(
  process.argv[2] ?? path.join(websiteRoot, "..", "Cookies"),
);
const websiteCatalogPath = path.join(
  websiteRoot,
  "contracts",
  "skyblock-items-v2.json",
);
const gameplayCatalogPath = path.join(
  cookiesRoot,
  "Skyblock",
  "catalog",
  "skyblock-items-v2.json",
);

const [websiteCatalog, gameplayCatalog] = await Promise.all([
  readFile(websiteCatalogPath, "utf8").then(JSON.parse),
  readFile(gameplayCatalogPath, "utf8").then(JSON.parse),
]);

assert.deepEqual(
  websiteCatalog,
  gameplayCatalog,
  "Skyblock gameplay catalog drifted from contracts/skyblock-items-v2.json",
);
console.log(
  "Skyblock gameplay catalog matches contracts/skyblock-items-v2.json.",
);
