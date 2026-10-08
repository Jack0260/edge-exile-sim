import { describe, it, expect } from "vitest";
import { scan, costPerMillion, EDGES } from "@/lib/exile";

describe("exile rules", () => {
  it("flags fs as non-exilable", () => {
    expect(scan(`const fs = require("fs");`)[0]?.api).toBe("fs");
  });
  it("pure function is exilable", () => {
    expect(scan(`export default (a,b)=>a+b`)).toHaveLength(0);
  });
  it("Mumbai 12ms, Virginia 120ms", () => {
    expect(EDGES.find((e) => e.city === "Mumbai")!.rtt).toBe(12);
    expect(EDGES.find((e) => e.city === "Virginia")!.rtt).toBe(120);
  });
  it("cost per 1M with 0 cpu is $0.30", () => {
    expect(costPerMillion(0)).toBe(0.3);
  });
});
