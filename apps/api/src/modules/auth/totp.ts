import crypto from "node:crypto";
import { generateSecret, generateURI, verifySync } from "otplib";
import qrcode from "qrcode";

export interface TotpSetupResult {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
}

export async function generateTotpSetup(
  userEmail: string,
  serviceName = "Idlex",
): Promise<TotpSetupResult> {
  const secret = generateSecret();
  const otpauthUrl = generateURI({
    secret,
    label: userEmail,
    issuer: serviceName,
  });
  const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);

  return {
    secret,
    otpauthUrl,
    qrCodeDataUrl,
  };
}

export function verifyTotpToken(token: string, secret: string): boolean {
  try {
    const res = verifySync({
      token,
      secret,
    });
    return res.valid;
  } catch {
    return false;
  }
}

/**
 * Encrypt / Decrypt TOTP secret in DB using AES-256-GCM
 */
export function encryptTotpSecret(secret: string, keyHex: string): string {
  const iv = crypto.randomBytes(12);
  const key = Buffer.from(keyHex.slice(0, 64), "hex");
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptTotpSecret(encryptedString: string, keyHex: string): string | null {
  try {
    const [ivHex, tagHex, dataHex] = encryptedString.split(":");
    if (!ivHex || !tagHex || !dataHex) return null;

    const key = Buffer.from(keyHex.slice(0, 64), "hex");
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(ivHex, "hex"),
    );
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataHex, "hex")),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}
