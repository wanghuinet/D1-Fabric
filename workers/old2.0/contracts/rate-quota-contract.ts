export type WindowSeconds = 10 | 60;

export interface RateLimitPolicy {
  limit: number;
  periodSeconds: WindowSeconds;
}

export interface QuotaPolicy {
  maxUnits: number;
  periodSeconds: WindowSeconds;
}

export interface RateQuotaDemand {
  key: string;
  requestUnits: number;
}

export interface RateQuotaUsage {
  requestsUsed: number;
  quotaUnitsUsed: number;
}

export type RateQuotaRejectCode =
  | "INVALID_DEMAND"
  | "RATE_LIMIT_EXCEEDED"
  | "QUOTA_EXCEEDED";

export interface RateQuotaDecision {
  admitted: boolean;
  code?: RateQuotaRejectCode;
  requestUnits: number;
}

const positiveSafeInt = (value: number): boolean =>
  Number.isSafeInteger(value) && value > 0;

const nonNegativeSafeInt = (value: number): boolean =>
  Number.isSafeInteger(value) && value >= 0;

export function validateRateLimitPolicy(policy: RateLimitPolicy): void {
  if (!positiveSafeInt(policy.limit)) throw new Error("invalid rate limit");
  if (policy.periodSeconds !== 10 && policy.periodSeconds !== 60) {
    throw new Error("invalid rate limit period");
  }
}

export function validateQuotaPolicy(policy: QuotaPolicy): void {
  if (!positiveSafeInt(policy.maxUnits)) throw new Error("invalid quota units");
  if (policy.periodSeconds !== 10 && policy.periodSeconds !== 60) {
    throw new Error("invalid quota period");
  }
}

export function validateRateQuotaDemand(demand: RateQuotaDemand): void {
  if (!demand.key || demand.key.length > 256) throw new Error("invalid rate limit key");
  if (!positiveSafeInt(demand.requestUnits)) throw new Error("invalid request units");
}

export function validateRateQuotaUsage(usage: RateQuotaUsage): void {
  if (!nonNegativeSafeInt(usage.requestsUsed)) throw new Error("invalid request usage");
  if (!nonNegativeSafeInt(usage.quotaUnitsUsed)) throw new Error("invalid quota usage");
}

export function evaluateRateQuota(
  demand: RateQuotaDemand,
  usage: RateQuotaUsage,
  rateLimit: RateLimitPolicy,
  quota: QuotaPolicy,
): RateQuotaDecision {
  try {
    validateRateQuotaDemand(demand);
    validateRateQuotaUsage(usage);
    validateRateLimitPolicy(rateLimit);
    validateQuotaPolicy(quota);
  } catch {
    return { admitted: false, code: "INVALID_DEMAND", requestUnits: 0 };
  }

  // One logical request consumes one rate-limit request, regardless of internal Worker hops.
  if (usage.requestsUsed >= rateLimit.limit) {
    return { admitted: false, code: "RATE_LIMIT_EXCEEDED", requestUnits: demand.requestUnits };
  }

  // Resource quota is charged once for the logical operation, not once per downstream shard.
  if (usage.quotaUnitsUsed > quota.maxUnits - demand.requestUnits) {
    return { admitted: false, code: "QUOTA_EXCEEDED", requestUnits: demand.requestUnits };
  }

  return { admitted: true, requestUnits: demand.requestUnits };
}
