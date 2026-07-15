import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// In the production image Nitro places bundled dependencies under /app/server/node_modules.
// Anchoring resolution to the server bundle also keeps this script runnable from a source checkout,
// where Node falls back to the repository-level node_modules directory.
const require = createRequire(new URL("../server/index.mjs", import.meta.url));
const { applicationDefault, cert, getApps, initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const bundledPostgresUrl = new URL("../server/node_modules/postgres/src/index.js", import.meta.url);
const postgresModule = await import(existsSync(fileURLToPath(bundledPostgresUrl)) ? bundledPostgresUrl.href : "postgres");
const postgres = postgresModule.default || postgresModule;

const roles = new Set(["viewer", "moderator", "editor", "operator", "owner"]);
const rawArgs = process.argv.slice(2);
const createIfMissing = rawArgs[0] === "--create";
const [rawEmail, role, displayName] = rawArgs.slice(createIfMissing ? 1 : 0);
const email = rawEmail?.trim().toLowerCase();
if (
  !email
  || email.length > 320
  || !email.includes("@")
  || !roles.has(role)
  || (displayName && (displayName.length > 128 || /[\u0000-\u001f\u007f]/.test(displayName)))
) {
  console.error("Usage: npm run admin:provision -- [--create] <email> <viewer|moderator|editor|operator|owner> [display name]");
  console.error("--create creates a Firebase account without a password when the address does not exist.");
  process.exit(1);
}
const databaseUrl = process.env.NUXT_DATABASE_URL;
if (!databaseUrl) throw new Error("NUXT_DATABASE_URL is required");

function serviceAccount() {
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64;
  if (!encoded) return undefined;
  const parsed = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
  return {
    projectId: parsed.project_id,
    clientEmail: parsed.client_email,
    privateKey: parsed.private_key,
  };
}

const account = serviceAccount();
const app = getApps()[0] || initializeApp({
  credential: account ? cert(account) : applicationDefault(),
  ...(process.env.NUXT_FIREBASE_PROJECT_ID ? { projectId: process.env.NUXT_FIREBASE_PROJECT_ID } : {}),
});
const auth = getAuth(app);
let firebaseUser;
let createdWithoutPassword = false;
try {
  firebaseUser = await auth.getUserByEmail(email);
} catch (error) {
  if (!createIfMissing || error?.code !== "auth/user-not-found") throw error;
  firebaseUser = await auth.createUser({
    email,
    ...(displayName ? { displayName } : {}),
    disabled: false,
  });
  createdWithoutPassword = true;
}

await auth.setCustomUserClaims(firebaseUser.uid, {
  ...firebaseUser.customClaims,
  admin: true,
});

const sql = postgres(databaseUrl, { prepare: false });
try {
  await sql`
    INSERT INTO admin_users (firebase_uid, email, display_name, role, enabled)
    VALUES (${firebaseUser.uid}, ${firebaseUser.email || email}, ${displayName || firebaseUser.displayName || null}, ${role}, true)
    ON CONFLICT (firebase_uid) DO UPDATE
      SET email = excluded.email,
          display_name = excluded.display_name,
          role = excluded.role,
          enabled = true,
          updated_at = now()
  `;
  console.log(`Provisioned ${firebaseUser.email || email} as ${role}. Existing Firebase sessions must be refreshed.`);
  if (createdWithoutPassword) {
    console.log("The Firebase account has no password. Send a password-reset email from the Firebase console; never generate or transmit a temporary password.");
  }
} finally {
  await sql.end();
}
