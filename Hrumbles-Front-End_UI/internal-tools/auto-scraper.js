require('dotenv').config();
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ─── ANSI Colors ─────────────────────────────────────────────────────────────
const c = {
  reset: '\x1b[0m', bright: '\x1b[1m',
  green: '\x1b[32m', yellow: '\x1b[33m',
  red: '\x1b[31m', cyan: '\x1b[36m', magenta: '\x1b[35m', blue: '\x1b[34m'
};

// ─── Init ─────────────────────────────────────────────────────────────────────
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const ORGANIZATION_ID = process.env.TARGET_ORGANIZATION_ID;
const PEOPLE_API_ENDPOINT = 'apollo-people-search-v1';
const COMPANY_API_ENDPOINT = 'apollo-company-search-v3';
const DELAY_MS = 2000; 

const HISTORY_FILE = path.join(__dirname, 'search_history.json');
const REPORTS_DIR  = path.join(__dirname, 'reports');
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR);

// ─── State ────────────────────────────────────────────────────────────────────
let isScraping = false;
const jobQueue = [];

// ─── History helpers ──────────────────────────────────────────────────────────
function getQueryHash(filters, jobType) {
  return crypto.createHash('md5').update(JSON.stringify({ jobType, filters })).digest('hex');
}

function loadHistory() {
  if (!fs.existsSync(HISTORY_FILE)) return {};
  try {
    const rawData = fs.readFileSync(HISTORY_FILE, 'utf8');
    if (!rawData || !rawData.trim()) return {}; 
    return JSON.parse(rawData);
  } catch (err) {
    return {};
  }
}

function saveToHistory(hash, filters, stats, jobType) {
  const history = loadHistory();
  history[hash] = { date: new Date().toISOString(), type: jobType, filters, stats };
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

// ─── Database helpers ─────────────────────────────────────────────────────────
async function saveReportToDatabase(hash, filters, stats, jobType, status = 'completed', errorLog = null) {
  const { error } = await supabase.from('background_sync_reports').insert({
    organization_id: ORGANIZATION_ID,
    job_type:        jobType,
    query_hash:      hash,
    filters,
    total_expected:  stats.expected,
    total_processed: stats.processed,
    total_inserted:  stats.inserted,
    pages_fetched:   stats.pagesFetched,
    status,
    error_log:       errorLog,
  });
  if (error) console.error(`${c.red}Failed to save report: ${error.message}${c.reset}`);
  else       console.log(`${c.green}📄 Report saved to database.${c.reset}`);
}

async function savePeopleToDatabaseLocally(peopleArray) {
  if (!peopleArray?.length) return 0;

  const rows = peopleArray.map(p => ({
    apollo_person_id:         p.id,
    organization_id:          ORGANIZATION_ID,
    name:                     `${p.first_name || ''} ${p.last_name_obfuscated || ''}`.trim(),
    job_title:                p.title,
    company_name:             p.organization?.name || null,
    linkedin_url:             p.linkedin_url,
    city: p.city, state: p.state, country: p.country,
    photo_url:                p.photo_url,
    contact_stage:            'Prospect',
    phone_enrichment_status:  'not_started',
  }));

  const { data, error } = await supabase
    .from('contacts')
    .upsert(rows, { onConflict: 'apollo_person_id, organization_id', ignoreDuplicates: true })
    .select('id');

  if (!error && data) return data.length;

  // Fallback
  let inserted = 0;
  for (const row of rows) {
    const { error: e } = await supabase.from('contacts').upsert(row, { onConflict: 'apollo_person_id, organization_id', ignoreDuplicates: true });
    if (!e) inserted++;
  }
  return inserted;
}

// ─── CORE: PEOPLE EXTRACTION LOOP ─────────────────────────────────────────────
async function fetchAllPagesForPeople(filters, totalExpectedEntries, queryHash) {
  console.log(`\n${c.cyan}${c.bright}==================================================`);
  console.log(`🚀 PEOPLE EXTRACTION STARTED!`);
  console.log(`🎯 Total expected records: ${totalExpectedEntries.toLocaleString()}`);
  console.log(`==================================================${c.reset}\n`);

  const stats = { expected: totalExpectedEntries, processed: 0, inserted: 0, pagesFetched: 0 };
  const targetPages = Math.min(Math.ceil(totalExpectedEntries / 100), 500);
  let finalStatus = 'completed', finalError = null;

  for (let pageNum = 1; pageNum <= targetPages; pageNum++) {
    try {
      process.stdout.write(`⏳ Page ${pageNum}/${targetPages}… `);

      const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/${PEOPLE_API_ENDPOINT}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
          body: JSON.stringify({ filters, page: pageNum, per_page: 100 }),
      });

      if (response.status === 429) {
        console.log(`\n${c.red}🚨 RATE LIMIT (429) – stopping extraction.${c.reset}`);
        finalStatus = 'stopped_rate_limit'; break;
      }

      const data = await response.json();
      if (!data.people?.length) break;

      const insertedCount = await savePeopleToDatabaseLocally(data.people);
      stats.processed += data.people.length;
      stats.inserted += insertedCount;
      stats.pagesFetched++;

      console.log(`${c.green}✅ Done | Scraped: ${data.people.length} | New: ${insertedCount} | Total saved: ${stats.inserted}${c.reset}`);
      await new Promise(res => setTimeout(res, DELAY_MS));
    } catch (err) {
      console.log(`\n${c.red}💥 Error: ${err.message}${c.reset}`);
      finalStatus = 'failed'; finalError = err.message; break;
    }
  }
  await finishExtraction(stats, filters, queryHash, 'people', finalStatus, finalError);
}

