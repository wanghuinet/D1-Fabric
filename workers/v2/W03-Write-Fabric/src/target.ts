import type { D1DatabaseLike } from "./write.ts";

export type PhysicalTargetCatalogEntry = Readonly<{
  logicalDatabaseId: string;
  logicalShardId: string;
  physicalShardId: string;
  topologyVersion: number;
  physicalTargetId: string;
  bindingName: string;
  admitted: boolean;
}>;

export type PhysicalTargetCatalog = Readonly<{
  version: 1;
  targets: readonly PhysicalTargetCatalogEntry[];
}>;

export type PhysicalTargetErrorCode =
  | "PHYSICAL_TARGET_REQUIRED"
  | "PHYSICAL_TARGET_UNKNOWN"
  | "PHYSICAL_TARGET_CONFLICT"
  | "PHYSICAL_TARGET_BINDING_MISSING"
  | "PHYSICAL_TARGET_NOT_ADMITTED"
  | "PHYSICAL_TARGET_VERSION_MISMATCH"
  | "PHYSICAL_TARGET_OVERRIDE_FORBIDDEN";

export class PhysicalTargetResolutionError extends Error {
  readonly code: PhysicalTargetErrorCode;

  constructor(code: PhysicalTargetErrorCode, message: string) {
    super(message);
    this.name = "PhysicalTargetResolutionError";
    this.code = code;
  }
}

const MAX_CATALOG_BYTES = 256 * 1024;
const MAX_ENTRIES = 5000;

function boundedText(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 256) {
    throw new PhysicalTargetResolutionError("PHYSICAL_TARGET_UNKNOWN", `${field} is invalid`);
  }
}

function validPositiveVersion(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function parseCatalog(raw: string | undefined): PhysicalTargetCatalog {
  if (!raw) throw new PhysicalTargetResolutionError("PHYSICAL_TARGET_UNKNOWN", "physical target catalog is unavailable");
  if (new TextEncoder().encode(raw).byteLength > MAX_CATALOG_BYTES) {
    throw new PhysicalTargetResolutionError("PHYSICAL_TARGET_CONFLICT", "physical target catalog exceeds the bounded size");
  }

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new PhysicalTargetResolutionError("PHYSICAL_TARGET_CONFLICT", "physical target catalog is invalid JSON");
  }
  if (value === null || typeof value !== "object") {
    throw new PhysicalTargetResolutionError("PHYSICAL_TARGET_CONFLICT", "physical target catalog must be an object");
  }

  const catalog = value as Partial<PhysicalTargetCatalog>;
  if (catalog.version !== 1 || !Array.isArray(catalog.targets) || catalog.targets.length > MAX_ENTRIES) {
    throw new PhysicalTargetResolutionError("PHYSICAL_TARGET_CONFLICT", "physical target catalog shape is invalid");
  }

  const seen = new Set<string>();
  for (const entry of catalog.targets) {
    if (entry === null || typeof entry !== "object") {
      throw new PhysicalTargetResolutionError("PHYSICAL_TARGET_CONFLICT", "physical target catalog contains invalid entries");
    }
    boundedText(entry.logicalDatabaseId, "logicalDatabaseId");
    boundedText(entry.logicalShardId, "logicalShardId");
    boundedText(entry.physicalShardId, "physicalShardId");
    boundedText(entry.physicalTargetId, "physicalTargetId");
    boundedText(entry.bindingName, "bindingName");
    if (!validPositiveVersion(entry.topologyVersion) || typeof entry.admitted !== "boolean") {
      throw new PhysicalTargetResolutionError("PHYSICAL_TARGET_CONFLICT", "physical target catalog contains invalid version or admission state");
    }
    const key = `${entry.logicalDatabaseId}|${entry.logicalShardId}|${entry.physicalShardId}|${entry.topologyVersion}`;
    if (seen.has(key)) throw new PhysicalTargetResolutionError("PHYSICAL_TARGET_CONFLICT", "physical target mapping is duplicated");
    seen.add(key);
  }

  return catalog as PhysicalTargetCatalog;
}

export type PhysicalTargetEnvironment = Readonly<Record<string, unknown>> & {
  PHYSICAL_TARGET_CATALOG_JSON?: string;
};

export type ResolvedPhysicalTarget = Readonly<{
  physicalTargetId: string;
  bindingName: string;
  db: D1DatabaseLike;
}>;

export function resolvePhysicalTarget(
  env: PhysicalTargetEnvironment,
  input: Readonly<{
    logicalDatabaseId: string;
    logicalShardId: string;
    physicalShardId: string;
    topologyVersion: number;
    physicalTargetOverride?: unknown;
    bindingOverride?: unknown;
  }>,
): ResolvedPhysicalTarget {
  if (input.physicalTargetOverride !== undefined || input.bindingOverride !== undefined) {
    throw new PhysicalTargetResolutionError("PHYSICAL_TARGET_OVERRIDE_FORBIDDEN", "caller-supplied physical target overrides are forbidden");
  }
  boundedText(input.logicalDatabaseId, "logicalDatabaseId");
  boundedText(input.logicalShardId, "logicalShardId");
  boundedText(input.physicalShardId, "physicalShardId");
  if (!validPositiveVersion(input.topologyVersion)) {
    throw new PhysicalTargetResolutionError("PHYSICAL_TARGET_VERSION_MISMATCH", "topologyVersion must be a positive safe integer");
  }

  const catalog = parseCatalog(env.PHYSICAL_TARGET_CATALOG_JSON);
  const candidates = catalog.targets.filter((entry) => entry.logicalDatabaseId === input.logicalDatabaseId && entry.logicalShardId === input.logicalShardId && entry.physicalShardId === input.physicalShardId);
  if (candidates.length === 0) {
    throw new PhysicalTargetResolutionError("PHYSICAL_TARGET_UNKNOWN", "physical target mapping is unknown");
  }

  const exact = candidates.filter((entry) => entry.topologyVersion === input.topologyVersion);
  if (exact.length === 0) {
    throw new PhysicalTargetResolutionError("PHYSICAL_TARGET_VERSION_MISMATCH", "physical target is not published for the requested topology version");
  }
  if (exact.length !== 1) {
    throw new PhysicalTargetResolutionError("PHYSICAL_TARGET_CONFLICT", "physical target mapping is ambiguous");
  }

  const target = exact[0];
  if (!target.admitted) {
    throw new PhysicalTargetResolutionError("PHYSICAL_TARGET_NOT_ADMITTED", "physical target is not admitted");
  }

  const binding = env[target.bindingName];
  if (!binding || typeof binding !== "object") {
    throw new PhysicalTargetResolutionError("PHYSICAL_TARGET_BINDING_MISSING", "physical target binding is unavailable");
  }

  const db = binding as D1DatabaseLike;
  if (typeof db.prepare !== "function" || typeof db.batch !== "function") {
    throw new PhysicalTargetResolutionError("PHYSICAL_TARGET_BINDING_MISSING", "physical target binding is not a D1 database binding");
  }

  return { physicalTargetId: target.physicalTargetId, bindingName: target.bindingName, db };
}
