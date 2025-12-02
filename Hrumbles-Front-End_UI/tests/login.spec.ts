// tests/login.spec.ts
import { test, expect } from '@playwright/test';

const SUBDOMAIN = 'demo';
const BASE_URL = `http://${SUBDOMAIN}.localhost:8081`;

test.describe('Login Page Flow', () => {
  test.beforeEach(async ({ page }) => {
    // 1. MOCK ORGANIZATION LOOKUP (happens immediately on LoginPage mount)
    await page.route('**/rest/v1/hr_organizations?subdomain=eq.**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'org-123',
          name: 'Demo Org',
          subdomain: SUBDOMAIN,
        }),
      });
    });

    // 2. MOCK ALL OTHER hr_organizations calls (fallback)
    await page.route('**/rest/v1/hr_organizations**', async (route) => {
      await route.fulfill({ status: 404, body: '[]' });
    });

    // 3. Go directly to login (subdomain already set)
    await page.goto(`${BASE_URL}/login`);

    // Wait for page to be ready
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
  });

  test('Successful login redirects to dashboard', async ({ page }) => {
    // 1. Mock Auth Login
    await page.route('**/auth/v1/token**', route => route.fulfill({
      status: 200,
      json: {
        access_token: 'fake-jwt',
        refresh_token: 'fake-refresh',
        expires_in: 3600,
        user: {
          id: 'user-123',
          email: 'demo@hrumbles.com',
          aud: 'authenticated',
          role: 'authenticated',
        },
        session: { user: { id: 'user-123' } }
      }
    }));

    // 2. Mock User Profile
    await page.route('**/rest/v1/hr_employees?id=eq.user-123**', route => route.fulfill({
      json: {
        id: 'user-123',
        organization_id: 'org-123',
        role_id: 'role-admin',
        department_id: 'dept-eng',
        status: 'active',
        first_name: 'John',
        last_name: 'Doe',
      }
    }));

    // 3. Mock Role & Department names
    await page.route('**/rest/v1/hr_roles**', route => route.fulfill({ json: { name: 'admin' } }));
    await page.route('**/rest/v1/hr_departments**', route => route.fulfill({ json: { name: 'Engineering' } }));

    // 4. MOCK fetchUserSession() — THIS IS THE KILLER ONE
    await page.route('**/auth/v1/user', route => route.fulfill({
      json: { id: 'user-123', email: 'john@gmail.com' }
    }));

    await page.route('**/rest/v1/hr_employees?select=*&id=eq.user-123**', route => route.fulfill({
      json: [{
        role_id: 'role-admin',
        organization_id: 'org-123'
      }]
    }));

    await page.route('**/rest/v1/hr_roles?id=eq.role-admin**', route => route.fulfill({
      json: [{ name: 'admin' }]
    }));

    await page.route('**/rest/v1/hr_role_permissions**', route => route.fulfill({ json: [] }));
    await page.route('**/rest/v1/hr_permissions**', route => route.fulfill({ json: [] }));

    // 5. Fill and submit
    await page.getByPlaceholder('john@gmail.com').fill('john@gmail.com');
    await page.getByPlaceholder('••••••••').fill('Demo@9091');
    await page.getByRole('button', { name: 'Login' }).click();

    // SUCCESS: Should redirect
    await expect(page).toHaveURL(`${BASE_URL}/dashboard`, { timeout: 10000 });
  });

  test('Inactive user sees error', async ({ page }) => {
    await page.route('**/auth/v1/token**', route => route.fulfill({
      json: {
        access_token: 'fake',
        user: { id: 'user-inactive', email: 'inactive@gmail.com' }
      }
    }));

    await page.route('**/rest/v1/hr_employees?id=eq.user-inactive**', route => route.fulfill({
      json: {
        status: 'inactive',
        organization_id: 'org-123'
      }
    }));

    await page.getByPlaceholder('john@gmail.com').fill('inactive@gmail.com');
    await page.getByPlaceholder('••••••••').fill('secret123');
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page.getByText('Your account is not active')).toBeVisible();
    await expect(page).toHaveURL(`${BASE_URL}/login`);
  });

  test('Invalid credentials show error', async ({ page }) => {
    await page.route('**/auth/v1/token**', route => route.fulfill({
      status: 400,
      json: {
        error: 'invalid_grant',
        error_description: 'Invalid login credentials'
      }
    }));

    await page.getByPlaceholder('john@gmail.com').fill('wrong@gmail.com');
    await page.getByPlaceholder('••••••••').fill('wrongpass');
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page.getByText('Invalid login credentials')).toBeVisible();
  });
});