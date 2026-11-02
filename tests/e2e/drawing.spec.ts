import { test, expect, devices, type Page } from '@playwright/test';
import { createRoom, joinRoom, startGame } from './helpers';

/** Number of non-white pixels on a player's canvas. */
const inkPixels = (page: Page) =>
  page.getByTestId('canvas').evaluate((el) => {
    const c = el as HTMLCanvasElement;
    const { data } = c.getContext('2d')!.getImageData(0, 0, c.width, c.height);
    let ink = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i] < 240 || data[i + 1] < 240 || data[i + 2] < 240) ink++;
    return ink;
  });

async function canvasBox(page: Page) {
  const box = await page.getByTestId('canvas').boundingBox();
  if (!box) throw new Error('canvas not visible');
  return box;
}

test('TC-009 strokes appear on guessers\' canvases while they are drawn', async ({ page, browser }) => {
  const invite = await createRoom(page, 'Arjun');
  const g1 = await joinRoom(browser, invite, 'Maya');
  const g2 = await joinRoom(browser, invite, 'Priya');
  await startGame(page, [g1, g2]);

  const box = await canvasBox(page);
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * 0.1, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, y, { steps: 15 });
  expect(await inkPixels(page)).toBeGreaterThan(0);
  // The pen is still down: guessers must already see the partial line.
  for (const g of [g1, g2]) await expect.poll(() => inkPixels(g), { timeout: 1000 }).toBeGreaterThan(0);
  await page.waitForTimeout(200); // let the first half's last batch land
  const partial = [await inkPixels(g1), await inkPixels(g2)];

  await page.mouse.move(box.x + box.width * 0.9, y, { steps: 15 });
  await page.mouse.up();
  await expect.poll(() => inkPixels(g1)).toBeGreaterThan(partial[0]);
  await expect.poll(() => inkPixels(g2)).toBeGreaterThan(partial[1]);
});

test('TC-010 guessers cannot draw', async ({ page, browser }) => {
  const invite = await createRoom(page, 'Arjun');
  const g1 = await joinRoom(browser, invite, 'Maya');
  const g2 = await joinRoom(browser, invite, 'Priya');
  await startGame(page, [g1, g2]);

  const box = await canvasBox(g1);
  await g1.mouse.move(box.x + 20, box.y + 20);
  await g1.mouse.down();
  await g1.mouse.move(box.x + box.width - 20, box.y + box.height - 20, { steps: 15 });
  await g1.mouse.up();
  await g1.waitForTimeout(300);
  for (const p of [g1, page, g2]) expect(await inkPixels(p)).toBe(0);
});

test('TC-012 drawing with touch input works', async ({ browser }) => {
  const phone = await (await browser.newContext({ ...devices['Pixel 7'] })).newPage();
  const invite = await createRoom(phone, 'Arjun');
  const guesser = await joinRoom(browser, invite, 'Maya');
  await startGame(phone, [guesser]);

  // A real touch gesture through the DevTools protocol, so the page sees touch pointer events.
  const box = await canvasBox(phone);
  const cdp = await phone.context().newCDPSession(phone);
  const y = box.y + box.height / 2;
  const touch = (type: string, x: number) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  await touch('touchStart', box.x + 20);
  for (let i = 1; i <= 15; i++) await touch('touchMove', box.x + 20 + ((box.width - 40) * i) / 15);
  await touch('touchEnd', 0);

  await expect.poll(() => inkPixels(phone)).toBeGreaterThan(0);
  await expect.poll(() => inkPixels(guesser)).toBeGreaterThan(0);
});
