import amqp, { type Channel, type ChannelModel, type ConfirmChannel, type ConsumeMessage } from "amqplib";

const DEFAULT_EXCHANGE = "cookiebuild.admin";
const MAX_EVENT_BYTES = 512 * 1024;

export type AdminRuntimeEventHandler = (routingKey: string, event: Record<string, unknown>) => Promise<void>;

class AdminRuntimeBus {
  private connection: ChannelModel | null = null;
  private publisher: ConfirmChannel | null = null;
  private consumer: Channel | null = null;
  private handler: AdminRuntimeEventHandler | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectDelay = 1_000;
  private returnedMessageIds = new Set<string>();
  private stopping = false;
  private connecting = false;

  get configured() {
    return Boolean(process.env.NUXT_ADMIN_RABBITMQ_URL?.trim());
  }

  get connected() {
    return Boolean(this.connection && this.publisher && this.consumer);
  }

  start(handler: AdminRuntimeEventHandler) {
    this.handler = handler;
    this.stopping = false;
    if (this.configured) void this.connect();
  }

  private scheduleReconnect() {
    if (this.stopping || this.reconnectTimer) return;
    const delay = this.reconnectDelay;
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30_000);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, delay);
    this.reconnectTimer.unref();
  }

  private async connect() {
    if (this.stopping || this.connecting || this.connected) return;
    const url = process.env.NUXT_ADMIN_RABBITMQ_URL?.trim();
    if (!url) return;
    this.connecting = true;
    try {
      const exchange = process.env.NUXT_ADMIN_RABBITMQ_EXCHANGE?.trim() || DEFAULT_EXCHANGE;
      const queue = process.env.NUXT_ADMIN_RABBITMQ_EVENT_QUEUE?.trim()
        || "cookiebuild.admin.website.events";
      const connection = await amqp.connect(url, {
        clientProperties: { connection_name: "cookiebuild-admin-website" },
        heartbeat: 30,
      });
      this.connection = connection;
      connection.on("error", () => this.disconnectAndRetry());
      connection.on("close", () => this.disconnectAndRetry());
      const [publisher, consumer] = await Promise.all([
        connection.createConfirmChannel(),
        connection.createChannel(),
      ]);
      await publisher.assertExchange(exchange, "topic", { durable: true });
      publisher.on("return", (message) => {
        if (message.properties.messageId) this.returnedMessageIds.add(message.properties.messageId);
      });
      await consumer.assertExchange(exchange, "topic", { durable: true });
      await consumer.assertQueue(queue, {
        durable: true,
        arguments: { "x-message-ttl": 7 * 24 * 60 * 60 * 1_000 },
      });
      await consumer.bindQueue(queue, exchange, "events.#");
      await consumer.prefetch(20);
      this.publisher = publisher;
      this.consumer = consumer;
      await consumer.consume(queue, (message) => void this.consume(message), { noAck: false });
      this.reconnectDelay = 1_000;
    } catch {
      this.disconnectAndRetry();
    } finally {
      this.connecting = false;
    }
  }

  private async consume(message: ConsumeMessage | null) {
    if (!message || !this.consumer) return;
    try {
      if (message.content.byteLength > MAX_EVENT_BYTES) throw new Error("Runtime event is too large");
      const parsed = JSON.parse(message.content.toString("utf8")) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Runtime event must be an object");
      }
      if (!this.handler) throw new Error("Runtime event handler is unavailable");
      await this.handler(message.fields.routingKey, parsed as Record<string, unknown>);
      this.consumer?.ack(message);
    } catch (error) {
      const invalid = error instanceof SyntaxError
        || (error instanceof Error && /^(Invalid runtime event|Runtime event must|Runtime event is too large)/.test(error.message));
      // Malformed events are dropped (or dead-lettered by a broker policy). Transient
      // persistence failures are requeued so a short PostgreSQL outage loses no event.
      this.consumer?.nack(message, false, !invalid);
    }
  }

  async publish(serverId: string, envelope: Record<string, unknown>, ttlMs: number) {
    if (!/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(serverId)) throw new Error("Invalid runtime server ID");
    if (!this.publisher) throw new Error("Admin runtime bridge is disconnected");
    const exchange = process.env.NUXT_ADMIN_RABBITMQ_EXCHANGE?.trim() || DEFAULT_EXCHANGE;
    const body = Buffer.from(JSON.stringify(envelope), "utf8");
    if (body.byteLength > MAX_EVENT_BYTES) throw new Error("Admin command is too large");
    const messageId = String(envelope.id ?? "");
    this.returnedMessageIds.delete(messageId);
    this.publisher.publish(exchange, `commands.${serverId}`, body, {
      persistent: true,
      mandatory: true,
      contentType: "application/json",
      expiration: String(ttlMs),
      timestamp: Date.now(),
      messageId,
    });
    await this.publisher.waitForConfirms();
    if (this.returnedMessageIds.delete(messageId)) {
      throw new Error("No AdminBridge queue accepted the command");
    }
  }

  private disconnectAndRetry() {
    const connection = this.connection;
    this.connection = null;
    this.publisher = null;
    this.consumer = null;
    if (connection) void connection.close().catch(() => undefined);
    this.scheduleReconnect();
  }

  async stop() {
    this.stopping = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    const connection = this.connection;
    this.connection = null;
    this.publisher = null;
    this.consumer = null;
    if (connection) await connection.close().catch(() => undefined);
  }
}

const globalBus = globalThis as typeof globalThis & { __cookieBuildAdminRuntimeBus?: AdminRuntimeBus };

export function adminRuntimeBus() {
  globalBus.__cookieBuildAdminRuntimeBus ??= new AdminRuntimeBus();
  return globalBus.__cookieBuildAdminRuntimeBus;
}
