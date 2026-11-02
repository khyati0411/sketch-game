import { test, expect } from '@playwright/test';

test('smoke: app loads and socket connects', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Screwdle');
  await expect(page.getByTestId('conn-status')).toHaveText(/^connected v\d+\.\d+\.\d+$/);
});
