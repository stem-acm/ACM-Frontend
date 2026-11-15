import { expect, test } from './fixtures/test';

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`Settings is directly accessible beside the profile at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const navbar = page.getByRole('navigation', { name: 'Main navigation' });
    const settings = navbar.getByRole('link', { name: 'Settings', exact: true });
    await expect(settings).toBeVisible();
    await expect(settings).toHaveAttribute('href', '/setting');
    await expect(settings.locator('svg')).toBeVisible();
    await navbar.getByRole('button', { name: 'Open user menu' }).click();
    await expect(page.locator('#user-dropdown')).toBeVisible();
    await expect(
      page.locator('#user-dropdown').getByRole('link', { name: 'Settings' }),
    ).toHaveCount(0);
    await settings.click();
    await expect(page).toHaveURL(/\/setting$/);
    await expect(page.locator('#user-dropdown')).toHaveCount(0);
  });
}
