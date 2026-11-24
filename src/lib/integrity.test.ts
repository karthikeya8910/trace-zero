import { describe, expect, it } from "vitest";
import { deriveOverallAssessment, reconcileClaimAssessment } from "./integrity";
import { checkPublicHttpUrl, normalizeUrl } from "./url-safety";

describe("claim verdicts need stored evidence", () => {
  it("downgrades SUPPORTED to UNVERIFIED when no supporting evidence exists", () => {
    const r = reconcileClaimAssessment({ proposed: "supported", confidence: "high", relationships: ["neutral"], distinctSources: 2, researchAvailable: true });
    expect(r.assessment).toBe("unverified");
    expect(r.confidence).toBe("low");
  });
  it("never reports CONTRADICTED without contradicting evidence (absence is not falsity)", () => {
    const r = reconcileClaimAssessment({ proposed: "contradicted", confidence: "medium", relationships: ["supports"], distinctSources: 3, researchAvailable: true });
    expect(r.assessment).toBe("unverified");
  });
  it("forces UNVERIFIED with low confidence when live research was unavailable", () => {
    const r = reconcileClaimAssessment({ proposed: "supported", confidence: "high", relationships: ["supports"], distinctSources: 2, researchAvailable: false });
    expect(r.assessment).toBe("unverified");
    expect(r.confidence).toBe("low");
  });
  it("caps confidence at medium when only one source was found", () => {
    const r = reconcileClaimAssessment({ proposed: "supported", confidence: "high", relationships: ["supports"], distinctSources: 1, researchAvailable: true });
    expect(r.assessment).toBe("supported");
    expect(r.confidence).toBe("medium");
  });
});

describe("overall verdict", () => {
  it("is UNVERIFIED when every claim is unverified", () => {
    expect(deriveOverallAssessment(["unverified", "unverified"], "contradicted")).toBe("unverified");
  });
  it("cannot be SUPPORTED when a claim is contradicted", () => {
    expect(deriveOverallAssessment(["supported", "contradicted"], "supported")).toBe("mixed");
  });
});

describe("URL safety", () => {
  it("rejects private network and localhost addresses", () => {
    for (const u of ["http://127.0.0.1/", "http://10.0.0.4", "http://192.168.1.1", "http://169.254.169.254/latest", "http://localhost:3000", "http://[::1]/", "file:///etc/passwd", "http://user:pw@example.com", "http://example.com:8080/"]) {
      expect(checkPublicHttpUrl(u).ok).toBe(false);
    }
  });
  it("accepts a normal public https address", () => {
    expect(checkPublicHttpUrl("https://www.example.org/news/article?id=4").ok).toBe(true);
  });
  it("normalises tracking parameters for de-duplication", () => {
    expect(normalizeUrl("https://www.Example.com/a/?utm_source=x#top")).toBe("https://example.com/a");
  });
});
