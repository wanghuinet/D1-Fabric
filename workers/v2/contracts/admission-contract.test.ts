import {
  admit,
  validateAdmissionDemand,
  validateAdmissionLimits,
  type AdmissionDemand,
  type AdmissionLimits,
} from "./admission-contract";

const limits: AdmissionLimits = {
  maxFanout: 8,
  maxConcurrency: 4,
  maxStatements: 16,
  maxRowsRead: 1000,
  maxRowsWrite: 100,
  deadlineMs: 2000,
  maxRetries: 2,
};

const demand: AdmissionDemand = {
  fanout: 4,
  concurrency: 2,
  statements: 8,
  rowsRead: 500,
  rowsWrite: 20,
  deadlineMs: 1000,
  retries: 1,
};

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function assertThrows(fn: () => void, message: string): void {
  let threw = false;
  try { fn(); } catch { threw = true; }
  assert(threw, message);
}

validateAdmissionDemand(demand);
validateAdmissionLimits(limits);
assert(admit(demand, limits).admitted === true, "valid demand is admitted");

const boundaries: ReadonlyArray<readonly [keyof AdmissionDemand, keyof AdmissionLimits, string]> = [
  ["fanout", "maxFanout", "FANOUT_EXCEEDED"],
  ["concurrency", "maxConcurrency", "CONCURRENCY_EXCEEDED"],
  ["statements", "maxStatements", "STATEMENTS_EXCEEDED"],
  ["rowsRead", "maxRowsRead", "ROWS_READ_EXCEEDED"],
  ["rowsWrite", "maxRowsWrite", "ROWS_WRITE_EXCEEDED"],
  ["deadlineMs", "deadlineMs", "DEADLINE_EXCEEDED"],
  ["retries", "maxRetries", "RETRIES_EXCEEDED"],
];

for (const [field, limitField, expected] of boundaries) {
  const candidate = { ...demand, [field]: limits[limitField] + 1 } as AdmissionDemand;
  assert(admit(candidate, limits).code === expected, `${field} boundary rejects deterministically`);
}

assert(admit({ ...demand, fanout: limits.maxFanout }, limits).admitted === true, "fanout exact ceiling is admitted");
assert(admit({ ...demand, concurrency: limits.maxConcurrency }, limits).admitted === true, "concurrency exact ceiling is admitted");
assert(admit({ ...demand, statements: limits.maxStatements }, limits).admitted === true, "statement exact ceiling is admitted");
assert(admit({ ...demand, rowsRead: limits.maxRowsRead }, limits).admitted === true, "rows-read exact ceiling is admitted");
assert(admit({ ...demand, rowsWrite: limits.maxRowsWrite }, limits).admitted === true, "rows-write exact ceiling is admitted");
assert(admit({ ...demand, deadlineMs: limits.deadlineMs }, limits).admitted === true, "deadline exact ceiling is admitted");
assert(admit({ ...demand, retries: limits.maxRetries }, limits).admitted === true, "retry exact ceiling is admitted");

assert(admit({ ...demand, fanout: 0 }, limits).code === "INVALID_DEMAND", "zero fanout is rejected");
assert(admit({ ...demand, concurrency: Number.POSITIVE_INFINITY }, limits).code === "INVALID_DEMAND", "non-finite concurrency is rejected");
assert(admit({ ...demand, rowsRead: Number.MAX_SAFE_INTEGER + 1 }, limits).code === "INVALID_DEMAND", "unsafe integer demand is rejected");

assertThrows(() => validateAdmissionDemand({ ...demand, deadlineMs: 0 }), "zero deadline is rejected by validator");
assertThrows(() => validateAdmissionLimits({ ...limits, maxRetries: -1 }), "negative retry limit is rejected by validator");

console.log("PASS: 24 admission contract assertions");
