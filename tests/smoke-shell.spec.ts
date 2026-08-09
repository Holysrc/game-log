// §9 smoke: RU/EN, PWA manifest, desktop grid ≥860px, no horizontal overflow.
import { test, expect, openApp, openCard, meta, L, expectNoHorizontalOverflow } from "./app";
import { tinyState, makeState } from "./fixtures";

test("all visible chrome is translated", async ({ page }, ti) => {
  const { tr, lang } = meta(ti);
  await openApp(page, ti, tinyState());
  await expect(page.locator("h1")).toHaveText(tr.title);
  const tabs = page.locator(".tab");
  for (let i = 0; i < tr.tabs.length; i++) await expect(tabs.nth(i)).toHaveText(tr.tabs[i]);
  await expect(page.locator("#addBtn")).toHaveText(tr.add);
  await expect(page.locator("#search")).toHaveAttribute("placeholder", tr.searchPh);

  // switching language re-renders everything
  const other = lang === "ru" ? "en" : "ru";
  await page.locator("#gearBtn").click();
  await page.locator("#langSel").selectOption(other);
  await expect(page.locator("h1")).toHaveText(L[other].title);
  expect(await page.evaluate(() => localStorage.getItem("gamelog-lang"))).toBe(other);
});

test("PWA manifest and icons are reachable", async ({ page, request }, ti) => {
  await openApp(page, ti, tinyState());
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", /manifest\.json/);
  const mf = await request.get("http://localhost:8123/manifest.json");
  expect(mf.ok()).toBe(true);
  const json = await mf.json();
  expect(json.name).toBeTruthy();
  expect(json.icons?.length).toBeGreaterThan(0);
  for (const icon of json.icons) {
    const r = await request.get(`http://localhost:8123/${icon.src}`);
    expect(r.ok(), `icon ${icon.src} must exist`).toBe(true);
  }
});

test("desktop ≥860px uses a wide multi-column layout", async ({ page }, ti) => {
  const { form } = meta(ti);
  test.skip(form !== "desktop", "desktop layout only");
  await openApp(page, ti, tinyState());
  const bodyW = await page.evaluate(() => document.body.getBoundingClientRect().width);
  expect(bodyW, "desktop body must be wider than the 560px phone column").toBeGreaterThan(700);
  const secDisplay = await page
    .locator(".sec")
    .first()
    .evaluate((el) => getComputedStyle(el).display);
  expect(secDisplay).toBe("grid");
});

test.describe("mobile: no horizontal overflow anywhere", () => {
  test.beforeEach(({}, ti) => {
    test.skip(meta(ti).form !== "mobile", "mobile-only check");
  });

  test("main list with realistic 300-game fixture", async ({ page }, ti) => {
    await openApp(page, ti, makeState(300));
    await expectNoHorizontalOverflow(page);
  });

  test("settings panel open", async ({ page }, ti) => {
    await openApp(page, ti, tinyState());
    await page.locator("#gearBtn").click();
    await expect(page.locator("#syncPanel")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("open card with full action panel", async ({ page }, ti) => {
    await openApp(page, ti, tinyState());
    await openCard(page, "Skyrim Special Edition");
    await expectNoHorizontalOverflow(page);
  });

  test("backlog tab with dicebar and series search", async ({ page }, ti) => {
    await openApp(page, ti, tinyState());
    await page.locator(".tab").nth(2).click();
    await expectNoHorizontalOverflow(page);
    await page.locator(".tab").nth(0).click();
    await page.locator("#search").fill("Final Fantasy");
    await expect(page.locator(".sersum")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
