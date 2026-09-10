import type { PhysicalTargetCatalog, PhysicalTargetCatalogEntry } from "./target.ts";

export type TargetConsistencyErrorCode =
  | "TARGET_CATALOG_DUPLICATE_BINDING"
  | "TARGET_CATALOG_DUPLICATE_TARGET"
  | "TARGET_CATALOG_MISSING_BINDING"
  | "TARGET_CATALOG_VERSION_CONFLICT"
  | "TARGET_CATALOG_PHYSICAL_SHARD_CONFLICT";

export class TargetConsistencyError extends Error {
  readonly code: TargetConsistencyErrorCode;
  constructor(code: TargetConsistencyErrorCode, message: string) {
    super(message);
    this.name = "TargetConsistencyError";
    this.code = code;
  }
}

export function assertTargetCatalogConsistent(
  catalog: PhysicalTargetCatalog,
  bindings: Readonly<Record<string, unknown>>,
): void {
  const targetIds = new Set<string>();
  const bindingsByName = new Map<string, PhysicalTargetCatalogEntry>();
  const shardsByVersion = new Map<string, PhysicalTargetCatalogEntry>();

  for (const entry of catalog.targets) {
    if (targetIds.has(entry.physicalTargetId)) {
      throw new TargetConsistencyError("TARGET_CATALOG_DUPLICATE_TARGET", "physicalTargetId maps to multiple catalog entries");
    }
    targetIds.add(entry.physicalTargetId);

    const existingBinding = bindingsByName.get(entry.bindingName);
    if (existingBinding && existingBinding.physicalTargetId !== entry.physicalTargetId) {
      throw new TargetConsistencyError("TARGET_CATALOG_DUPLICATE_BINDING", "one D1 binding maps to multiple physical targets");
    }
    bindingsByName.set(entry.bindingName, entry);

    const shardKey = `${entry.logicalDatabaseId}|${entry.logicalShardId}|${entry.topologyVersion}`;
    const existingShard = shardsByVersion.get(shardKey);
    if (existingShard && existingShard.physicalShardId !== entry.physicalShardId) {
      throw new TargetConsistencyError("TARGET_CATALOG_PHYSICAL_SHARD_CONFLICT", "one logical shard/version maps to multiple physical shards");
    }
    shardsByVersion.set(shardKey, entry);

    const binding = bindings[entry.bindingName];
    if (entry.admitted && (!binding || typeof binding !== "object")) {
      throw new TargetConsistencyError("TARGET_CATALOG_MISSING_BINDING", `admitted target binding ${entry.bindingName} is unavailable`);
    }
  }

  for (const [bindingName, entry] of bindingsByName) {
    if (entry.admitted && (!bindings[bindingName] || typeof bindings[bindingName] !== "object")) {
      throw new TargetConsistencyError("TARGET_CATALOG_MISSING_BINDING", `admitted target binding ${bindingName} is unavailable`);
    }
  }
}
