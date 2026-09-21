import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("about:blank");
  await page.addScriptTag({ path: "dist/panel.js", type: "module" });
  await page.waitForFunction(() => customElements.get("jev-panel") && customElements.get("jev-gauge"));
});

test("panel shows typed signals, confidence hatching and stale status", async ({ page }) => {
  await page.evaluate(() => {
    const panel = document.createElement("jev-panel") as HTMLElement & { update(frame: unknown): void };
    document.body.append(panel);
    panel.update({ model: "fixture", latencyMs: 42.3, gauges: [
      { key: "addressed", label: "Addressed", p: 0.82, type: "noul" },
      { key: "attention", label: "Attention", p: 0.45, confidence: 0.4, type: "choice" },
    ] });
  });
  const panel = page.locator("jev-panel");
  await expect(panel.locator("jev-gauge")).toHaveCount(2);
  await expect(panel.locator("jev-gauge").first().locator(".value")).toHaveText("82%");
  await expect(panel.locator("jev-gauge").first().locator("[role=progressbar]")).toHaveAttribute("aria-valuenow", "82");
  await expect(panel.locator("jev-gauge").nth(1)).toHaveAttribute("uncertain", "");
  await expect(panel.locator(".meta")).toHaveText("fixture · 42 ms");
  await page.evaluate(() => {
    (document.querySelector("jev-panel") as HTMLElement & { update(frame: unknown): void }).update({ stale: true, skipped: true, gauges: [
      { key: "addressed", label: "Addressed", p: 0.82, type: "noul" },
    ] });
  });
  await expect(panel.locator(".status")).toHaveText("stale");
  await expect(panel.locator("jev-gauge")).toHaveCount(1);
  await expect(panel.locator("jev-gauge")).toHaveAttribute("stale", "");
});

test("untrusted labels are text and invalid frames cannot replace the display", async ({ page }) => {
  const result = await page.evaluate(() => {
    const panel = document.createElement("jev-panel") as HTMLElement & { update(frame: unknown): void };
    document.body.append(panel);
    panel.update({ gauges: [{ key: "cue", label: "<img src=x onerror=alert(1)>", p: 0.2 }] });
    let rejected = false;
    try { panel.update({ gauges: [{ key: "cue", label: "bad", p: 1.2 }] }); }
    catch { rejected = true; }
    return { rejected, images: panel.shadowRoot?.querySelectorAll("img").length, label: panel.shadowRoot?.querySelector("jev-gauge")?.shadowRoot?.querySelector(".label")?.textContent };
  });
  expect(result.rejected).toBe(true);
  expect(result.images).toBe(0);
  expect(result.label).toBe("<img src=x onerror=alert(1)>");
  await expect(page.locator("jev-panel").locator("jev-gauge").locator(".value")).toHaveText("20%");
});
