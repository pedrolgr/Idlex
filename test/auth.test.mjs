import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword, dummyVerifyPassword, generateSessionToken, hashToken } from "../apps/api/dist/modules/auth/crypto.js";
import { generateTotpSetup, verifyTotpToken, encryptTotpSecret, decryptTotpSecret } from "../apps/api/dist/modules/auth/totp.js";
import { createServerApp } from "../apps/api/dist/server.js";

test("Auth Crypto: Argon2id hashing and verification", async () => {
  const plain = "SuperSecretP@ssw0rd123";
  const hash = await hashPassword(plain);

  assert.ok(hash.startsWith("$argon2id$"));
  const isValid = await verifyPassword(hash, plain);
  assert.equal(isValid, true);

  const isInvalid = await verifyPassword(hash, "wrong-password");
  assert.equal(isInvalid, false);

  const dummy = await dummyVerifyPassword("any-password");
  assert.equal(dummy, false);
});

test("Auth Crypto: Session token and SHA-256 hash", () => {
  const token = generateSessionToken();
  assert.ok(token.length >= 32);
  const hash = hashToken(token);
  assert.equal(hash.length, 64);
});

test("Auth TOTP: 2FA generation, verification, and AES encryption", async () => {
  const setup = await generateTotpSetup("test@idlex.gg");
  assert.ok(setup.secret);
  assert.ok(setup.otpauthUrl.includes("test%40idlex.gg") || setup.otpauthUrl.includes("test@idlex.gg"));
  assert.ok(setup.qrCodeDataUrl.startsWith("data:image/png;base64,"));

  const invalidToken = verifyTotpToken("000000", setup.secret);
  assert.equal(typeof invalidToken, "boolean");

  const secretKey = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const encrypted = encryptTotpSecret(setup.secret, secretKey);
  assert.ok(encrypted.includes(":"));

  const decrypted = decryptTotpSecret(encrypted, secretKey);
  assert.equal(decrypted, setup.secret);
});

test("Auth Routes: endpoints validation & CSRF checks", async () => {
  const { app, shutdown } = await createServerApp();

  try {
    // Register validation: password too short (< 10)
    const shortPwRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "short@idlex.gg",
        password: "123",
      },
    });
    assert.equal(shortPwRes.statusCode, 400);

    // CSRF protection: bad origin rejected on mutating requests
    const csrfRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      headers: {
        origin: "https://malicious-website.com",
      },
      payload: {
        email: "csrf@idlex.gg",
        password: "Password123456!",
      },
    });
    assert.equal(csrfRes.statusCode, 403);
    assert.equal(csrfRes.json().code, "CSRF_ORIGIN_MISMATCH");

    // /me without auth returns 401
    const meRes = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
    });
    assert.equal(meRes.statusCode, 401);
  } finally {
    await shutdown();
  }
});
