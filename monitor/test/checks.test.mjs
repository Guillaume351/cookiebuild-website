import assert from "node:assert/strict";
import dgram from "node:dgram";
import http from "node:http";
import net from "node:net";
import test from "node:test";

import { checkBedrock, checkDatabaseApi, checkJava, checkWebsite, internals } from "../src/checks.mjs";

function packet(data) {
  return Buffer.concat([internals.encodeVarInt(data.length), data]);
}

test("checks Java server-list status over the real protocol", async (context) => {
  const server = net.createServer((socket) => {
    socket.once("data", () => {
      const json = Buffer.from(JSON.stringify({ version: { name: "Paper test" }, players: { online: 2, max: 100 } }));
      socket.end(packet(Buffer.concat([Buffer.from([0]), internals.encodeVarInt(json.length), json])));
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => server.close());
  const status = await checkJava({ host: "127.0.0.1", port: server.address().port });
  assert.equal(status.players, 2);
  assert.equal(status.version, "Paper test");
});

test("checks Bedrock RakNet status over UDP", async (context) => {
  const server = dgram.createSocket("udp4");
  await new Promise((resolve) => server.bind(0, "127.0.0.1", resolve));
  context.after(() => server.close());
  server.once("message", (message, remote) => {
    const advertisement = Buffer.from("MCPE;Test;775;1.21;3;100", "utf8");
    const reply = Buffer.alloc(35 + advertisement.length);
    reply[0] = 0x1c;
    message.copy(reply, 1, 1, 9);
    internals.RAKNET_MAGIC.copy(reply, 17);
    reply.writeUInt16BE(advertisement.length, 33);
    advertisement.copy(reply, 35);
    server.send(reply, remote.port, remote.address);
  });
  const status = await checkBedrock({ host: "127.0.0.1", port: server.address().port });
  assert.equal(status.players, 3);
  assert.equal(status.maximumPlayers, 100);
});

test("website and database API checks validate useful content", async (context) => {
  const server = http.createServer((request, response) => {
    response.setHeader("content-type", request.url.startsWith("/api/") ? "application/json" : "text/html");
    response.end(request.url.startsWith("/api/")
      ? JSON.stringify({ ok: true, database: true, latencyMs: 4 })
      : "<html><title>Cookie Build</title></html>");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => server.close());
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await checkWebsite({ baseUrl })).ok, true);
  assert.equal((await checkDatabaseApi({ baseUrl })).databaseLatencyMs, 4);
});

for (const online of [undefined, null, false, "", "0", -1, 0.5]) {
  test(`rejects invalid Java player count ${JSON.stringify(online)}`, async (context) => {
    const server = net.createServer((socket) => {
      socket.once("data", () => {
        const json = Buffer.from(JSON.stringify({ players: { online, max: 100 } }));
        socket.end(packet(Buffer.concat([Buffer.from([0]), internals.encodeVarInt(json.length), json])));
      });
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    context.after(() => server.close());
    await assert.rejects(checkJava({ host: "127.0.0.1", port: server.address().port }), /Java player count is missing or invalid/);
  });
}
