import { closeSync, constants, fsyncSync, openSync, realpathSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = realpathSync(fileURLToPath(new URL("..", import.meta.url)));

export function prepareWebhookSecretFile(destination) {
  if (!destination || !isAbsolute(destination)) {
    throw new Error("COMMERCE_WEBHOOK_SECRET_FILE must be an absolute path outside the repository in a private directory");
  }
  const resolvedDestination = resolve(realpathSync(dirname(destination)), destination.split("/").at(-1));
  const repositoryRelative = relative(repositoryRoot, resolvedDestination);
  if (!repositoryRelative.startsWith("../") && !isAbsolute(repositoryRelative)) {
    throw new Error("Webhook secret destination must be outside the repository");
  }
  // Exclusive creation also rejects existing files and symlinks. Opening now proves
  // the destination is writable before an endpoint can create a one-time secret.
  const descriptor = openSync(destination, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600);
  let closed = false;
  let written = false;
  return {
    write(secret) {
      if (closed || written) throw new Error("Webhook secret destination is already used");
      if (typeof secret !== "string" || !/^whsec_[A-Za-z0-9]+$/.test(secret)) throw new Error("Stripe did not return a signing secret");
      written = true;
      writeFileSync(descriptor, `${secret}\n`, { encoding: "utf8" });
      fsyncSync(descriptor);
    },
    close() {
      if (closed) return;
      closed = true;
      closeSync(descriptor);
      // A failed or no-op bootstrap must not leave an empty misleading secret file.
      if (!written) unlinkSync(destination);
    },
  };
}
