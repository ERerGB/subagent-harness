import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const FIXTURES_DIR = resolve(import.meta.dirname, "fixtures");

export function readFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), "utf8");
}
