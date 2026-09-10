import { handleW06 } from "./api.ts";
export { handleW06 } from "./api.ts";
export * from "./expansion.ts";
export * from "./metadata.ts";
export * from "./migration.ts";
export * from "./placement.ts";
export * from "./rebalance.ts";
export * from "./topology.ts";

export default { fetch: handleW06 };
