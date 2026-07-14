import { describe, expect, it } from "vitest";
import { parseFirebaseServiceAccountBase64 } from "../server/utils/firebase-credentials";

const validAccount = {
  project_id: "cookie-build",
  client_email: "mobile@cookie-build.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----\nnot-a-real-key\n-----END PRIVATE KEY-----\n",
};

describe("Firebase service-account environment parsing", () => {
  it("accepts the expected base64 JSON shape without exposing extra fields", () => {
    const encoded = Buffer.from(JSON.stringify(validAccount)).toString("base64");
    expect(parseFirebaseServiceAccountBase64(encoded)).toEqual({
      projectId: validAccount.project_id,
      clientEmail: validAccount.client_email,
      privateKey: validAccount.private_key,
    });
  });

  it("rejects malformed or incomplete credentials", () => {
    expect(() => parseFirebaseServiceAccountBase64("not base64"))
      .toThrow("not valid base64");
    expect(() => parseFirebaseServiceAccountBase64(
      Buffer.from(JSON.stringify({ project_id: "cookie-build" })).toString("base64"),
    )).toThrow("missing required service-account fields");
  });
});
