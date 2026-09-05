import { createError } from "h3";

export const MAX_COMMERCE_WEBHOOK_BYTES = 1_048_576;

export async function readCommerceWebhookBody(request: AsyncIterable<Uint8Array>, contentLength?: string) {
  if (contentLength !== undefined && (!/^[0-9]+$/.test(contentLength)
    || Number(contentLength) > MAX_COMMERCE_WEBHOOK_BYTES)) {
    throw createError({ statusCode: 413, statusMessage: "Invalid Stripe webhook body size" });
  }
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.byteLength;
    if (size > MAX_COMMERCE_WEBHOOK_BYTES) {
      throw createError({ statusCode: 413, statusMessage: "Stripe webhook body is too large" });
    }
    chunks.push(chunk);
  }
  if (!size) throw createError({ statusCode: 400, statusMessage: "Empty Stripe webhook body" });
  return Buffer.concat(chunks, size);
}
