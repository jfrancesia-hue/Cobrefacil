import assert from "node:assert/strict";
import test from "node:test";
import {
  checkRateLimit,
  clearRateLimitBuckets,
  getClientIp,
} from "../src/lib/rate-limit";

test("checkRateLimit allows requests inside the window and blocks after limit", () => {
  clearRateLimitBuckets();

  const first = checkRateLimit("login:1.2.3.4", 2, 60_000, 1_000);
  const second = checkRateLimit("login:1.2.3.4", 2, 60_000, 2_000);
  const third = checkRateLimit("login:1.2.3.4", 2, 60_000, 3_000);

  assert.equal(first.allowed, true);
  assert.equal(first.remaining, 1);
  assert.equal(second.allowed, true);
  assert.equal(second.remaining, 0);
  assert.equal(third.allowed, false);
  assert.equal(third.retryAfter, 58);
});

test("checkRateLimit starts a new bucket after the window expires", () => {
  clearRateLimitBuckets();

  checkRateLimit("api:1.2.3.4", 1, 1_000, 1_000);
  const blocked = checkRateLimit("api:1.2.3.4", 1, 1_000, 1_500);
  const reset = checkRateLimit("api:1.2.3.4", 1, 1_000, 2_001);

  assert.equal(blocked.allowed, false);
  assert.equal(reset.allowed, true);
  assert.equal(reset.remaining, 0);
});

test("getClientIp prefers trusted proxy headers in order", () => {
  const req = new Request("https://app.test", {
    headers: {
      "x-forwarded-for": "10.0.0.1, 10.0.0.2",
      "x-real-ip": "192.168.1.10",
      "cf-connecting-ip": "203.0.113.5",
    },
  });

  assert.equal(getClientIp(req), "203.0.113.5");
});
