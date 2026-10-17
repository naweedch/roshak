import "server-only";
import { randomInt } from "node:crypto";

/** الفبای Crockford بدون حروف مبهم (I, L, O, U) */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** شمارهٔ سفارش خوانا و غیرقابل حدس، مثل RSK-261016-7K4QZ */
export function generateOrderNumber(date = new Date()): string {
  const yy = String(date.getUTCFullYear() % 100).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  let suffix = "";
  for (let i = 0; i < 5; i++) suffix += ALPHABET[randomInt(ALPHABET.length)];
  return `RSK-${yy}${mm}${dd}-${suffix}`;
}
