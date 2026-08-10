// Daily local auto-backup: one snapshot per day, keep 5, rollback with undo.
import { test, expect, openApp, meta, toast } from "./app";
import { tinyState } from "./fixtures";

const PREFIX = "gamelog-bak-";

function todayKey(): string {
  const d = new Date();
  return `${PREFIX}${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

async function backupKeys(page: any): Promise<string[]> {
  return page.evaluate((prefix: string) => {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      if (k.startsWith(prefix) && k !== `${prefix}prerestore`) keys.push(k);
    }
    return keys.sort();
  }, PREFIX);
}

test("first open of the day snapshots state and prunes to 5", async ({ page }, ti) => {
  await openApp(page, ti, tinyState(), {
    beforeGoto: async () => {
      await page.addInitScript((prefix: string) => {
        // six stale snapshots from previous days
        for (let d = 1; d <= 6; d++) {
          localStorage.setItem(
            `${prefix}2026-07-${String(d).padStart(2, "0")}`,
            JSON.stringify({ nextId: 2, games: [{ id: 1, name: "Old", status: "backlog", years: [] }], collapsed: {} })
          );
        }
      }, PREFIX);
    }
  });
  const keys = await backupKeys(page);
  expect(keys).toHaveLength(5);
  expect(keys[keys.length - 1]).toBe(todayKey()); // newest = today
  expect(keys).not.toContain(`${PREFIX}2026-07-01`); // oldest two pruned
  expect(keys).not.toContain(`${PREFIX}2026-07-02`);
  const today = await page.evaluate((k: string) => JSON.parse(localStorage.getItem(k)!), todayKey());
  expect(today.games).toHaveLength(12);

  // second open the same day must not duplicate or overwrite
  await page.reload();
  expect(await backupKeys(page)).toHaveLength(5);
});

test("empty profile is not snapshotted", async ({ page }, ti) => {
  await openApp(page, ti, null);
  expect(await backupKeys(page)).toHaveLength(0);
});

test("rollback restores the snapshot, keeps an undo slot and wins the sync", async ({ page }, ti) => {
  const { tr } = meta(ti);
  await openApp(page, ti, tinyState());
  // mutate state after the snapshot: add a 13th game
  await page.locator("#search").fill("Freshly Added Game");
  await page.locator("#addBtn").click();
  await expect(toast(page)).toContainText("Freshly Added Game");
  await expect(page.locator("#stBacklog")).toHaveText("6");

  page.on("dialog", (d) => d.accept());
  await page.locator("#gearBtn").click();
  await page.locator("#bakSel").selectOption(todayKey());
  await page.locator("#bakRestoreBtn").click();
  await expect(toast(page)).toContainText(tr.bakRolled);
  await expect(page.locator("#stBacklog")).toHaveText("5"); // 12-game snapshot is back

  const after = await page.evaluate(() => ({
    games: JSON.parse(localStorage.getItem("gamelog-v1")!).games.length,
    updatedAt: JSON.parse(localStorage.getItem("gamelog-v1")!).updatedAt,
    pre: JSON.parse(localStorage.getItem("gamelog-bak-prerestore")!).games.length
  }));
  expect(after.games).toBe(12);
  expect(after.pre).toBe(13); // undo point holds the pre-rollback state
  expect(after.updatedAt).toBeGreaterThan(1754700000000); // rollback must win over remote
});
