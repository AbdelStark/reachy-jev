import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

test("packed package installs in an isolated consumer with API and bank-lint CLI", async () => {
  const work = mkdtempSync(join(tmpdir(), "reachy-jev-pack-"));
  try {
    const filename = execFileSync("npm", ["pack", "--pack-destination", work, "--silent"], { cwd: root, encoding: "utf8" }).trim();
    const consumer = join(work, "consumer");
    execFileSync("npm", ["install", "--prefix", consumer, join(work, filename)], { stdio: "pipe" });
    const installed = join(consumer, "node_modules", "reachy-jev");
    const pkg = JSON.parse(readFileSync(join(installed, "package.json"), "utf8"));
    assert.equal(pkg.exports["./panel"].default, "./dist/panel.js");
    assert.equal(pkg.exports["./react"].default, "./dist/react.js");
    assert.ok(existsSync(join(installed, "dist", "panel.js")));
    assert.ok(existsSync(join(installed, "dist", "panel.d.ts")));
    assert.ok(existsSync(join(installed, "dist", "react.js")));
    assert.ok(existsSync(join(installed, "dist", "react.d.ts")));
    assert.ok(existsSync(join(installed, "examples", "room-decision.mjs")));
    assert.ok(existsSync(join(installed, "docs", "QUESTION-BANK-CHECKLIST.md")));
    const api = await import(pathToFileURL(join(installed, "dist", "index.js")).href);
    assert.equal(api.bearing(-20), "slightly left");
    const example = execFileSync("node", [join(installed, "examples", "room-decision.mjs")], { cwd: consumer, encoding: "utf8" });
    assert.equal(JSON.parse(example).decision, "yes");
    const lint = execFileSync(join(consumer, "node_modules", ".bin", "reachy-jev"), ["questions", "lint", join(installed, "examples", "attention-bank.json"), "--people", "p1"], { cwd: consumer, encoding: "utf8" });
    assert.match(lint, /valid example\.attention@0\.1\.0: 2 questions/);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});
