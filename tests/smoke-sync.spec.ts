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

test("sync failure degrades to offline label, data stays local", async ({ page }, ti) => {
  allowConsole(page, /Failed to load resource/); // aborted mock request is the point
  await openApp(page, ti, tinyState(), {
    syncCfg: { token: "test-token", gist: GIST }
    // no specific route → api.github.com aborts
  });
  await expect(page.locator("#fstatus")).toHaveClass(/err/);
  await expect(page.locator("#stDone")).toHaveText("5"); // local data intact
});