// ─── CORE: COMPANY EXTRACTION LOOP ────────────────────────────────────────────
async function fetchAllPagesForCompanies(filters, totalExpectedEntries, queryHash, createdBy) {
  console.log(`\n${c.blue}${c.bright}==================================================`);
  console.log(`🏢 COMPANY EXTRACTION STARTED!`);
  console.log(`🎯 Total expected records: ${totalExpectedEntries.toLocaleString()}`);
  console.log(`==================================================${c.reset}\n`);

  const stats = { expected: totalExpectedEntries, processed: 0, inserted: 0, pagesFetched: 0 };
  const targetPages = Math.min(Math.ceil(totalExpectedEntries / 100), 500);
  let finalStatus = 'completed', finalError = null;

  for (let pageNum = 1; pageNum <= targetPages; pageNum++) {
    try {
      process.stdout.write(`⏳ Page ${pageNum}/${targetPages}… `);

      // We call the v3 endpoint. The server handles all the saving!
      const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/${COMPANY_API_ENDPOINT}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
          body: JSON.stringify({ 
            filters, 
            page: pageNum, 
            per_page: 100, 
            organization_id: ORGANIZATION_ID, 
            user_id: createdBy 
          }),
      });

      if (response.status === 429) {
        console.log(`\n${c.red}🚨 RATE LIMIT (429) – stopping extraction.${c.reset}`);
        finalStatus = 'stopped_rate_limit'; break;
      }

      const data = await response.json();
      if (!data.organizations?.length && !data.companies?.length) break;

      const processedCount = data.organizations?.length || 0;
      // Server returns how many companies it successfully inserted into the DB
      const insertedCount = data.saved?.companies || 0;

      stats.processed += processedCount;
      stats.inserted += insertedCount;
      stats.pagesFetched++;

      console.log(`${c.green}✅ Done | Scraped: ${processedCount} | New: ${insertedCount} | Total saved: ${stats.inserted}${c.reset}`);
      await new Promise(res => setTimeout(res, DELAY_MS));
    } catch (err) {
      console.log(`\n${c.red}💥 Error: ${err.message}${c.reset}`);
      finalStatus = 'failed'; finalError = err.message; break;
    }
  }
  await finishExtraction(stats, filters, queryHash, 'companies', finalStatus, finalError);
}

