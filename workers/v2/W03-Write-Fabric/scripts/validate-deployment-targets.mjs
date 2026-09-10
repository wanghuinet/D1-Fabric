import { readFile } from "node:fs/promises";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PLACEHOLDER = /^<[^>]+>$/;

function fail(message) {
  console.error(`DEPLOYMENT_TARGET_VALIDATION_FAILED: ${message}`);
  process.exit(1);
}

function parseTomlBindings(text) {
  const rows = [];
  let current = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "[[d1_databases]]") {
      current = {};
      rows.push(current);
      continue;
    }
    if (!current || !line || line.startsWith("#")) continue;
    const match = line.match(/^(binding|database_name|database_id)\s*=\s*"([^"]+)"$/);
    if (match) current[match[1]] = match[2];
  }
  return rows;
}

function parseRemoteDatabases(raw) {
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    fail("Wrangler D1 list output is not valid JSON");
  }
  if (!Array.isArray(value)) fail("Wrangler D1 list output must be an array");
  return value.map((entry) => ({
    id: entry.uuid ?? entry.database_id,
    name: entry.name ?? entry.database_name,
  }));
}

const [manifestPath = "deployment/targets.json", wranglerPath = "wrangler.toml", remotePath] = process.argv.slice(2);
const manifestText = await readFile(manifestPath, "utf8").catch((error) => fail(`cannot read ${manifestPath}: ${error.message}`));
const wranglerText = await readFile(wranglerPath, "utf8").catch((error) => fail(`cannot read ${wranglerPath}: ${error.message}`));

let manifest;
try {
  manifest = JSON.parse(manifestText);
} catch {
  fail("deployment target manifest is invalid JSON");
}

if (!manifest || manifest.version !== 1 || !Array.isArray(manifest.targets) || manifest.targets.length === 0) {
  fail("deployment target manifest must have version=1 and at least one target");
}

const bindings = parseTomlBindings(wranglerText);
if (bindings.length === 0) fail("wrangler.toml declares no D1 bindings");

const bindingMap = new Map();
for (const row of bindings) {
  if (!row.binding || !row.database_name || !row.database_id) fail("every D1 binding must declare binding, database_name, and database_id");
  if (bindingMap.has(row.binding)) fail(`duplicate Wrangler D1 binding ${row.binding}`);
  bindingMap.set(row.binding, row);
}

const targetIds = new Set();
const bindingNames = new Set();
const databaseIds = new Set();
const strict = process.env.D1_FABRIC_STRICT_DEPLOYMENT === "1";

for (const target of manifest.targets) {
  if (!target || typeof target !== "object") fail("manifest contains an invalid target entry");
  for (const field of ["physicalTargetId", "bindingName", "databaseName", "databaseId"]) {
    if (typeof target[field] !== "string" || target[field].length === 0) fail(`target ${field} is invalid`);
  }
  if (targetIds.has(target.physicalTargetId)) fail(`duplicate physicalTargetId ${target.physicalTargetId}`);
  if (bindingNames.has(target.bindingName)) fail(`duplicate manifest bindingName ${target.bindingName}`);
  if (databaseIds.has(target.databaseId)) fail(`duplicate databaseId ${target.databaseId}`);
  targetIds.add(target.physicalTargetId);
  bindingNames.add(target.bindingName);
  databaseIds.add(target.databaseId);

  const binding = bindingMap.get(target.bindingName);
  if (!binding) fail(`manifest binding ${target.bindingName} is absent from wrangler.toml`);
  if (binding.database_name !== target.databaseName) fail(`database_name mismatch for ${target.bindingName}`);

  const placeholder = PLACEHOLDER.test(target.databaseId);
  if (strict && placeholder) fail(`placeholder databaseId is forbidden in strict deployment: ${target.bindingName}`);
  if (!placeholder && !UUID.test(target.databaseId)) fail(`databaseId for ${target.bindingName} is not a valid D1 UUID`);
  if (!placeholder && binding.database_id !== target.databaseId) fail(`database_id mismatch for ${target.bindingName}`);
}

if (strict && bindings.length !== manifest.targets.length) {
  fail(`strict deployment requires a one-to-one manifest/Wrangler D1 binding set; manifest=${manifest.targets.length}, wrangler=${bindings.length}`);
}

if (remotePath) {
  const remoteText = await readFile(remotePath, "utf8").catch((error) => fail(`cannot read ${remotePath}: ${error.message}`));
  const remote = parseRemoteDatabases(remoteText);
  const remoteById = new Map(remote.filter((entry) => entry.id).map((entry) => [entry.id, entry]));
  for (const target of manifest.targets) {
    if (PLACEHOLDER.test(target.databaseId)) fail(`remote attestation cannot use placeholder databaseId: ${target.bindingName}`);
    const actual = remoteById.get(target.databaseId);
    if (!actual) fail(`databaseId ${target.databaseId} for ${target.bindingName} is not present in the Cloudflare account`);
    if (actual.name !== target.databaseName) fail(`Cloudflare database name mismatch for ${target.bindingName}: expected ${target.databaseName}, got ${actual.name ?? "<unknown>"}`);
  }
}

console.log(`deployment target manifest valid: ${manifest.targets.length} target(s)`);
if (remotePath) console.log("Cloudflare remote D1 identity attestation: PASS");
else if (!strict) console.log("non-strict mode: placeholder database IDs are permitted for repository CI only");
