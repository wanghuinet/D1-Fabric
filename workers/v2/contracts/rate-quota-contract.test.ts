import {
  evaluateRateQuota,
  validateQuotaPolicy,
  validateRateLimitPolicy,
  type QuotaPolicy,
  type RateLimitPolicy,
  type RateQuotaDemand,
  type RateQuotaUsage,
} from "./rate-quota-contract";

const rateLimit: RateLimitPolicy = { limit: 100, periodSeconds: 60 };
const quota: QuotaPolicy = { maxUnits: 1000, periodSeconds: 60 };
const demand: RateQuotaDemand = { key: "tenant:42:read-list", requestUnits: 25 };
const usage: RateQuotaUsage = { requestsUsed: 20, quotaUnitsUsed: 200 };

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function assertThrows(fn: () => void, message: string): void {
  let threw = false;
  try { fn(); } catch { threw = true; }
  assert(threw, message);
}

validateRateLimitPolicy(rateLimit);
validateQuotaPolicy(quota);
assert(evaluateRateQuota(demand, usage, rateLimit, quota).admitted === true, "valid request admitted");

assert(
  evaluateRateQuota({ ...demand, requestUnits: quota.maxUnits - usage.quotaUnitsUsed }, usage, rateLimit, quota).admitted === true,
  "quota exact remaining capacity admitted",
);
assert(
  evaluateRateQuota({ ...demand, requestUnits: quota.maxUnits - usage.quotaUnitsUsed + 1 }, usage, rateLimit, quota).code === "QUOTA_EXCEEDED",
  "quota overrun rejected",
);
assert(
  evaluateRateQuota(demand, { ...usage, requestsUsed: rateLimit.limit }, rateLimit, quota).code === "RATE_LIMIT_EXCEEDED",
  "rate limit exact exhausted rejects next request",
);
assert(
  evaluateRateQuota(demand, { ...usage, requestsUsed: rateLimit.limit - 1 }, rateLimit, quota).admitted === true,
  "request immediately below rate ceiling admitted",
);
assert(
  evaluateRateQuota({ ...demand, key: "" }, usage, rateLimit, quota).code === "INVALID_DEMAND",
  "empty key rejected",
);
assert(
  evaluateRateQuota({ ...demand, key: "x".repeat(257) }, usage, rateLimit, quota).code === "INVALID_DEMAND",
  "oversized key rejected",
);
assert(
  evaluateRateQuota({ ...demand, requestUnits: 0 }, usage, rateLimit, quota).code === "INVALID_DEMAND",
  "zero request units rejected",
);
assert(
  evaluateRateQuota({ ...demand, requestUnits: Number.POSITIVE_INFINITY }, usage, rateLimit, quota).code === "INVALID_DEMAND",
  "non-finite request units rejected",
);
assert(
  evaluateRateQuota(demand, { ...usage, quotaUnitsUsed: Number.MAX_SAFE_INTEGER + 1 }, rateLimit, quota).code === "INVALID_DEMAND",
  "unsafe quota usage rejected",
);

assertThrows(() => validateRateLimitPolicy({ limit: 0, periodSeconds: 60 }), "zero rate limit rejected");
assertThrows(() => validateQuotaPolicy({ maxUnits: 1, periodSeconds: 30 as 10 | 60 }), "unsupported quota period rejected");

// A downstream fan-out must not multiply the logical rate-limit charge.
const oneLogicalRequest = evaluateRateQuota(demand, usage, rateLimit, quota);
assert(oneLogicalRequest.admitted && oneLogicalRequest.requestUnits === 25, "logical request has one stable quota charge");

console.log("PASS: 13 rate/quota contract assertions");
