import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  createSessionToken,
  verifySessionToken,
  SessionUser,
} from "../lib/auth";

describe("Authentication & Session Security", () => {
  const sampleUser: SessionUser = {
    id: "usr_test_123",
    name: "Test Admin",
    email: "admin@example.com",
    role: "ADMIN",
  };

  test("generates and verifies a valid session token", () => {
    const token = createSessionToken(sampleUser);
    assert.ok(token, "Token should be non-empty");
    assert.ok(token.includes("."), "Token should consist of payload and signature");

    const decoded = verifySessionToken(token);
    assert.ok(decoded, "Decoded user should not be null");
    assert.equal(decoded.id, sampleUser.id);
    assert.equal(decoded.email, sampleUser.email);
    assert.equal(decoded.role, sampleUser.role);
  });

  test("rejects tampered tokens", () => {
    const token = createSessionToken(sampleUser);
    const [payloadStr, sig] = token.split(".");

    // Tamper payload
    const tamperedPayload = Buffer.from(
      JSON.stringify({ ...sampleUser, role: "SUPER_ADMIN" })
    ).toString("base64url");
    const tamperedToken = `${tamperedPayload}.${sig}`;

    assert.equal(
      verifySessionToken(tamperedToken),
      null,
      "Tampered payload must fail signature check"
    );
  });

  test("rejects malformed or empty tokens gracefully without crashing", () => {
    assert.equal(verifySessionToken(""), null);
    assert.equal(verifySessionToken("invalid-token-no-dot"), null);
    assert.equal(verifySessionToken("abc.def"), null);
    assert.equal(verifySessionToken("abc.def.ghi"), null);
  });

  test("rejects expired tokens", () => {
    // Manually create expired token
    const expiredPayload = {
      ...sampleUser,
      exp: Date.now() - 10000, // 10s in past
    };
    const payloadStr = Buffer.from(JSON.stringify(expiredPayload)).toString("base64url");
    
    // We can test by importing crypto
    const crypto = require("crypto");
    const secret = process.env.AUTH_SECRET || "nfc-studio-fallback-secret-at-least-32-chars-long";
    const sig = crypto.createHmac("sha256", secret).update(payloadStr).digest("base64url");
    const expiredToken = `${payloadStr}.${sig}`;

    assert.equal(
      verifySessionToken(expiredToken),
      null,
      "Expired token must be rejected"
    );
  });
});
