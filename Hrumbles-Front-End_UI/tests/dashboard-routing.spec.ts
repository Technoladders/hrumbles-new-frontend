// tests/dashboard-routing.spec.ts
import { test, expect } from '@playwright/test';
import fs from 'fs';

const SUBDOMAIN = 'demo';
const BASE_URL = `http://${SUBDOMAIN}.localhost:8081`;
const DASHBOARD_URL = `${BASE_URL}/dashboard`;
const FINANCE_URL = `${BASE_URL}/finance`;

const USERS = {
  superadmin_standard: {
    email: 'demo@hrumbles.com',
    password: 'Demo@9091',
    expectedTitle: /Good (Morning|Afternoon|Evening), Kamesh!/,
    shouldSee: 'Hiring Suite Dashboard',
    shouldNotSee: 'Organization SuperAdmin Dashboard',
  },
  superadmin_hiring_suite: {
    email: 'demo@hrumbles.com',
    password: 'Demo@9091',
    shouldSee: 'Hiring Suite Dashboard',
  },
  admin: {
    email: 'onboard@gmail.com',
    password: 'Demo@123',
    shouldSee: 'My Client Analytics',
  },
  employee_recruiter: {
    email: 'rachel@hrumbles.com',
    password: 'Demo@123',
    shouldSee: 'Submission & Onboarding Analytics',
    urlShouldContain: '/dashboard',
  },
  employee_sales: {
    email: 'john@hrumbles.ai',
    password: 'Demo@123',
    shouldSee: 'People',
    urlShouldContain: '/dashboard',
  },
  employee_finance: {
    email: 'Mike@hrumbles.com',
    password: 'Demo@123',
    urlShouldContain: '/finance',
  },
};

// ----------------------------
// Screenshot Helper
// ----------------------------
async function snapshot(page, name) {
  const dir = 'snapshots';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);

  await page.screenshot({
    path: `${dir}/${name}.png`,
    fullPage: true,
  });
}

// ----------------------------
// Login Helper
// ----------------------------
async function login(page, user) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByPlaceholder('john@gmail.com').fill(user.email);
  await page.getByPlaceholder('••••••••').fill(user.password);
  await page.getByRole('button', { name: 'Login' }).click();
}

test.describe('Dashboard Routing – 100% Real Supabase (No Mocks)', () => {
  test.setTimeout(120_000);

  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  // 1. SUPERADMIN STANDARD
  test('1. Org Superadmin → Hiring Suite Dashboard', { timeout: 120_000 }, async ({ page }) => {
    const user = USERS.superadmin_standard;

    await login(page, user);
    await expect(page).toHaveURL(DASHBOARD_URL, { timeout: 90_000 });

    await page.getByRole('heading', { name: user.expectedTitle }).waitFor({ timeout: 60_000 });

    await expect(page.getByText(user.shouldSee)).toBeVisible();
    if (user.shouldNotSee) {
      await expect(page.getByText(user.shouldNotSee)).toBeHidden();
    }

    await snapshot(page, '01-superadmin-hiring-suite');
  });

  // 2. ADMIN
  test('2. Admin → Admin Dashboard', { timeout: 90_000 }, async ({ page }) => {
    const user = USERS.admin;

    await login(page, user);
    await expect(page).toHaveURL(DASHBOARD_URL, { timeout: 60_000 });

    await expect(page.getByText(user.shouldSee)).toBeVisible();

    await snapshot(page, '02-admin-dashboard');
  });

  // 3. RECRUITER EMPLOYEE
  test('3. Employee (Recruiter) → Employee Dashboard', { timeout: 90_000 }, async ({ page }) => {
    const user = USERS.employee_recruiter;

    await login(page, user);
    await expect(page).toHaveURL(new RegExp(user.urlShouldContain!), { timeout: 60_000 });

    await expect(page.getByText(user.shouldSee)).toBeVisible();

    await snapshot(page, '03-recruiter-dashboard');
  });

  // 4. SALES EMPLOYEE
  test('4. Employee (Sales & Marketing) → Dashboard', { timeout: 90_000 }, async ({ page }) => {
    const user = USERS.employee_sales;

    await login(page, user);
    await expect(page).toHaveURL(new RegExp(user.urlShouldContain!), { timeout: 60_000 });

    await expect(page.getByText(user.shouldSee)).toBeVisible();

    await snapshot(page, '04-sales-dashboard');
  });

  // 5. FINANCE EMPLOYEE
  test('5. Employee (Finance) → Finance Dashboard', { timeout: 90_000 }, async ({ page }) => {
    const user = USERS.employee_finance;

    await login(page, user);
    await expect(page).toHaveURL(FINANCE_URL, { timeout: 60_000 });

    await expect(page.getByText('Finance')).toBeVisible();

    await snapshot(page, '05-finance-dashboard');
  });

  // 6. HIRING SUITE SUPERADMIN
  test('6. Hiring Suite Superadmin → Hiring Suite Dashboard', { timeout: 90_000 }, async ({ page }) => {
    const user = USERS.superadmin_hiring_suite;

    await login(page, user);

    await expect(page).toHaveURL(DASHBOARD_URL, { timeout: 60_000 });
    await expect(page.getByText(user.shouldSee)).toBeVisible();

    await snapshot(page, '06-hiring-suite-superadmin');
  });
});
