interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

declare const WebSocketPair: {
  new (): { 0: WebSocket; 1: WebSocket };
};

interface ResponseInit {
  webSocket?: WebSocket;
}

interface WebSocket {
  serializeAttachment(value: unknown): void;
  deserializeAttachment(): unknown;
}
