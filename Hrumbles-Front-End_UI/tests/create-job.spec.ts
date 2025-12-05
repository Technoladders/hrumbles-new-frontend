import { test, expect } from '@playwright/test';

test.describe('Job Creation Flow', () => {

  // Before every test, go to the jobs page
  test.beforeEach(async ({ page }) => {
    await page.goto('/jobs');
  });

  test('Create External Job successfully', async ({ page }) => {
    // 1. Open the Modal
    // Note: Adjust the selector if your "Create New Job" button has different text
    await page.getByRole('button', { name: 'Create New Job' }).click();

    // 2. Select "External"
    // Playwright sees the real UI, so we click the external card
    await page.getByRole('button', { name: /External/i }).click();

    // --- STEP 1: JOB DETAILS ---
    
    // 3. Select Client (Radix UI)
    // Click the trigger (Labelled "Client Name")
    await page.getByRole('combobox', { name: /Client Name/i }).click();
    // Select the first option in the list
    await page.getByRole('option').first().click();

    // 4. Fill Budget
    await page.getByLabel('Client Budget').fill('20');

    // 5. Fill Job Info
    await page.getByLabel('Job Title').fill('Playwright Automation Engineer');
    await page.getByLabel('Job ID').fill('PW-TEST-001');

    // 6. Select Hiring Mode
    await page.getByRole('combobox', { name: /Hiring Mode/i }).click();
    await page.getByRole('option', { name: 'Full-Time' }).click();

    // 7. Fill Location (Real interaction!)
    // Assuming LocationSelector has an input field
    const locationInput = page.getByPlaceholder('Select Location'); 
    // If your placeholder is different, inspect element and copy the placeholder
    await locationInput.fill('Bangalore');
    await page.keyboard.press('Enter'); // Press enter to select if it's a tag input

    // 8. Go Next
    await page.getByRole('button', { name: 'Next Step' }).click();

    // --- STEP 2: DESCRIPTION ---

    // 9. Verify we are on Step 2
    await expect(page.getByText('Final Skills Review')).toBeVisible();

    // 10. Fill Description
    await page.getByPlaceholder(/e.g., Senior React developer/i).fill(
      'We are looking for an automation expert who knows Playwright inside out. This description must be long enough to pass validation rules.'
    );

    // 11. Create Job
    // Set up a listener for the network request to verify data was sent (Optional but good)
    const requestPromise = page.waitForRequest(req => 
      req.url().includes('/rest/v1/hr_jobs') && req.method() === 'POST'
    );

    await page.getByRole('button', { name: 'Create Job' }).click();

    // 12. Verify Success Toast
    await expect(page.getByText('Job created successfully')).toBeVisible();

    // (Optional) Verify the database payload
    const request = await requestPromise;
    console.log('Job Payload:', request.postDataJSON());
  });
});