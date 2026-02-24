require('dotenv').config();
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ORGANIZATION_ID = process.env.TARGET_ORGANIZATION_ID;
// The Edge Function URL we want to intercept
const API_ENDPOINT = 'apollo-people-search-v1'; 

// State to track if a scrape is currently running so we don't overlap them
let isScraping = false;

/**
 * Saves a batch of people to the database
 */
async function saveToDatabase(peopleArray) {
  if (!peopleArray || peopleArray.length === 0) return 0;

  const contactsToInsert = peopleArray.map(p => ({
    apollo_person_id: p.id,
    organization_id: ORGANIZATION_ID,
    name: `${p.first_name || ''} ${p.last_name_obfuscated || ''}`.trim(),
    job_title: p.title,
    company_name: p.organization?.name || null,
    linkedin_url: p.linkedin_url,
    city: p.city,
    state: p.state,
    country: p.country,
    photo_url: p.photo_url,
    contact_stage: 'Prospect',
    phone_enrichment_status: 'not_started'
  }));

  const { data, error } = await supabase
    .from('contacts')
    .upsert(contactsToInsert, {
      onConflict: 'apollo_person_id, organization_id',
      ignoreDuplicates: true
    })
    .select('id');

  if (error) {
    console.error('❌ DB Error:', error.message);
    return 0;
  }
  return data ? data.length : 0;
}

/**
 * The Background Loop: Fetches all pages for a given filter
 */
async function fetchAllPagesForQuery(filters, totalExpectedEntries) {
  isScraping = true;
  console.log(`\n🚀 BACKGROUND EXTRACTION STARTED!`);
  console.log(`🎯 Total expected records: ${totalExpectedEntries}`);
  console.log(`📋 Filters:`, JSON.stringify(filters));

  let totalInserted = 0;
  let totalProcessed = 0;
  
  // Calculate max pages based on 50,000 limit and 100 per page
  const maxAllowedPages = 500; 
  // Calculate required pages based on actual entries (e.g., if total is 450, we only need 5 pages)
  const requiredPages = Math.ceil(totalExpectedEntries / 100);
  const targetPages = Math.min(requiredPages, maxAllowedPages);

  console.log(`📄 Will fetch ${targetPages} pages (100 records per page)...\n`);

  for (let pageNum = 1; pageNum <= targetPages; pageNum++) {
    try {
      console.log(`Fetching Page ${pageNum}/${targetPages}...`);
      
      // Call your Supabase Edge Function directly
      const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/${API_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          filters: filters,
          page: pageNum,
          per_page: 100 // Max allowed by Apollo per page
        })
      });

      if (response.status === 429) {
        console.error('🚨 RATE LIMIT REACHED (429)! Apollo allows 600 calls/hour. Pausing script.');
        break; // Stop loop if rate limited
      }

      const data = await response.json();

      if (!data.people || data.people.length === 0) {
        console.log('🛑 No more records returned. Ending loop.');
        break;
      }

      // Save to DB
      const insertedCount = await saveToDatabase(data.people);
      totalProcessed += data.people.length;
      totalInserted += insertedCount;

      console.log(`✅ Page ${pageNum} done | Processed: ${data.people.length} | New Inserts: ${insertedCount} | Total Saved: ${totalInserted}`);

      // BE CAREFUL: Apollo allows 600 calls per hour. 
      // We add a 2 second delay between requests to be gentle on the API and DB.
      await new Promise(res => setTimeout(res, 2000));

    } catch (err) {
      console.error(`💥 Error on page ${pageNum}:`, err.message);
      break; // Stop on fatal error
    }
  }

  console.log(`\n🎉 EXTRACTION COMPLETE FOR THIS QUERY!`);
  console.log(`📊 Total Processed: ${totalProcessed}`);
  console.log(`💾 Total New Inserts: ${totalInserted}`);
  console.log(`👀 Waiting for you to trigger a new search in the UI...\n`);
  
  isScraping = false;
}


(async () => {
  console.log('Starting CRM Listener...');
  const browser = await chromium.launch({ headless: false }); // Set to false so you can use the UI
  const context = await browser.newContext();
  const page = await context.newPage();

  // 1. Intercept API requests made by the UI
  page.on('request', async (request) => {
    // Check if the UI made a request to the edge function
    if (request.url().includes(API_ENDPOINT) && request.method() === 'POST') {
      
      // If we are already scraping, ignore duplicate UI triggers
      if (isScraping) {
        console.log('⏳ A background scrape is already running. Ignoring new UI search.');
        return;
      }

      try {
        const postData = JSON.parse(request.postData());
        const filters = postData.filters;

        // We only care if it's page 1 (meaning it's a brand new search initiated by the user)
        if (postData.page === 1) {
          console.log('\n=============================================');
          console.log('🔍 NEW SEARCH DETECTED FROM UI!');
          console.log('=============================================');
          
          // Wait for the UI response to get the "total_entries" count to know how many pages we need
          const response = await request.response();
          const responseData = await response.json();
          const totalEntries = responseData.total_entries || 0;

          // Start the background scraping process immediately without blocking the UI
          fetchAllPagesForQuery(filters, totalEntries);
        }
      } catch (e) {
        console.error('Failed to parse intercepted request:', e.message);
      }
    }
  });

  // 2. Open the UI so the admin can log in and trigger searches
  await page.goto(process.env.APP_LOGIN_URL);
  
  console.log(`
  ==============================================================
  🟢 LISTENER READY
  1. Please log in manually.
  2. Navigate to the Discovery page.
  3. Enter your filters and click "Run Search".
  4. The script will catch the search and download ALL pages automatically.
  ==============================================================
  `);

  // We leave the browser open indefinitely so the admin can keep triggering new searches
})();