// ─── SHARED: FINISH EXTRACTION ────────────────────────────────────────────────
async function finishExtraction(stats, filters, queryHash, jobType, finalStatus, finalError) {
  console.log(`\n${c.magenta}${c.bright}🎉 EXTRACTION COMPLETE!${c.reset}`);
  console.log(`${c.cyan}📊 Processed : ${stats.processed.toLocaleString()}`);
  console.log(`💾 Inserted  : ${stats.inserted.toLocaleString()}${c.reset}\n`);

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(
    path.join(REPORTS_DIR, `Run-Report-${jobType}-${ts}.txt`),
    `📊 ${jobType.toUpperCase()} EXTRACTION REPORT\n📅 ${new Date().toLocaleString()}\n\n` +
    `Expected: ${stats.expected}\nProcessed: ${stats.processed}\nInserted: ${stats.inserted}\n\n` +
    `Filters:\n${JSON.stringify(filters, null, 2)}`
  );

  saveToHistory(queryHash, filters, stats, jobType);
  await saveReportToDatabase(queryHash, filters, stats, jobType, finalStatus, finalError);

  isScraping = false;
  processQueue();
}

// ─── Queue processor ──────────────────────────────────────────────────────────
function processQueue() {
  if (jobQueue.length === 0) {
    console.log(`\n${c.yellow}👀 Waiting for next search trigger from the UI…${c.reset}\n`);
    return;
  }
  const next = jobQueue.shift();
  console.log(`\n${c.cyan}⏭️  Processing queued search (${jobQueue.length} remaining in queue)…${c.reset}`);
  
  processJob(next).catch(err => console.error(`${c.red}Unhandled error: ${err.message}${c.reset}`));
}

async function processJob(job) {
  isScraping = true;
  const queryHash = getQueryHash(job.filters, job.jobType);
  const history = loadHistory();

  if (history[queryHash]) {
    const prev = history[queryHash];
    console.log(`\n${c.red}${c.bright}=============================================`);
    console.log(`⚠️  DUPLICATE QUERY DETECTED! (${job.jobType})`);
    console.log(`   Already scraped on: ${new Date(prev.date).toLocaleString()}`);
    console.log(`   Records previously saved: ${prev.stats?.inserted || 0}`);
    console.log(`=============================================${c.reset}\n`);
    isScraping = false;
    processQueue();
    return;
  }

  if (job.jobType === 'companies') {
    await fetchAllPagesForCompanies(job.filters, job.totalEntries, queryHash, job.createdBy);
  } else {
    await fetchAllPagesForPeople(job.filters, job.totalEntries, queryHash);
  }
}

// ─── Playwright listener ──────────────────────────────────────────────────────
(async () => {
  console.log(`${c.bright}${c.cyan}Starting Multi-Mode CRM Listener (Playwright)…${c.reset}`);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page    = await context.newPage();

  page.on('response', async (response) => {
    const url    = response.url();
    const method = response.request().method();

    if (!url.includes('background_sync_jobs') || method !== 'POST') return;
    const status = response.status();
    if (status !== 201 && status !== 200) return;

    try {
      const payload = response.request().postDataJSON();
      if (!payload) return;

      const row = Array.isArray(payload) ? payload[0] : payload;
      const filters = row?.filters;
      const totalEntries = row?.total_entries ?? 0;
      const jobType = row?.job_type || 'people'; // Default to people if missing
      const createdBy = row?.created_by;

      if (!filters || totalEntries === 0) return;

      console.log(`\n${c.green}${c.bright}=============================================`);
      console.log(`🔍 NEW ${jobType.toUpperCase()} SEARCH DETECTED!`);
      console.log(`   Total entries : ${totalEntries.toLocaleString()}`);
      console.log(`=============================================${c.reset}`);

      const job = { filters, totalEntries, jobType, createdBy };

      if (isScraping) {
        console.log(`${c.yellow}⏳ Scraper is busy – queuing this search…${c.reset}`);
        jobQueue.push(job);
      } else {
        processJob(job).catch(e => console.error(`${c.red}Error: ${e.message}${c.reset}`));
      }
    } catch (err) {}
  });

  await page.goto(process.env.APP_LOGIN_URL);

  console.log(`
${c.green}${c.bright}==============================================================
🟢 LISTENER READY
1. Log in manually.
2. Search in "People" OR "Companies" Discovery tabs.
3. The script will automatically fetch and save everything!
==============================================================${c.reset}
  `);
})();