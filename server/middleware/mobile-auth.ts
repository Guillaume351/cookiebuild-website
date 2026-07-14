import { bearerToken } from "../utils/mobile-validation";
import {
  mobileAuthFailure,
  setMobileAuth,
  verifyMobileIdToken,
} from "../utils/mobile-auth";

export default defineEventHandler(async (event) => {
  if (!getRequestURL(event).pathname.startsWith("/api/mobile/v1/")) return;

  const token = bearerToken(getHeader(event, "authorization"));
  if (!token) return;

  try {
    setMobileAuth(event, await verifyMobileIdToken(token));
  } catch (error) {
    const failure = mobileAuthFailure(error);
    console[failure.logLevel](
      failure.statusCode === 401
        ? "Rejected an invalid mobile Firebase token"
        : "Mobile Firebase authentication is unavailable",
      { reason: failure.reason },
    );
    throw createError({
      statusCode: failure.statusCode,
      statusMessage: failure.statusMessage,
    });
  }
});
