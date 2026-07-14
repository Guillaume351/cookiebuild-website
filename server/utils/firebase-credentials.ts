export interface FirebaseServiceAccount {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

const MAX_SERVICE_ACCOUNT_BYTES = 64 * 1024;

export function parseFirebaseServiceAccountBase64(value: string): FirebaseServiceAccount {
  const encoded = value.trim();
  if (!encoded || encoded.length > 128 * 1024 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 is not valid base64");
  }
  const decoded = Buffer.from(encoded, "base64");
  if (decoded.length === 0 || decoded.length > MAX_SERVICE_ACCOUNT_BYTES) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 has an invalid size");
  }
  let candidate: unknown;
  try {
    candidate = JSON.parse(decoded.toString("utf8"));
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 does not contain valid JSON");
  }
  if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 must contain an object");
  }
  const input = candidate as Record<string, unknown>;
  const projectId = input.project_id;
  const clientEmail = input.client_email;
  const privateKey = input.private_key;
  if (
    typeof projectId !== "string" || !/^[a-z0-9][a-z0-9-]{4,62}$/.test(projectId)
    || typeof clientEmail !== "string" || !clientEmail.endsWith(".gserviceaccount.com")
    || typeof privateKey !== "string"
    || !privateKey.includes("-----BEGIN PRIVATE KEY-----")
    || !privateKey.includes("-----END PRIVATE KEY-----")
  ) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 is missing required service-account fields");
  }
  return { projectId, clientEmail, privateKey };
}
