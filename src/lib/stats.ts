import type { InvestigationListItem } from "./queries";

/** Counts claim-level findings across real, completed investigations. */
export function findingCounts(items: InvestigationListItem[]) {
  let supported = 0, contradicted = 0, unverified = 0;
  for (const inv of items) {
    for (const c of inv.claims ?? []) {
      if (!c.is_verifiable) continue;
      if (c.assessment === "supported") supported++;
      else if (c.assessment === "contradicted") contradicted++;
      else if (c.assessment) unverified++;
    }
  }
  return { total: items.length, supported, contradicted, unverified };
}

export function isShared(r: InvestigationListItem["reports"]): boolean {
  if (!r) return false;
  return Array.isArray(r) ? r.some((x) => x.is_public) : r.is_public;
}
