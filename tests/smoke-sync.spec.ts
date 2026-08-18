// §9 smoke: Gist sync (mocked). Real network is never touched.
import { test, expect, openApp, meta, allowConsole } from "./app";
import { tinyState, State } from "./fixtures";

const GIST = "TESTGIST123";

function remoteState(updatedAt: number): State {
  return {
    nextId: 4,
    updatedAt,
    games: [
      { id: 1, name: "Remote Alpha", status: "playing", years: [] },
      { id: 2, name: "Remote Beta", status: "backlog", years: [] },
      { id: 3, name: "Remote Gamma", status: "done", years: [2025] }
    ] as any,
    collapsed: {}
  };
}

test("connect via settings pulls newer remote state", async ({ page }, ti) => {
  const { tr } = meta(ti);
  await openApp(page, ti, tinyState(), {
    beforeGoto: async () => {
      await page.route(`https://api.github.com/gists/${GIST}`, (route) =>
        route.fulfill({
          status: 200,
          json: {
            files: {
              "game-log.json": { content: JSON.stringify(remoteState(9999999999999)) }
            }
          }
        })
      );
    }
  });
  await page.locator("#gearBtn").click();
  // not connected → the spoiler opens itself, fields are right there
  await expect(page.locator("#syncBody")).toBeVisible();
  await page.locator("#ghToken").fill("test-token");
  await page.locator("#ghGist").fill(GIST);
  await page.locator("#syncConnect").click();
  await expect(page.locator("#stPlaying")).toHaveText("1");
  await expect(page.locator("#stBacklog")).toHaveText("1");
  await expect(page.locator("#stDone")).toHaveText("1");
  await expect(page.locator(".card", { hasText: "Remote Alpha" }).first()).toBeVisible();
  await expect(page.locator("#fstatus")).toContainText(`gist · ${tr.sync}`);
});

test("older remote gets our push; opening app does not bump updatedAt", async ({ page }, ti) => {
  const local = tinyState(); // updatedAt = 1754700000000
  let patchBody: any = null;
  await openApp(page, ti, local, {
    syncCfg: { token: "test-token", gist: GIST },
    beforeGoto: async () => {
      await page.route(`https://api.github.com/gists/${GIST}`, (route) => {
        if (route.request().method() === "PATCH") {
          patchBody = route.request().postDataJSON();
          return route.fulfill({ status: 200, json: {} });
        }
        return route.fulfill({
          status: 200,
          json: {
            files: { "game-log.json": { content: JSON.stringify(remoteState(1)) } }
          }
        });
      });
    }
  });
  await expect
    .poll(() => patchBody, { message: "PATCH must be sent when local is newer" })
    .not.toBeNull();
  const pushed = JSON.parse(patchBody.files["game-log.json"].content);
  expect(pushed.games).toHaveLength(12);
  // opening the app must NOT bump updatedAt (§3)
  expect(pushed.updatedAt).toBe(1754700000000);
});

test("Apps Script (Drive) sync connects and pulls newer state", async ({ page }, ti) => {
  const { tr } = meta(ti);
  const gsUrl = "https://script.google.com/macros/s/TESTDEPLOY/exec";
  let putBody: string | null = null;
  await openApp(page, ti, tinyState(), {
    beforeGoto: async () => {
      await page.route(`${gsUrl}*`, (route) => {
        if (route.request().method() === "POST") {
          putBody = route.request().postData();
          return route.fulfill({ status: 200, body: "ok" });
        }
        return route.fulfill({
          status: 200,
          body: JSON.stringify(remoteState(9999999999999))
        });
      });
    }
  });
  await page.locator("#gearBtn").click();
  await expect(page.locator("#syncBody")).toBeVisible();
  await page.locator("#gsUrl").fill(gsUrl);
  await page.locator("#syncConnect").click();
  await expect(page.locator("#stPlaying")).toHaveText("1");
  await expect(page.locator(".card", { hasText: "Remote Alpha" }).first()).toBeVisible();
  await expect(page.locator("#fstatus")).toContainText(`drive · ${tr.sync}`);
  // a local edit pushes back over POST
  await page.locator(".card", { hasText: "Remote Alpha" }).first().locator(".name").click();
  await page.locator(`.card.open button[data-act="fav"]`).click();
  await expect.poll(() => putBody, { timeout: 8000 }).not.toBeNull();
  expect(JSON.parse(putBody!).games.some((g: any) => g.name === "Remote Alpha")).toBe(true);
});

test("sync spoiler auto-opens while not connected; manual toggle still works", async ({ page }, ti) => {
  await openApp(page, ti, tinyState());
  await page.locator("#gearBtn").click();
  await expect(page.locator("#syncBody")).toBeVisible();
  await expect(page.locator("#syncSpoiler")).toHaveAttribute("aria-expanded", "true");
  await page.locator("#syncSpoiler").click();
  await expect(page.locator("#syncBody")).toBeHidden();
  await page.locator("#syncSpoiler").click();
  await expect(page.locator("#syncBody")).toBeVisible();
});

test("sync spoiler stays collapsed when already connected", async ({ page }, ti) => {
  await openApp(page, ti, tinyState(), {
    syncCfg: { token: "test-token", gist: GIST },
    beforeGoto: async () => {
      // remote equals local (same updatedAt) → pull just refreshes the status line
      await page.route(`https://api.github.com/gists/${GIST}`, (route) =>
        route.fulfill({
          status: 200,
          json: { files: { "game-log.json": { content: JSON.stringify(tinyState()) } } }
        })
      );
    }
  });
  await page.locator("#gearBtn").click();
  await expect(page.locator("#settingsWin")).toBeVisible();
  await expect(page.locator("#syncBody")).toBeHidden();
  await expect(page.locator("#syncSpoiler")).toHaveAttribute("aria-expanded", "false");
  await page.locator("#syncSpoiler").click(); // still reachable by hand
  await expect(page.locator("#syncBody")).toBeVisible();
});

test("sync failure degrades to offline label, data stays local", async ({ page }, ti) => {
  allowConsole(page, /Failed to load resource/); // aborted mock request is the point
  await openApp(page, ti, tinyState(), {
    syncCfg: { token: "test-token", gist: GIST }
    // no specific route → api.github.com aborts
  });
  await expect(page.locator("#fstatus")).toHaveClass(/err/);
  await expect(page.locator("#stDone")).toHaveText("5"); // local data intact
});
