import { describe, it, expect } from "vitest";
import { computeFileHash } from "./fileHashService.js";

describe("FileHashService", () => {
  it("same file bytes -> same SHA-256 hash", () => {
    const buf = Buffer.from("hello world");
    const h1 = computeFileHash(buf);
    const h2 = computeFileHash(buf);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
  });

  it("different file bytes -> different hash", () => {
    const h1 = computeFileHash(Buffer.from("hello"));
    const h2 = computeFileHash(Buffer.from("world"));
    expect(h1).not.toBe(h2);
  });

  it("empty buffer produces valid hash", () => {
    const h = computeFileHash(Buffer.alloc(0));
    expect(h).toMatch(/^[a-f0-9]{64}$/);
  });
});
