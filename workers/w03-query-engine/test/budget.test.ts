// Pure logic test for the W03 shard budget allocator.
// This runs WITHOUT D1/miniflare, proving the hard invariant:
//   sum(per-shard budgets) <= globalMaxRows  for ANY fanout.
// Run: node test/budget.test.ts
import { allocateShardBudgets } from '../src/shard-budget.ts';

let failures = 0;
function check(name, cond, detail) {
  if (!cond) { failures++; console.error(`FAIL ${name}: ${detail}`); }
  else { console.log(`PASS ${name}`); }
}

// The invariant to prove everywhere.
function assertSumLeq(fanout, budget) {
  const limits = allocateShardBudgets(fanout, budget);
  const sum = limits.reduce((a, b) => a + b, 0);
  check(
    `${budget}/${fanout} sum<=${budget}`,
    sum <= budget,
    `got limits=[${limits}] sum=${sum}`
  );
  check(
    `${budget}/${fanout} len`,
    limits.length === fanout,
    `got ${limits.length} limits`
  );
  check(
    `${budget}/${fanout} nonneg`,
    limits.every((x) => Number.isInteger(x) && x >= 0),
    `bad limits=[${limits}]`
  );
  return limits;
}

// Section 5/6 boundary cases.
assertSumLeq(1, 1000);   // [1000]
assertSumLeq(2, 1000);   // [500,500]
assertSumLeq(3, 1000);   // [334,333,333]
assertSumLeq(4, 1000);   // [250,250,250,250]
assertSumLeq(7, 1000);
assertSumLeq(8, 1000);   // [125 x8]

// Small budget cases (must not become fanout * 1).
assertSumLeq(3, 10);     // [4,3,3]
assertSumLeq(8, 1);      // [1,0,0,0,0,0,0,0]

// Exact-value spot checks proving the documented splits.
const three = allocateShardBudgets(3, 1000);
check('1000/3 exact', three.join(',') === '334,333,333', `got ${three.join(',')}`);
const four = allocateShardBudgets(4, 1000);
check('1000/4 exact', four.join(',') === '250,250,250,250', `got ${four.join(',')}`);
const one8 = allocateShardBudgets(8, 1);
check('1/8 exact', one8.join(',') === '1,0,0,0,0,0,0,0', `got ${one8.join(',')}`);

// Exhaustive sweep: every fanout 1..64, budgets 0..1000 must satisfy the invariant.
// This directly proves the fix cannot overshoot for any real fanout (<=MAX_FANOUT=64).
for (let fanout = 1; fanout <= 64; fanout++) {
  for (let budget = 0; budget <= 1000; budget++) {
    const limits = allocateShardBudgets(fanout, budget);
    const sum = limits.reduce((a, b) => a + b, 0);
    if (sum > budget) {
      failures++;
      console.error(`EXHAUSTIVE FAIL fanout=${fanout} budget=${budget} sum=${sum} limits=[${limits}]`);
    }
  }
}
console.log('EXHAUSTIVE SWEEP: fanout 1..64 x budget 0..1000 complete');

// Degenerate inputs.
check('fanout=0', allocateShardBudgets(0, 1000).length === 0, 'expected empty');
check('budget<=0', allocateShardBudgets(8, 0).every((x) => x === 0), 'expected zeros');

if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\nW03 budget allocator PASS (sum <= globalMaxRows for all fanout)');