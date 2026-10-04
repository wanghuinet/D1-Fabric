export interface D1ProviderCapabilities {
  readonly provider: "cloudflare-d1";
  readonly preparedStatements: boolean;
  readonly atomicBatch: boolean;
  readonly transactionScope: "single-target";
}

export function inspectD1Capabilities(db: unknown): D1ProviderCapabilities {
  const value = db as { prepare?: unknown; batch?: unknown } | null | undefined;
  return Object.freeze({
    provider: "cloudflare-d1" as const,
    preparedStatements: typeof value?.prepare === "function",
    atomicBatch: typeof value?.batch === "function",
    transactionScope: "single-target" as const,
  });
}
