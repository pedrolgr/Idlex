import { encodeMessage, decodeMessages } from "./game-codec.mjs";

export class GameSocket {
  constructor({ url, ticket, clientVersion = "0.3.0+e0", WebSocketImpl = WebSocket, headers = {} } = {}) {
    this.url = url;
    this.ticket = ticket;
    this.clientVersion = clientVersion;
    this.WebSocketImpl = WebSocketImpl;
    this.headers = headers;
    this.socket = null;
    this.timer = null;
    this.listeners = new Set();
    this.closeListeners = new Set();
    this.errorListeners = new Set();
  }

  onMessage(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  onClose(listener) { this.closeListeners.add(listener); return () => this.closeListeners.delete(listener); }
  onError(listener) { this.errorListeners.add(listener); return () => this.errorListeners.delete(listener); }

  async connect(timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const socket = Object.keys(this.headers).length
        ? new this.WebSocketImpl(this.url, { headers: this.headers })
        : new this.WebSocketImpl(this.url);
      socket.binaryType = "arraybuffer";
      this.socket = socket;
      const timer = setTimeout(() => { socket.close(); reject(new Error("WebSocket connection timeout")); }, timeoutMs);
      socket.addEventListener("open", () => {
        clearTimeout(timer);
        this.send({ type: "authenticate", clientVersion: this.clientVersion, ticket: this.ticket });
        this.timer = setInterval(() => {
          if (this.isOpen()) {
            this.send({ type: "ping", t: performance.now() });
          } else {
            this.close();
          }
        }, 5000);
        resolve();
      }, { once: true });
      socket.addEventListener("message", event => {
        for (const message of decodeMessages(event.data)) for (const listener of this.listeners) listener(message);
      });
      socket.addEventListener("error", (err) => {
        for (const listener of this.errorListeners) {
          try { listener(err); } catch {}
        }
        if (this.socket === socket) reject(new Error("WebSocket error"));
      }, { once: true });
      socket.addEventListener("close", event => {
        if (this.timer) {
          clearInterval(this.timer);
          this.timer = null;
        }
        for (const listener of this.closeListeners) {
          try { listener(event); } catch {}
        }
        if (this.socket === socket && socket.readyState !== this.WebSocketImpl.OPEN) {
          clearTimeout(timer);
          reject(new Error(`WebSocket closed before open (code ${event.code})`));
        }
      });
    });
  }

  send(message) {
    if (!this.isOpen()) return false;
    try {
      this.socket.send(encodeMessage(message));
      return true;
    } catch (_) {
      return false;
    }
  }

  isOpen() {
    return this.socket !== null && this.socket.readyState === this.WebSocketImpl.OPEN;
  }

  logout() {
    if (this.isOpen()) {
      this.send({ type: "logout" });
    }
  }

  close() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.socket?.close();
    this.socket = null;
  }
}
