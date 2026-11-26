import { describe, expect, it } from "vitest";
import { findingCounts } from "./stats";

const inv = (claims: { assessment: string | null; is_verifiable: boolean }[]) => ({ claims } as never);

describe("findingCounts", () => {
  it("is all zeros for a new user", () => {
    expect(findingCounts([])).toEqual({ total: 0, supported: 0, contradicted: 0, unverified: 0 });
  });
  it("ignores non-verifiable claims and buckets the rest", () => {
    const r = findingCounts([inv([{ assessment: "supported", is_verifiable: true }, { assessment: "contradicted", is_verifiable: true }, { assessment: "mixed", is_verifiable: true }, { assessment: "supported", is_verifiable: false }])]);
    expect(r).toEqual({ total: 1, supported: 1, contradicted: 1, unverified: 1 });
  });
});
