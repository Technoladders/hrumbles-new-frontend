import { test, expect } from '@playwright/test';

const SUBDOMAIN = 'demo';
const BASE_URL = `http://${SUBDOMAIN}.localhost:8081`;

// Using the same users from your routing test
const USERS = {
  superadmin: { email: 'demo@hrumbles.com', password: 'Demo@9091' }, // Hiring Suite + Project Suite
  admin_hr:   { email: 'onboard@gmail.com', password: 'Demo@123' },  // HR Suite (Categorized)
  recruiter:  { email: 'rachel@hrumbles.com', password: 'Demo@123' }, // Flat List (HR items)
  sales:      { email: 'john@hrumbles.ai', password: 'Demo@123' },    // Flat List (Sales items)
  finance:    { email: 'Mike@hrumbles.com', password: 'Demo@123' },   // Flat List (Finance Only)
};

// --- Helper to login ---
async function login(page, user) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByPlaceholder('john@gmail.com').fill(user.email);
  await page.getByPlaceholder('••••••••').fill(user.password);
  await page.getByRole('button', { name: 'Login' }).click();
  // Wait for sidebar to load
//   await expect(page.locator('nav').first().or(page.getByRole('link', { name: 'Dashboard' }))).toBeVisible();
}

test.describe('Sidebar Navigation & Role Access', () => {
  
  // Clear cookies to ensure fresh login for every test
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  // 1. ORGANIZATION SUPERADMIN (Categorized View)
  test('1. Superadmin sees Suite Icons (Hiring, Project, Verification)', async ({ page }) => {
    await login(page, USERS.superadmin);

    // 1. Verify Suite Icons exist at the bottom of sidebar
    // Your code uses aria-label on the IconButton matching the suite title
    await expect(page.getByRole('button', { name: 'Hiring suite' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Project suite' })).toBeVisible();

    // 2. Click Hiring Suite and check menu items
    await page.getByRole('button', { name: 'Hiring suite' }).click();
    await expect(page.getByRole('link', { name: 'Employees' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Jobs' })).toBeVisible();

    // 3. Click Project Suite and verify change
    await page.getByRole('button', { name: 'Project suite' }).click();
    await expect(page.getByRole('link', { name: 'Clients' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Projects' })).toBeVisible();
    
    // Ensure HR items are GONE when in Project Suite
    await expect(page.getByRole('link', { name: 'Talent Pool' })).toBeHidden();
  });

  // 2. ADMIN (Categorized View)
  test('2. Admin (HR Dept) sees HR Suite', async ({ page }) => {
    await login(page, USERS.admin_hr);

    // Admin menu logic is categorized
    await expect(page.getByRole('button', { name: 'Hr suite' })).toBeVisible();
    
    // Should see Admin specific items
    await page.getByRole('button', { name: 'Hr suite' }).click();
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible(); // Admin only
    await expect(page.getByRole('link', { name: 'User Management' })).toBeHidden(); // Usually superadmin only (unless in your list)
  });

  // 3. EMPLOYEE - RECRUITER (Flat View)
  test('3. Recruiter sees Flat Menu with HR items', async ({ page }) => {
    await login(page, USERS.recruiter);

    // 1. Verify NO Suite Icons (Flat view)
    // The HStack containing suites shouldn't exist or should be empty
    await expect(page.getByRole('button', { name: 'Hiring suite' })).toBeHidden();

    // 2. Verify HR Specific Items exist directly
    await expect(page.getByRole('link', { name: 'Jobs' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Talent Pool' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'My Submission' })).toBeVisible();

    // 3. Verify Sales items are missing
    await expect(page.getByRole('link', { name: 'Companies' })).toBeHidden();
  });

  // 4. EMPLOYEE - SALES (Flat View)
  test('4. Sales Employee sees Flat Menu with Sales items', async ({ page }) => {
    await login(page, USERS.sales);

    // 1. Verify Sales Items
    await expect(page.getByRole('link', { name: 'Companies' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'People' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Kanban' })).toBeVisible();

    // 2. Verify HR items are missing
    await expect(page.getByRole('link', { name: 'Talent Pool' })).toBeHidden();
  });

  // 5. EMPLOYEE - FINANCE (Restricted View)
  test('5. Finance Employee sees Restricted Menu', async ({ page }) => {
    await login(page, USERS.finance);

    // 1. Should see Finance items
    await expect(page.getByRole('link', { name: 'Finance' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Invoices' })).toBeVisible();

    // 2. Should NOT see Dashboard or standard items (based on your code return [ ... ])
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeHidden();
    await expect(page.getByRole('link', { name: 'Time Sheet' })).toBeHidden();
  });

  // 6. SIDEBAR TOGGLE
  test('6. Sidebar Collapse/Expand works', async ({ page }) => {
    await login(page, USERS.superadmin);

    // Initial State: Expanded (Width ~210px)
    const sidebar = page.locator('div').filter({ hasText: /^Dashboard$/ }).first().locator('..'); // Approximate selection
    // Better strategy: check for text visibility
    await expect(page.getByText('Dashboard', { exact: true })).toBeVisible();

    // Click Toggle Button (ArrowLeftToLine icon)
    await page.getByLabel('Toggle Sidebar').click();

    // State: Collapsed
    // Text should be hidden or width changed. 
    // In Chakra Collapse/Width transition, text might technically be in DOM but hidden via overflow/width.
    // We check if the Logo changed (Your code swaps the logo on collapse)
    
    // Look for small logo
    await expect(page.locator('img[src="/hrumbles-fav-blue-cropped.svg"]')).toBeVisible();
    // Big logo hidden
    await expect(page.locator('img[src="/1-cropped.svg"]')).toBeHidden();

    // Click Toggle to Expand
    await page.getByLabel('Toggle Sidebar').click();
    await expect(page.locator('img[src="/1-cropped.svg"]')).toBeVisible();
  });

});