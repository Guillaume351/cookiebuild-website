import { afterEach, describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prepareWebhookSecretFile } from "../scripts/webhook-secret-file.mjs";

const directories: string[] = [];
function destination() {
  const directory = mkdtempSync(join(tmpdir(), "cookiebuild-webhook-test-"));
  directories.push(directory);
  return join(directory, "secret");
}
afterEach(() => { for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true }); });
describe("private webhook secret destination", () => {
  it("fails before provisioning when there is no usable destination", () => {
    expect(() => prepareWebhookSecretFile(undefined)).toThrow("absolute path");
    expect(() => prepareWebhookSecretFile("relative-secret")).toThrow("absolute path");
    expect(() => prepareWebhookSecretFile(join(process.cwd(), "must-not-create-secret"))).toThrow("outside the repository");
  });
  it("saves the returned secret privately and never overwrites an earlier run", () => {
    const path = destination();
    const sink = prepareWebhookSecretFile(path);
    expect(statSync(path).mode & 0o777).toBe(0o600);
    sink.write("whsec_testOnly123");
    sink.close();
    expect(readFileSync(path, "utf8")).toBe("whsec_testOnly123\n");
    expect(() => prepareWebhookSecretFile(path)).toThrow();
    expect(() => sink.write("whsec_new")).toThrow("already used");
  });
  it("rejects symlinks without modifying the target", () => {
    const path = destination();
    const target = `${path}-existing`;
    writeFileSync(target, "preserved");
    symlinkSync(target, path);
    expect(() => prepareWebhookSecretFile(path)).toThrow();
    expect(readFileSync(target, "utf8")).toBe("preserved");
  });
  it("removes unused placeholders after no-op or invalid-secret failure", () => {
    const path = destination();
    const sink = prepareWebhookSecretFile(path);
    expect(() => sink.write(undefined)).toThrow("signing secret");
    sink.close();
    sink.close();
    expect(existsSync(path)).toBe(false);
  });
});
