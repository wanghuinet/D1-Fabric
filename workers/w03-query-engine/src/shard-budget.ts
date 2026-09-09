// Deterministic per-shard row budget allocation.
//
// Hard invariant: sum(budgets) <= globalMaxRows for ANY fanout.
// This replaces ceil(globalMaxRows / fanout), which can overshoot:
//   ceil(1000 / 3) = 334  ->  334 + 334 + 334 = 1002  (violates 1000).
//
// Allocation: base = floor(globalMaxRows / fanout), remainder = globalMaxRows % fanout.
// The first `remainder` shards get base + 1, the rest get base, so the total is exactly
// base * fanout + remainder = globalMaxRows.
export function allocateShardBudgets(fanout: number, globalMaxRows: number): number[] {
  if (fanout <= 0) return [];
  if (globalMaxRows <= 0) return Array.from({ length: fanout }, () => 0);
  const base = Math.floor(globalMaxRows / fanout);
  const remainder = globalMaxRows % fanout;
  return Array.from({ length: fanout }, (_, i) => (i < remainder ? base + 1 : base));
}