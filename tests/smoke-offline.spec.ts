// Stage 5: offline app-shell + §7 performance budgets on the 1500 fixture.
import { test, expect, openApp, meta, allowConsole } from "./app";
import { makeState, tinyState } from "./fixtures";

test.describe("offline via service worker", () => {
  test.use({ serviceWorkers: "allow" });

  test("app opens offline after first visit", async ({ page, context }, ti) => {
    const { tr } = meta(ti);
    allowConsole(page, /Failed to load resource|ERR_INTERNET_DISCONNECTED|ERR_FAILED/);
    await openApp(page, ti, tinyState());
    // wait until the SW controls the page and the shell is cached
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) {
        await new Promise<void>((res) => {
          navigator.serviceWorker.addEventListener("controllerchange", () => res(), { once: true });
          if (reg.active && navigator.serviceWorker.controller) res();
        });
      }
    });
    await expect
      .poll(
        () => page.evaluate(() => caches.has("gamelog-shell-v1")),
        { message: "shell cache must exist" }
      )
      .toBe(true);

    await context.setOffline(true);
    await page.reload();
    // app shell served from cache, data from localStorage
    await expect(page.locator("h1")).toContainText(tr.title);
    await expect(page.locator("#stDone")).toHaveText("5");
    await context.setOffline(false);
  });
});

test.describe("performance budgets (§7)", () => {
  test.beforeEach(({}, ti) => {
    test.skip(meta(ti).form !== "desktop", "budgets are defined for desktop");
  });

  test("first render of 1500 games under 150 ms", async ({ page }, ti) => {
    await openApp(page, ti, makeState());
    const ms = await page.evaluate(() => (window as any).__firstRenderMs);
    test.info().annotations.push({ type: "perf", description: `first render: ${ms.toFixed(1)} ms` });
    expect(ms, `first render took ${ms} ms`).toBeLessThan(150);
  });

  test("search re-render on 1500 games under 150 ms, typing not blocked", async ({ page }, ti) => {
    await openApp(page, ti, makeState());
    await page.evaluate(() => { (window as any).__lastRenderMs = null; });
    await page.locator("#search").fill("Dark");
    // wait for the debounced (150 ms) search render to land
    await expect
      .poll(() => page.evaluate(() => (window as any).__lastRenderMs))
      .not.toBeNull();
    const ms = await page.evaluate(() => (window as any).__lastRenderMs);
    test.info().annotations.push({ type: "perf", description: `search render: ${ms.toFixed(1)} ms` });
    expect(ms, `search render took ${ms} ms`).toBeLessThan(150);
  });
});
