import { test, expect } from '@playwright/test';
import fs from 'fs';

// ----------------------------
// Screenshot Helper
// ----------------------------
async function snapshot(page, name) {
  const dir = 'snapshots/email-config';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  await page.screenshot({
    path: `${dir}/${name}.png`,
    fullPage: true,
  });
}

test.describe('Automated Email Configuration Flow', () => {

  // Before every test, navigate to the organization/user management page 
  // (Adjust the URL to match where EnhancedUserManagement.tsx is routed in your app)
  test.beforeEach(async ({ page }) => {
    // Assuming standard login is handled or session is active
    await page.goto('/settings/organization'); // Adjust this URL to your actual route
  });

  test('Configure exact minute scheduling and recruiter copy for Daily Report', async ({ page }) => {
    
    // 1. Navigate to Email Config Tab in EnhancedUserManagement
    await page.getByRole('tab', { name: /Email Config/i }).click();
    await expect(page.getByText('Automated Recruiter Reports')).toBeVisible();

    // 📸 SCREENSHOT 1: Tab Opened
    await snapshot(page, '1-email-config-tab-loaded');

    // 2. Select the "Daily" Sub-Tab
    await page.getByRole('tab', { name: /Daily/i }).click();

    // 3. Toggle "Enable Automatic Sending"
    // Since Radix UI switches don't always have aria-labels mapped perfectly unless explicitly set,
    // we find the switch physically near the "Enable Automatic Sending" text
    const enableSwitch = page.locator('div').filter({ hasText: /^Enable Automatic Sending/ }).getByRole('switch');
    
    // If it's not checked, check it to reveal the settings
    const isChecked = await enableSwitch.getAttribute('aria-checked');
    if (isChecked === 'false') {
      await enableSwitch.click();
    }

    // 4. Verify 15-minute Time Intervals are generated and select 12:15
    // Find the Time Dropdown Trigger (combobox)
    const timeDropdown = page.locator('div').filter({ hasText: 'Send Time (IST)' }).getByRole('combobox');
    await timeDropdown.click();

    // Assert that standard 15-minute interval options exist in the DOM
    await expect(page.getByRole('option', { name: '00:00' })).toBeVisible();
    await expect(page.getByRole('option', { name: '12:15' })).toBeVisible();
    await expect(page.getByRole('option', { name: '23:45' })).toBeVisible();

    // Click exactly "12:15"
    await page.getByRole('option', { name: '12:15' }).click();

    // 5. Toggle "Send individual copies to Recruiters"
    const recruiterCopySwitchLabel = page.locator('label').filter({ hasText: /Send individual copies to Recruiters/i });
    // Click the label to toggle the switch
    await recruiterCopySwitchLabel.click();

    // 📸 SCREENSHOT 2: Settings Configured
    await snapshot(page, '2-daily-report-settings-configured');

    // 6. Setup Network Interceptor to verify the Payload
    const requestPromise = page.waitForRequest(req => 
      req.url().includes('/rest/v1/hr_email_configurations') && 
      (req.method() === 'POST' || req.method() === 'PATCH' || req.method() === 'PUT')
    );

    // 7. Click Save Automation Settings
    await page.getByRole('button', { name: 'Save Automation Settings' }).click();

    // 8. Verify the Success Toast
    await expect(page.getByText('Automated report settings saved.')).toBeVisible();

    // 9. Validate the Database Payload (Ensure exact time and recruiter copy are sent)
    const request = await requestPromise;
    const postData = JSON.parse(request.postDataJSON() || '[]');
    
    console.log('Saved Payload:', JSON.stringify(postData, null, 2));

    // Assuming the payload is an array of configs (Upsert logic)
    const dailyConfig = postData.find((conf: any) => conf.report_type === 'daily_recruiter_report');
    
    expect(dailyConfig).toBeDefined();
    expect(dailyConfig.config.sendTime).toBe('12:15');
    expect(dailyConfig.config.sendToRecruiters).toBe(true);
    expect(dailyConfig.is_active).toBe(true);

    // 📸 SCREENSHOT 3: Success State
    await snapshot(page, '3-email-config-saved-successfully');
  });
});