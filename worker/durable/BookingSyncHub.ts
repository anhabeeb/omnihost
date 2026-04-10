export class BookingSyncHub {
  private readonly state: any;

  constructor(state: any) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.endsWith("/connect")) {
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      const clientId = url.searchParams.get("clientId") ?? crypto.randomUUID();
      const userId = url.searchParams.get("userId") ?? "unknown";

      this.state.acceptWebSocket(server, ["omnihost-live"]);
      server.serializeAttachment({ clientId, userId });
      server.send(
        JSON.stringify({
          type: "welcome",
          serverTime: new Date().toISOString(),
          activeConnections: this.state.getWebSockets("omnihost-live").length
        })
      );

      return new Response(null, {
        status: 101,
        webSocket: client
      });
    }

    if (url.pathname.endsWith("/broadcast")) {
      const payload = (await request.json()) as {
        entity: "booking" | "document" | "email" | "snapshot" | "room";
        reason: string;
        serverTime: string;
      };

      await this.state.storage.put("lastMutationAt", payload.serverTime);

      const message = JSON.stringify({
        type: "broadcast",
        entity: payload.entity === "room" ? "snapshot" : payload.entity,
        reason: payload.reason,
        serverTime: payload.serverTime
      });

      for (const socket of this.state.getWebSockets("omnihost-live")) {
        socket.send(message);
      }

      return Response.json({ ok: true });
    }

    return new Response("Not found", { status: 404 });
  }

  async webSocketMessage(socket: WebSocket, rawMessage: string | ArrayBuffer) {
    const message =
      typeof rawMessage === "string"
        ? JSON.parse(rawMessage)
        : JSON.parse(new TextDecoder().decode(rawMessage));

    if (message.type !== "ping") {
      return;
    }

    const lastMutationAt =
      ((await this.state.storage.get("lastMutationAt")) as string | null) ??
      new Date().toISOString();

    socket.send(
      JSON.stringify({
        type: "pong",
        serverTime: new Date().toISOString(),
        needsSync: !message.lastSyncAt || lastMutationAt > message.lastSyncAt,
        activeConnections: this.state.getWebSockets("omnihost-live").length
      })
    );
  }
}

