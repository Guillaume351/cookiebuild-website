import net from "node:net";
import dgram from "node:dgram";
import { randomBytes } from "node:crypto";

const RAKNET_MAGIC = Buffer.from("00ffff00fefefefefdfdfdfd12345678", "hex");

function encodeVarInt(value) {
  const output = [];
  let remaining = value >>> 0;
  do {
    let byte = remaining & 0x7f;
    remaining >>>= 7;
    if (remaining !== 0) byte |= 0x80;
    output.push(byte);
  } while (remaining !== 0);
  return Buffer.from(output);
}

function decodeVarInt(buffer, offset = 0) {
  let value = 0;
  let position = 0;
  let cursor = offset;
  while (cursor < buffer.length) {
    const current = buffer[cursor++];
    value |= (current & 0x7f) << position;
    if ((current & 0x80) === 0) return { value, bytes: cursor - offset };
    position += 7;
    if (position >= 35) throw new Error("VarInt is too large");
  }
  return null;
}

function javaHandshake(host, port, protocolVersion) {
  const hostBytes = Buffer.from(host, "utf8");
  const portBytes = Buffer.alloc(2);
  portBytes.writeUInt16BE(port);
  const data = Buffer.concat([
    Buffer.from([0x00]),
    encodeVarInt(protocolVersion),
    encodeVarInt(hostBytes.length),
    hostBytes,
    portBytes,
    Buffer.from([0x01]),
  ]);
  return Buffer.concat([encodeVarInt(data.length), data, Buffer.from([0x01, 0x00])]);
}

function parseJavaStatus(buffer) {
  const packetLength = decodeVarInt(buffer);
  if (!packetLength || buffer.length < packetLength.bytes + packetLength.value) return null;
  let cursor = packetLength.bytes;
  const packetId = decodeVarInt(buffer, cursor);
  if (!packetId || packetId.value !== 0) throw new Error("Unexpected Java status packet");
  cursor += packetId.bytes;
  const stringLength = decodeVarInt(buffer, cursor);
  if (!stringLength) return null;
  cursor += stringLength.bytes;
  if (buffer.length < cursor + stringLength.value) return null;
  return JSON.parse(buffer.subarray(cursor, cursor + stringLength.value).toString("utf8"));
}

export async function checkJava({ host, port, timeoutMs = 5_000, protocolVersion = 775 }) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    const chunks = [];
    let settled = false;
    const timer = setTimeout(() => socket.destroy(new Error("Java status timed out")), timeoutMs);

    socket.once("connect", () => socket.write(javaHandshake(host, port, protocolVersion)));
    socket.on("data", (chunk) => {
      chunks.push(chunk);
      try {
        const status = parseJavaStatus(Buffer.concat(chunks));
        if (!status) return;
        if (!Number.isInteger(status.players?.online) || status.players.online < 0) {
          throw new Error("Java player count is missing or invalid");
        }
        settled = true;
        clearTimeout(timer);
        socket.end();
        resolve({
          ok: true,
          latencyMs: Date.now() - started,
          players: status.players.online,
          maximumPlayers: Number(status.players?.max ?? 0),
          version: String(status.version?.name ?? "unknown"),
        });
      } catch (error) {
        socket.destroy(error);
      }
    });
    socket.once("error", (error) => {
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    socket.once("close", () => {
      clearTimeout(timer);
      if (!settled) reject(new Error("Java server closed the status connection"));
    });
  });
}

function bedrockPing() {
  const packet = Buffer.alloc(33);
  packet[0] = 0x01;
  packet.writeBigInt64BE(BigInt(Date.now()), 1);
  RAKNET_MAGIC.copy(packet, 9);
  randomBytes(8).copy(packet, 25);
  return packet;
}

export async function checkBedrock({ host, port, timeoutMs = 5_000 }) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket("udp4");
    const timer = setTimeout(() => {
      socket.close();
      reject(new Error("Bedrock RakNet ping timed out"));
    }, timeoutMs);

    socket.once("error", (error) => {
      clearTimeout(timer);
      socket.close();
      reject(error);
    });
    socket.once("message", (message) => {
      clearTimeout(timer);
      socket.close();
      if (message[0] !== 0x1c || message.length < 35 || !message.subarray(17, 33).equals(RAKNET_MAGIC)) {
        reject(new Error("Invalid Bedrock RakNet pong"));
        return;
      }
      const length = message.readUInt16BE(33);
      const fields = message.subarray(35, 35 + length).toString("utf8").split(";");
      resolve({
        ok: true,
        latencyMs: Date.now() - started,
        version: fields[3] || "unknown",
        players: Number(fields[4] || 0),
        maximumPlayers: Number(fields[5] || 0),
      });
    });
    socket.send(bedrockPing(), port, host, (error) => {
      if (error) {
        clearTimeout(timer);
        socket.close();
        reject(error);
      }
    });
  });
}

async function fetchJson(url, timeoutMs) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "cache-control": "no-cache", "user-agent": "CookieBuild-Monitor/1.0" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return { response, body: await response.json() };
}

export async function checkWebsite({ baseUrl, timeoutMs = 8_000 }) {
  const started = Date.now();
  const url = new URL(baseUrl);
  url.searchParams.set("monitor", String(Date.now()));
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "cache-control": "no-cache", "user-agent": "CookieBuild-Monitor/1.0" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const html = await response.text();
  if (!html.includes("Cookie Build")) throw new Error("Homepage marker is missing");
  return { ok: true, latencyMs: Date.now() - started, status: response.status };
}

export async function checkDatabaseApi({ baseUrl, timeoutMs = 8_000 }) {
  const started = Date.now();
  const url = new URL("/api/health", baseUrl);
  url.searchParams.set("monitor", String(Date.now()));
  const { body } = await fetchJson(url, timeoutMs);
  if (body?.ok !== true || body?.database !== true) {
    throw new Error("Database API returned an unexpected payload");
  }
  return {
    ok: true,
    latencyMs: Date.now() - started,
    databaseLatencyMs: Number(body.latencyMs ?? 0),
  };
}

export const internals = { decodeVarInt, encodeVarInt, parseJavaStatus, javaHandshake, RAKNET_MAGIC };
