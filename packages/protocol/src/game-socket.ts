import WebSocket from "ws";
import { encodeMessage, decodeMessages } from "./game-codec.js";
import type { IncomingMessage, OutgoingMessage } from "./messages.js";

export type MessageListener = (message: IncomingMessage) => void;
export type CloseListener = (event: { code?: number; reason?: string }) => void;
export type ErrorListener = (error: unknown) => void;

export interface GameSocketOptions {
  url: string;
  ticket: string;
  clientVersion?: string;
  WebSocketImpl?: any;
  headers?: Record<string, string>;
}

export class GameSocket {
  public readonly url: string;
  public readonly ticket: string;
  public readonly clientVersion: string;
  public readonly WebSocketImpl: any;
  public readonly headers: Record<string, string>;

  private socket: any = null;
  private timer: NodeJS.Timeout | null = null;
  private readonly listeners = new Set<MessageListener>();
  private readonly closeListeners = new Set<CloseListener>();
  private readonly errorListeners = new Set<ErrorListener>();

  constructor({
    url,
    ticket,
    clientVersion = "0.3.0+e0",
    WebSocketImpl = WebSocket,
    headers = {},
  }: GameSocketOptions) {
    this.url = url;
    this.ticket = ticket;
    this.clientVersion = clientVersion;
    this.WebSocketImpl = WebSocketImpl;
    this.headers = headers;
  }

  onMessage(listener: MessageListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onClose(listener: CloseListener): () => void {
    this.closeListeners.add(listener);
    return () => this.closeListeners.delete(listener);
  }

  onError(listener: ErrorListener): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  async connect(timeoutMs = 15000): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const socket = Object.keys(this.headers).length
        ? new this.WebSocketImpl(this.url, { headers: this.headers })
        : new this.WebSocketImpl(this.url);

      socket.binaryType = "arraybuffer";
      this.socket = socket;

      const timer = setTimeout(() => {
        try {
          socket.close();
        } catch {}
        reject(new Error("WebSocket connection timeout"));
      }, timeoutMs);

      socket.addEventListener(
        "open",
        () => {
          clearTimeout(timer);
          this.send({
            type: "authenticate",
            clientVersion: this.clientVersion,
            ticket: this.ticket,
          });
          this.timer = setInterval(() => {
            if (this.isOpen()) {
              this.send({ type: "ping", t: performance.now() });
            } else {
              this.close();
            }
          }, 5000);
          resolve();
        },
        { once: true },
      );

      socket.addEventListener("message", (event: { data: ArrayBuffer | Uint8Array }) => {
        for (const message of decodeMessages(event.data)) {
          for (const listener of this.listeners) {
            try {
              listener(message);
            } catch (err) {
              console.error("[GameSocket] Error in message listener:", err);
            }
          }
        }
      });

      socket.addEventListener(
        "error",
        (err: unknown) => {
          for (const listener of this.errorListeners) {
            try {
              listener(err);
            } catch {}
          }
          if (this.socket === socket) {
            reject(new Error("WebSocket error"));
          }
        },
        { once: true },
      );

      socket.addEventListener("close", (event: { code?: number; reason?: string }) => {
        if (this.timer) {
          clearInterval(this.timer);
          this.timer = null;
        }
        for (const listener of this.closeListeners) {
          try {
            listener(event);
          } catch {}
        }
        if (this.socket === socket && socket.readyState !== this.WebSocketImpl.OPEN) {
          clearTimeout(timer);
          reject(new Error(`WebSocket closed before open (code ${event.code})`));
        }
      });
    });
  }

  send(message: OutgoingMessage): boolean {
    if (!this.isOpen()) return false;
    try {
      this.socket.send(encodeMessage(message));
      return true;
    } catch (_) {
      return false;
    }
  }

  isOpen(): boolean {
    return this.socket !== null && this.socket.readyState === this.WebSocketImpl.OPEN;
  }

  logout(): void {
    if (this.isOpen()) {
      this.send({ type: "logout" });
    }
  }

  close(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    try {
      this.socket?.close();
    } catch {}
    this.socket = null;
  }
}
