import { test, expect } from '@playwright/test';
import { createRoom, joinRoom, openInvite, playerNames, startGame } from './helpers';

test('TC-001 host creates a room and lands in its lobby with an invite link', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const invite = await createRoom(page, 'Khyati');
  expect(await playerNames(page)).toEqual(['Khyati']);
  await expect(page.getByTestId('player-list').getByTestId('host-badge')).toHaveCount(1);
  await expect(page.getByTestId('copy-link')).toBeVisible();
  await page.getByTestId('copy-link').click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(invite);
});

test('TC-003 player joins from the invite link and everyone sees them arrive', async ({ page, browser }) => {
  const invite = await createRoom(page, 'Khyati');
  const maya = await joinRoom(browser, invite, 'Maya');
  expect(await playerNames(maya)).toEqual(['Khyati', 'Maya']);
  await expect.poll(() => playerNames(page)).toEqual(['Khyati', 'Maya']);
});

test('TC-004 join is refused for an empty or duplicate nickname', async ({ page, browser }) => {
  const invite = await createRoom(page, 'Sam');
  const guest = await (await browser.newContext()).newPage();
  await openInvite(guest, invite);
  const error = guest.getByTestId('join-error');

  await guest.getByTestId('join-room').click();
  await expect(error).toHaveText('Please enter a nickname');

  await guest.getByTestId('nickname').fill('Sam');
  await guest.getByTestId('join-room').click();
  await expect(error).toHaveText('Sam is taken, choose another nickname');

  await guest.getByTestId('nickname').fill('sam ');
  await guest.getByTestId('join-room').click();
  await expect(error).toHaveText('sam is taken, choose another nickname');

  await guest.getByTestId('nickname').fill('x'.repeat(21));
  await expect(guest.getByTestId('nickname')).toHaveValue('x'.repeat(20));
});

test('TC-005 full and unknown rooms are refused with a clear message', async ({ page, browser }) => {
  const invite = await createRoom(page, 'P1');
  for (let i = 2; i <= 8; i++) await joinRoom(browser, invite, `P${i}`);

  const ninth = await (await browser.newContext()).newPage();
  await openInvite(ninth, invite);
  await ninth.getByTestId('nickname').fill('P9');
  await ninth.getByTestId('join-room').click();
  await expect(ninth.getByTestId('join-error')).toHaveText('This room is full');
  await expect(ninth.getByTestId('player-list')).toHaveCount(0);

  const lost = await (await browser.newContext()).newPage();
  await lost.goto('/r/ZZZZZZ');
  await lost.getByTestId('nickname').fill('Lost');
  await lost.getByTestId('join-room').click();
  await expect(lost.getByTestId('join-error')).toHaveText('Room not found');
  await lost.getByTestId('create-room').click();
  await expect(lost.getByTestId('invite-link')).toHaveValue(/\/r\/[A-Z]{6}$/);
});

test('TC-006 lobby list updates live and marks the host and colors', async ({ page, browser }) => {
  const invite = await createRoom(page, 'Khyati');
  const maya = await joinRoom(browser, invite, 'Maya');
  const arjun = await joinRoom(browser, invite, 'Arjun');
  for (const p of [page, maya]) await expect.poll(() => playerNames(p), { timeout: 1000 }).toEqual(['Khyati', 'Maya', 'Arjun']);

  await arjun.context().close();
  for (const p of [page, maya]) await expect.poll(() => playerNames(p), { timeout: 1000 }).toEqual(['Khyati', 'Maya']);

  const rows = page.getByTestId('player-list').getByTestId('player');
  await expect(rows.nth(0).getByTestId('host-badge')).toBeVisible();
  await expect(rows.nth(1).getByTestId('host-badge')).toHaveCount(0);
  const colors = await rows.getByTestId('player-color').evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundColor));
  expect(new Set(colors).size).toBe(2);
});

test('TC-007 host starts the game for everyone at once', async ({ page, browser }) => {
  const invite = await createRoom(page, 'Khyati');
  const maya = await joinRoom(browser, invite, 'Maya');
  await expect(page.getByTestId('start-game')).toBeEnabled();
  await startGame(page, [maya]);
});

test('TC-008 start is disabled alone and not offered to guests', async ({ page, browser }) => {
  const invite = await createRoom(page, 'Khyati');
  await expect(page.getByTestId('start-game')).toBeDisabled();
  await expect(page.getByTestId('lobby-hint')).toHaveText('At least 2 players are needed');

  const maya = await joinRoom(browser, invite, 'Maya');
  await expect(maya.getByTestId('start-game')).toHaveCount(0);
  await expect(maya.getByTestId('lobby-hint')).toHaveText('Waiting for the host to start');
});

test('a player whose connection drops is told and can join again', async ({ page, browser }) => {
  const invite = await createRoom(page, 'Khyati');
  const maya = await joinRoom(browser, invite, 'Maya');
  await maya.context().setOffline(true);
  await expect(maya.getByTestId('join-error')).toHaveText(/disconnected/i, { timeout: 20_000 });
  await expect(maya.getByTestId('join-room')).toBeVisible();
  await expect.poll(() => playerNames(page), { timeout: 20_000 }).toEqual(['Khyati']);
  await maya.context().setOffline(false);
  await maya.getByTestId('nickname').fill('Maya');
  await maya.getByTestId('join-room').click();
  await expect.poll(() => playerNames(page)).toEqual(['Khyati', 'Maya']);
});
