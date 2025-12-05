import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // 1. Go to login page
  await page.goto('/login');

  // 2. Fill credentials (CHANGE THESE TO A REAL TEST USER)
  await page.getByPlaceholder('Email address').fill('your-test-email@example.com');
  await page.getByPlaceholder('Password').fill('your-test-password');

  // 3. Click Login
  await page.getByRole('button', { name: /login/i }).click();

  // 4. Wait for dashboard (ensure login success)
  await page.waitForURL('**/dashboard');
  
  // 5. Save the storage state (cookies, localStorage) to reuse in other tests
  await page.context().storageState({ path: authFile });
});