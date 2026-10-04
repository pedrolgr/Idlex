import { inflateRawSync } from "node:zlib";
import {
  incomingCodes,
  outgoingCodes,
  type IncomingType,
  type OutgoingType,
} from "./codes.js";
import type { IncomingMessage, OutgoingMessage } from "./messages.js";

const XOR_SEED = 1213550164;
const COMPRESSED = 1;
const BATCHED = 2;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function xorInPlace(bytes: Uint8Array, nonce: number): void {
  let state = (nonce ^ XOR_SEED) >>> 0;
  if (state === 0) state = XOR_SEED;
  const full = bytes.length & -4;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let offset = 0; offset < full; offset += 4) {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state >>>= 0;
    state ^= state << 5;
    state >>>= 0;
    view.setUint32(offset, view.getUint32(offset, true) ^ state, true);
  }
  if (full < bytes.length) {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state >>>= 0;
    state ^= state << 5;
    state >>>= 0;
    for (let offset = full; offset < bytes.length; offset += 1) {
      bytes[offset] = (bytes[offset] ?? 0) ^ ((state >>> ((offset & 3) << 3)) & 255);
    }
  }
}

function frame(payload: Uint8Array, flags = 0): Uint8Array {
  const nonce = (Math.random() * 0x100000000) >>> 0;
  const output = new Uint8Array(5 + payload.length);
  output[0] = nonce & 255;
  output[1] = (nonce >>> 8) & 255;
  output[2] = (nonce >>> 16) & 255;
  output[3] = (nonce >>> 24) & 255;
  output[4] = flags;
  output.set(payload, 5);
  xorInPlace(output.subarray(4), nonce);
  return output;
}

export function encodeMessage(message: OutgoingMessage): Uint8Array {
  const code = outgoingCodes[message.type as OutgoingType];
  if (!code) {
    throw new Error(`Unsupported outgoing message type: ${message.type}`);
  }
  const { type: _type, ...body } = message;
  const payload = textEncoder.encode(JSON.stringify([code, body]));
  return frame(payload);
}

function decodeOne(input: Uint8Array | ArrayBuffer): IncomingMessage | null {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.length < 5) return null;
  const b0 = bytes[0] ?? 0;
  const b1 = bytes[1] ?? 0;
  const b2 = bytes[2] ?? 0;
  const b3 = bytes[3] ?? 0;
  const nonce = (b0 | (b1 << 8) | (b2 << 16) | (b3 << 24)) >>> 0;
  const decrypted = new Uint8Array(bytes.subarray(4));
  xorInPlace(decrypted, nonce);
  const flags = decrypted[0] ?? 0;
  if ((flags & ~(COMPRESSED | BATCHED)) !== 0) return null;
  let body = decrypted.subarray(1);
  if (flags & COMPRESSED) {
    try {
      body = new Uint8Array(inflateRawSync(body));
    } catch {
      return null;
    }
  }
  try {
    const decoded = JSON.parse(textDecoder.decode(body)) as unknown;
    if (!Array.isArray(decoded) || decoded.length !== 2) return null;
    const [code, data] = decoded as [number, Record<string, unknown>];
    const type = incomingCodes[code as keyof typeof incomingCodes] as IncomingType | undefined;
    if (!type || !data || typeof data !== "object" || Array.isArray(data)) return null;
    return { type, ...data } as IncomingMessage;
  } catch {
    return null;
  }
}

export function decodeMessages(input: Uint8Array | ArrayBuffer): IncomingMessage[] {
  const outer = decodeOne(input);
  if (!outer) {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    if (bytes.length < 5) return [];
    const b0 = bytes[0] ?? 0;
    const b1 = bytes[1] ?? 0;
    const b2 = bytes[2] ?? 0;
    const b3 = bytes[3] ?? 0;
    const nonce = (b0 | (b1 << 8) | (b2 << 16) | (b3 << 24)) >>> 0;
    const decrypted = new Uint8Array(bytes.subarray(4));
    xorInPlace(decrypted, nonce);
    if ((decrypted[0] ?? 0) !== BATCHED) return [];
    const result: IncomingMessage[] = [];
    let offset = 1;
    while (offset + 4 <= decrypted.length) {
      const d0 = decrypted[offset] ?? 0;
      const d1 = decrypted[offset + 1] ?? 0;
      const d2 = decrypted[offset + 2] ?? 0;
      const d3 = decrypted[offset + 3] ?? 0;
      const length = (d0 | (d1 << 8) | (d2 << 16) | (d3 << 24)) >>> 0;
      offset += 4;
      if (offset + length > decrypted.length) return [];
      const decoded = decodeOne(decrypted.subarray(offset, offset + length));
      if (decoded) result.push(decoded);
      offset += length;
    }
    return result;
  }
  return [outer];
}

export function decodeOutgoingForTest(input: Uint8Array | ArrayBuffer): OutgoingMessage | null {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.length < 5) return null;
  const b0 = bytes[0] ?? 0;
  const b1 = bytes[1] ?? 0;
  const b2 = bytes[2] ?? 0;
  const b3 = bytes[3] ?? 0;
  const nonce = (b0 | (b1 << 8) | (b2 << 16) | (b3 << 24)) >>> 0;
  const decrypted = new Uint8Array(bytes.subarray(4));
  xorInPlace(decrypted, nonce);
  const body = JSON.parse(textDecoder.decode(decrypted.subarray(1))) as [number, Record<string, unknown>];
  const name = Object.entries(outgoingCodes).find(([, value]) => value === body[0])?.[0] as OutgoingType | undefined;
  return name ? ({ type: name, ...body[1] } as OutgoingMessage) : null;
}

export const protocol = { incomingCodes, outgoingCodes };
