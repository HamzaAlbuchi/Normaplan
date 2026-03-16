/**
 * File hash service – computes stable SHA-256 from raw file bytes.
 * Used for analysis reuse: same content → same hash.
 */

import { createHash } from "node:crypto";

export function computeFileHash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}
