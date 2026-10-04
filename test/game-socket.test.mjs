import test from "node:test";
import assert from "node:assert/strict";
import { GameSocket } from "../src/game-socket.mjs";

class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;

  constructor(url) {
    this.url = url;
    this.readyState = MockWebSocket.OPEN;
    this.handlers = {};
  }

  addEventListener(event, handler) {
    if (!this.handlers[event]) this.handlers[event] = [];
    this.handlers[event].push(handler);
  }

  send() {}

  close(code = 1000) {
    this.readyState = MockWebSocket.CLOSED;
    const closeHandlers = this.handlers["close"] || [];
    for (const h of closeHandlers) h({ code });
  }

  simulateError(err) {
    const errorHandlers = this.handlers["error"] || [];
    for (const h of errorHandlers) h(err);
  }
}

test("GameSocket triggers onClose listeners when connection drops or is closed", async () => {
  const socket = new GameSocket({
    url: "wss://fake.example.com",
    ticket: "test-ticket",
    WebSocketImpl: MockWebSocket,
  });

  let closed = false;
  let closedCode = null;

  socket.onClose((event) => {
    closed = true;
    closedCode = event.code;
  });

  // Conectar com open simulado
  const connectPromise = socket.connect();
  const wsInstance = socket.socket;
  
  // Dispara o handler de open para resolver o connect
  for (const h of wsInstance.handlers["open"] || []) h();
  await connectPromise;

  assert.equal(closed, false);
  
  // Simula servidor fechando a conexão (ex: 1006 / outro cliente conectou)
  wsInstance.close(1006);

  assert.equal(closed, true);
  assert.equal(closedCode, 1006);
  socket.close();
});

test("GameSocket triggers onError listeners on socket error", async () => {
  const socket = new GameSocket({
    url: "wss://fake.example.com",
    ticket: "test-ticket",
    WebSocketImpl: MockWebSocket,
  });

  let errored = false;

  socket.onError(() => {
    errored = true;
  });

  const connectPromise = socket.connect();
  const wsInstance = socket.socket;
  for (const h of wsInstance.handlers["open"] || []) h();
  await connectPromise;

  assert.equal(errored, false);

  wsInstance.simulateError(new Error("Connection reset"));

  assert.equal(errored, true);
  socket.close();
});
