import { test, expect } from './fixtures';

test.beforeEach(async ({ page }) => {
  // Pretend the guide was already seen so it doesn't cover the lobby.
  await page.addInitScript(() => localStorage.setItem('wtp-guide-seen', '1'));
});

test('one-phone game: set up, memorize, draw, skip and reach the reveal', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play on one phone' }).click();

  // Two players start in the list; "Next" stays disabled until both are named.
  await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
  await page.getByRole('textbox', { name: 'Player 1 name' }).fill('Ash');
  await page.getByRole('textbox', { name: 'Player 2 name' }).fill('Misty');
  await page.getByRole('button', { name: 'Next' }).click();

  await expect(page.getByRole('heading', { name: 'Battle settings' })).toBeVisible();
  await page.getByRole('button', { name: 'Start battle!' }).click();

  // Hand-off, then the drawer memorizes.
  await expect(page.getByText("Ash's turn to draw!")).toBeVisible();
  await page.getByRole('button', { name: /show me/ }).click();
  await expect(page.getByRole('heading', { name: 'Memorize this Pokémon!' })).toBeVisible();
  await expect(page.getByRole('timer')).toBeVisible();
  await page.getByRole('button', { name: /start drawing/ }).click();

  // Drawing: one stroke on the canvas with the mouse.
  const canvas = page.getByRole('img', { name: 'Drawing canvas' });
  await expect(canvas).toBeVisible();
  const undo = page.getByRole('button', { name: 'Undo' });
  await expect(undo).toBeDisabled();
  const box = (await canvas.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x - 40, y - 20);
  await page.mouse.down();
  await page.mouse.move(x, y + 20, { steps: 8 });
  await page.mouse.move(x + 40, y - 20, { steps: 8 });
  await page.mouse.up();
  await expect(undo).toBeEnabled();

  // Give up on the round.
  await page.getByRole('button', { name: 'Skip' }).click();
  await expect(page.getByRole('heading', { name: 'Skipped' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Scores' })).toBeVisible();
});
