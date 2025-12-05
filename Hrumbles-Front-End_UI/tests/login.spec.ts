// tests/auth-flow-real.spec.ts
import { test, expect } from '@playwright/test';

const SUBDOMAIN = 'demo';
const BASE_URL = `http://${SUBDOMAIN}.localhost:8081`;
const ROOT_URL = BASE_URL;                    // → http://demo.localhost:8081/
const LOGIN_URL = `${BASE_URL}/login`;

const VALID_USER = {
  email: 'demo@hrumbles.com',
  password: 'Demo@9091',
};

const INACTIVE_USER = {
  email: 'inactive@hrumbles.com',  // ← must exist + status = 'inactive'inactive'
  password: 'Demo@9091',
};

test.describe('Authentication Flow – 100% Real Supabase (No Mocks)', () => {

test('1. Successful login → dashboard → logout → back to root', async ({ page }) => {
  await page.goto(LOGIN_URL);
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();

//   await expect(page).toHaveScreenshot('login-clean.png', { fullPage: true });

  // Login
  await page.getByPlaceholder('john@gmail.com').fill(VALID_USER.email);
  await page.getByPlaceholder('••••••••').fill(VALID_USER.password);
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page).toHaveURL(`${BASE_URL}/dashboard`, { timeout: 15000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000); // let dashboard settle

  // PROOF: User is logged in
  await expect(page.getByRole('heading', { name: /Good (Morning|Afternoon|Evening), Kamesh!/ })).toBeVisible();


  // === RELIABLE LOGOUT USING EXACT CHAKRA SELECTORS ===
  await page.getByRole('button', { name: `${VALID_USER.email}` }).click();
  // OR fallback: click avatar button by position
  // await page.locator('header').getByRole('button').nth(2).click();

  // Click "Logout" — use text + force because it's in portal
  await page.getByText('Logout', { exact: true }).click({ force: true });

  // Should redirect to root (your app behavior)
  await expect(page).toHaveURL(ROOT_URL, { timeout: 10000 });

//   await expect(page).toHaveScreenshot('after-logout-root-page.png', { fullPage: true });

  console.log('Full login → dashboard → logout flow passed!');
});

  test('2. Invalid credentials → real error message', async ({ page }) => {
    await page.goto(LOGIN_URL);

    await page.getByPlaceholder('john@gmail.com').fill('wrong@hrumbles.com');
    await page.getByPlaceholder('••••••••').fill('wrongpass');

    const [response] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/auth/v1/token') && r.status() === 400),
      page.getByRole('button', { name: 'Login' }).click(),
    ]);

    expect(response.status()).toBe(400);

    await expect(page.getByText('Invalid login credentials')).toBeVisible();
    await expect(page).toHaveScreenshot('invalid-credentials-error.png');
    await expect(page).toHaveURL(LOGIN_URL);
  });

  test('3. Inactive user → "Your account is not active"', async ({ page }) => {
    await page.goto(LOGIN_URL);

    await page.getByPlaceholder('john@gmail.com').fill('onboard@gmail.com');
    await page.getByPlaceholder('••••••••').fill('Demo@123');

    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page.getByText('Your account is not active')).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveScreenshot('inactive-user-error.png');
    await expect(page).toHaveURL(LOGIN_URL);
  });

  test('4. Wrong subdomain → shows organization not found', async ({ page }) => {
    await page.goto('http://nonexistent.localhost:8081/login');

    await expect(page.getByText(/organization|domain|not found/i, { timeout: 15000 })).toBeVisible();
    await expect(page).toHaveScreenshot('wrong-subdomain.png', { fullPage: true });
  });

});