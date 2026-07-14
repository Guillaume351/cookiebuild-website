import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import { createError, type H3Event } from "h3";
import { parseFirebaseServiceAccountBase64 } from "./firebase-credentials";

export interface MobileAuthClaims {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
  token: DecodedIdToken;
}

type MobileContext = H3Event["context"] & { mobileAuth?: MobileAuthClaims };

const UNAUTHORIZED_FIREBASE_CODES = new Set([
  "auth/argument-error",
  "auth/id-token-expired",
  "auth/id-token-revoked",
  "auth/invalid-argument",
  "auth/invalid-id-token",
  "auth/user-disabled",
  "auth/user-not-found",
]);

export function mobileAuthFailure(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error
    ? String(error.code).slice(0, 120)
    : undefined;
  if (code && UNAUTHORIZED_FIREBASE_CODES.has(code)) {
    return {
      statusCode: 401 as const,
      statusMessage: "Invalid or expired token",
      logLevel: "warn" as const,
      reason: code,
    };
  }
  return {
    statusCode: 503 as const,
    statusMessage: "Authentication service unavailable",
    logLevel: "error" as const,
    reason: code ?? (error instanceof Error ? error.name : "unknown"),
  };
}

export function firebaseApp() {
  const existing = getApps()[0];
  if (existing) return existing;

  const encodedServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64;
  const serviceAccount = encodedServiceAccount
    ? parseFirebaseServiceAccountBase64(encodedServiceAccount)
    : undefined;
  const projectId = process.env.NUXT_FIREBASE_PROJECT_ID
    || process.env.GCLOUD_PROJECT
    || serviceAccount?.projectId;
  return initializeApp({
    credential: serviceAccount ? cert(serviceAccount) : applicationDefault(),
    ...(projectId ? { projectId } : {}),
  });
}

export function firebaseAuth() {
  return getAuth(firebaseApp());
}

export async function verifyMobileIdToken(idToken: string): Promise<MobileAuthClaims> {
  const token = await firebaseAuth().verifyIdToken(idToken, true);
  return {
    uid: token.uid,
    email: typeof token.email === "string" ? token.email : undefined,
    name: typeof token.name === "string" ? token.name : undefined,
    picture: typeof token.picture === "string" ? token.picture : undefined,
    token,
  };
}

export function setMobileAuth(event: H3Event, auth: MobileAuthClaims) {
  (event.context as MobileContext).mobileAuth = auth;
}

export function requireMobileAuth(event: H3Event) {
  const auth = (event.context as MobileContext).mobileAuth;
  if (!auth) {
    throw createError({ statusCode: 401, statusMessage: "Authentication required" });
  }
  return auth;
}
