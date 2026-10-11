import { test, expect } from './fixtures';

test('home page loads and the how-to-play guide shows on the first visit', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Who's That Pokémon/);

  const guide = page.getByRole('dialog', { name: 'Draw it from memory' });
  await expect(guide).toBeVisible();

  await guide.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByRole('dialog', { name: 'Guess who it is' })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Choose mode' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play on one phone' })).toBeVisible();

  // Dismissing is remembered.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Choose mode' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('the guide can be skipped and reopened from settings', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('dialog').getByRole('button', { name: 'Skip' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'How to play' }).click();
  await expect(page.getByRole('dialog', { name: 'Draw it from memory' })).toBeVisible();
});
