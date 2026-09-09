const base=(process.argv[2]??'http://127.0.0.1:8787').replace(/\/$/,'');
async function req(path,init,code){const r=await fetch(base+path,init);const b=await r.json();if(r.status!==code)throw new Error(`${path}: ${r.status} ${JSON.stringify(b)}`);return b;}
const q=(body,code)=>req('/v1/query/plan',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)},code);
await req('/health',undefined,200);

// --- W03 Budget & Safety Tests ---

// Test 1: LIMIT 100, max_rows 1000 → PASS (within budget).
const t1=await q({tenant_id:'t1',sql:'SELECT 1 LIMIT 100',shard_ids:[0],max_rows:1000},200);
if(t1.max_rows!==1000)throw new Error('Test 1: max_rows mismatch');

// Test 2: LIMIT 100000, max_rows 1000 → must not exceed 1000 rows.
const t2=await q({tenant_id:'t1',sql:'SELECT 1 LIMIT 100000',shard_ids:[0],max_rows:1000},200);
if(t2.total_rows>1000)throw new Error(`Test 2: execution-level limit violated, got ${t2.total_rows}`);
if(t2.budget_sum>1000)throw new Error('Test 2: budget_sum exceeds global');

// Test 3: No LIMIT, max_rows 1000 → auto-bounded.
const t3=await q({tenant_id:'t1',sql:'SELECT 1',shard_ids:[0],max_rows:1000},200);
if(t3.total_rows>1000)throw new Error('Test 3: unbounded query not capped');
if(!Array.isArray(t3.per_shard_limits))throw new Error('Test 3: per_shard_limits missing');

// Test 4: LIMIT 1000, max_rows 1000 → PASS.
const t4=await q({tenant_id:'t1',sql:'SELECT 1 LIMIT 1000',shard_ids:[0],max_rows:1000},200);
if(t4.total_rows>1000)throw new Error('Test 4: exceeded limit');

// Test 5: LIMIT 999, max_rows 1000 → PASS.
const t5=await q({tenant_id:'t1',sql:'SELECT 1 LIMIT 999',shard_ids:[0],max_rows:1000},200);
if(t5.total_rows>999)throw new Error('Test 5: exceeded business limit');

// Test 6: Multi-statement → REJECT.
await q({tenant_id:'t1',sql:'SELECT 1; DELETE FROM fabric_records',shard_ids:[0]},400);

// Test 7: UPDATE → REJECT.
await q({tenant_id:'t1',sql:'UPDATE fabric_records SET payload_json=1',shard_ids:[0]},400);

// Test 8: DELETE → REJECT.
await q({tenant_id:'t1',sql:'DELETE FROM fabric_records',shard_ids:[0]},400);

// Test 9: SQL + params → PASS.
const t9=await q({tenant_id:'t1',sql:'SELECT 1 WHERE 1=?',shard_ids:[0],params:[1]},200);
if(t9.execution!=='D1_EXECUTED')throw new Error('Test 9: params not executed');

// Test 10: Multi-shard, max_rows=1000 → total rows <= 1000 (global, not per-shard).
const t10=await q({tenant_id:'t1',sql:'SELECT 1',shard_ids:[0,1,2,3],max_rows:1000},200);
if(t10.total_rows>1000)throw new Error(`Test 10: global budget violated: ${t10.total_rows} > 1000`);
if(t10.fanout!==4)throw new Error('Test 10: fanout mismatch');
if(t10.budget_sum!==1000)throw new Error(`Test 10: budget_sum wrong: ${t10.budget_sum}`);
if(t10.per_shard_limits.join(',')!=='250,250,250,250')throw new Error(`Test 10: per_shard_limits wrong: ${t10.per_shard_limits}`);

// Test 11: max_parallelism must be enforced (shard_ids > parallelism still works).
const t11=await q({tenant_id:'t1',sql:'SELECT 1',shard_ids:[0,1,2,3,4,5,6,7],max_rows:100},200);
if(t11.parallelism>4)throw new Error(`Test 11: parallelism not bounded: ${t11.parallelism}`);
if(t11.total_rows>100)throw new Error('Test 11: global budget exceeded');

// Test 12: Deadline expired → 504 TIMEOUT (use 1ms deadline).
await q({tenant_id:'t1',sql:'SELECT 1',shard_ids:[0],deadline_ms:1},504);

// Shard contract: 0..63 valid, 64 invalid.
await q({tenant_id:'t1',sql:'SELECT 1',shard_ids:[64]},400);
await q({tenant_id:'t1',sql:'SELECT 1',shard_ids:[-1]},400);

// Fanout limit: 65 shards exceeds default MAX_FANOUT=8.
await q({tenant_id:'t1',sql:'SELECT 1',shard_ids:Array.from({length:65},(_,i)=>i)},429);

// --- Global MAX_ROWS fanout boundary cases (sum of per-shard budgets <= budget) ---
const boundary = async (fanout, budget) => {
  const ids = Array.from({ length: fanout }, (_, i) => i);
  const r = await q({ tenant_id:'t1', sql:'SELECT 1', shard_ids:ids, max_rows:budget }, 200);
  const sum = r.per_shard_limits.reduce((a, b) => a + b, 0);
  if (sum > budget) throw new Error(`fanout=${fanout} budget=${budget}: sum ${sum} > ${budget}`);
  if (r.budget_sum !== sum) throw new Error(`fanout=${fanout}: budget_sum ${r.budget_sum} != ${sum}`);
  if (r.per_shard_limits.length !== fanout) throw new Error(`fanout=${fanout}: wrong limit count`);
  return r;
};
await boundary(1, 1000);
await boundary(2, 1000);
await boundary(3, 1000);
await boundary(4, 1000);
await boundary(7, 1000);
await boundary(8, 1000);
await boundary(3, 10);
await boundary(8, 1);

console.log('W03 smoke PASS (12 tests + fanout boundary cases)');
