import { test, expect } from '@playwright/test';

test.describe('Domain Verification Flow', () => {

  test('Valid subdomain redirects to tenant login URL', async ({ page }) => {
    const subdomain = 'demo';
    
    // 1. Mock Success Response
    await page.route('**/rest/v1/hr_organizations*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ subdomain: subdomain }), 
      });
    });

    await page.goto('/');

    // 📸 SCREENSHOT 1: Initial Page Load
    await page.screenshot({ path: 'documentation/screenshots/1-verification-page-empty.png' });

    // 2. Fill Domain
    await page.getByPlaceholder('your-company').fill(subdomain);

    // 3. Wait for Validation Success
    const continueBtn = page.getByRole('button', { name: 'Continue' });
    await expect(continueBtn).toBeEnabled({ timeout: 5000 });
    
    // Wait for the spinner to disappear to get a clean shot
    await expect(page.locator('.animate-spin')).not.toBeVisible();

    // 📸 SCREENSHOT 2: Valid Domain (Green check / Enabled button)
    await page.screenshot({ path: 'documentation/screenshots/2-verification-success.png' });

    // 4. Click & Verify Redirect
    await continueBtn.click();

    try {
      await page.waitForURL(url => url.hostname.includes(subdomain), { timeout: 3000 });
    } catch (e) {
      expect(page.url()).toContain(subdomain);
    }
  });

  test('Invalid subdomain shows error', async ({ page }) => {
    // 1. Mock Failure Response
    await page.route('**/rest/v1/hr_organizations*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'null', 
      });
    });

    await page.goto('/');
    await page.getByPlaceholder('your-company').fill('fake-company');
    
    // 2. Wait for Error Message
    await expect(page.getByText('This domain does not exist')).toBeVisible({ timeout: 5000 });

    // 📸 SCREENSHOT 3: Error State
    await page.screenshot({ path: 'documentation/screenshots/3-verification-error.png' });
  });

});