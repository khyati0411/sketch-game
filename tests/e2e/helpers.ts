import { expect, type Browser, type Page } from '@playwright/test';

/** Creates a room as `name` and returns its invite link. */
export async function createRoom(page: Page, name: string): Promise<string> {
  await page.goto('/');
  await page.getByTestId('nickname').fill(name);
  await page.getByTestId('create-room').click();
  const invite = page.getByTestId('invite-link');
  await expect(invite).toHaveValue(/\/r\/[A-Z]{6}$/);
  return invite.inputValue();
}

/** Opens the invite link's path on this test server, so tests never depend on the LAN address. */
export async function openInvite(page: Page, inviteUrl: string): Promise<void> {
  await page.goto(new URL(inviteUrl).pathname);
}

/** A new player in their own browser context who joins from the invite link. */
export async function joinRoom(browser: Browser, inviteUrl: string, name: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await openInvite(page, inviteUrl);
  await page.getByTestId('nickname').fill(name);
  await page.getByTestId('join-room').click();
  await expect(page.getByTestId('player-list')).toBeVisible();
  return page;
}

/** Host starts the game; resolves when every page shows the canvas. */
export async function startGame(host: Page, others: Page[]): Promise<void> {
  await host.getByTestId('start-game').click();
  for (const p of [host, ...others]) await expect(p.getByTestId('canvas')).toBeVisible();
}

/** Names in a page's player list, in order. */
export const playerNames = (page: Page) => page.getByTestId('player-list').getByTestId('player-name').allInnerTexts();
