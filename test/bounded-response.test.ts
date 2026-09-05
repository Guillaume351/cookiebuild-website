import { describe, expect, it, vi } from "vitest";
import { boundedResponseText } from "../server/utils/bounded-response";

const sizeLimitMessage = "Response exceeded the size limit";

describe("bounded response reads", () => {
  it("decodes UTF-8 characters split across chunks at the exact byte limit", async () => {
    const bytes = new TextEncoder().encode("café 🍪");
    const response = new Response(new ReadableStream({
      start(controller) {
        for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
        controller.close();
      },
    }));
    await expect(boundedResponseText(response, bytes.length, sizeLimitMessage)).resolves.toBe("café 🍪");
  });

  it.each([undefined, "1"])("stops a growing body with content-length %s before buffering it all", async (length) => {
    const cancel = vi.fn();
    let reads = 0;
    const response = new Response(new ReadableStream({
      pull(controller) {
        reads += 1;
        controller.enqueue(new Uint8Array(4));
      },
      cancel,
    }, { highWaterMark: 0 }), {
      headers: length ? { "content-length": length } : undefined,
    });
    await expect(boundedResponseText(response, 5, sizeLimitMessage)).rejects.toThrow(sizeLimitMessage);
    expect(reads).toBe(2);
    expect(cancel).toHaveBeenCalledOnce();
    expect(response.body?.locked).toBe(false);
  });

  it("cancels a declared oversized body before reading it", async () => {
    const pull = vi.fn();
    const cancel = vi.fn();
    const response = new Response(new ReadableStream({ pull, cancel }, { highWaterMark: 0 }), {
      headers: { "content-length": "100" },
    });
    await expect(boundedResponseText(response, 5, sizeLimitMessage)).rejects.toThrow(sizeLimitMessage);
    expect(pull).not.toHaveBeenCalled();
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("handles responses without a body", async () => {
    await expect(boundedResponseText(new Response(null), 5, sizeLimitMessage)).resolves.toBe("");
  });

  it("propagates a stream failure and releases the reader", async () => {
    const response = new Response(new ReadableStream({
      start(controller) { controller.error(new Error("connection reset")); },
    }));
    await expect(boundedResponseText(response, 5, sizeLimitMessage)).rejects.toThrow("connection reset");
    expect(response.body?.locked).toBe(false);
  });
});
