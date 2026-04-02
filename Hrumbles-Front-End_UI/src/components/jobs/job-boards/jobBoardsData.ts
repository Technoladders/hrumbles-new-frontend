// src/components/jobs/job-boards/jobBoardsData.ts

export type BoardStatus = "available" | "partial" | "available" | "coming_soon";
export type BoardTier   = "free" | "freemium" | "premium";

export interface ConfigField {
  key:         string;
  label:       string;
  type:        "text" | "password" | "email" | "url" | "readonly";
  placeholder: string;
  required:    boolean;
  helpText?:   string;
}

export interface JobBoard {
  id:              string;
  name:            string;
  tagline:         string;
  logoUrl:         string;
  logoFallback:    string;
  brandColor:      string;
  status:          BoardStatus;
  tier:            BoardTier;
  tierLabel:       string;
  region:          string;
  monthlyVisitors: string;
  estimatedReach:  number;
  avgApplicants:   string;
  indexTime:       string;
  tags:            string[];
  configFields:    ConfigField[];
  setupUrl:        string;
  setupNote:       string;
}

export const JOB_BOARDS: JobBoard[] = [
  {
    id: "careerjet", name: "CareerJet", tagline: "Job search engine · XML feed ready",
    logoUrl: "https://logo.clearbit.com/careerjet.co.in", logoFallback: "CJ", brandColor: "#E05200",
    status: "partial", tier: "free", tierLabel: "Free",
    region: "India + Global", monthlyVisitors: "12M", estimatedReach: 3200, avgApplicants: "2–8", indexTime: "24–48h",
    tags: ["XML Feed", "Free", "Aggregator"],
    setupUrl: "https://publisher.careerjet.com",
    setupNote: "Email CareerJet to activate feed crawling. Your XML feed is already configured.",
    configFields: [
      { key: "feed_url",      label: "XML Feed URL",  type: "readonly", placeholder: "", required: false, helpText: "Auto-generated from your active jobs" },
      { key: "partner_email", label: "Partner Email", type: "email",    placeholder: "hr@yourcompany.com", required: true },
    ],
  },
  {
    id: "whatjobs", name: "WhatJobs", tagline: "Aggregator with strong India presence",
    logoUrl: "https://logo.clearbit.com/whatjobs.com", logoFallback: "WJ", brandColor: "#1D72B8",
    status: "available", tier: "free", tierLabel: "Free",
    region: "India + EU", monthlyVisitors: "8M", estimatedReach: 2100, avgApplicants: "1–5", indexTime: "24–48h",
    tags: ["Free", "XML Feed", "India"],
    setupUrl: "https://en-in.whatjobs.com/post-job-feed",
    setupNote: "Submit your XML feed URL on the WhatJobs partner page. No account needed.",
    configFields: [
      { key: "feed_url", label: "XML Feed URL",  type: "readonly", placeholder: "", required: false },
      { key: "contact",  label: "Contact Email", type: "email",    placeholder: "your@email.com", required: true },
    ],
  },
  {
    id: "talent", name: "Talent.com", tagline: "AI-powered global job aggregator",
    logoUrl: "https://logo.clearbit.com/talent.com", logoFallback: "TL", brandColor: "#6139FF",
    status: "available", tier: "free", tierLabel: "Free",
    region: "Global", monthlyVisitors: "20M", estimatedReach: 4800, avgApplicants: "3–10", indexTime: "24–48h",
    tags: ["Free", "AI Matching", "Global"],
    setupUrl: "https://www.talent.com",
    setupNote: "Email feeds@talent.com with your XML feed URL to get listed organically.",
    configFields: [
      { key: "feed_url", label: "XML Feed URL",  type: "readonly", placeholder: "", required: false },
      { key: "contact",  label: "Contact Email", type: "email",    placeholder: "your@email.com", required: true },
    ],
  },
  {
    id: "recruitnet", name: "Recruit.net", tagline: "India-first XML feed aggregator",
    logoUrl: "https://logo.clearbit.com/recruit.net", logoFallback: "RN", brandColor: "#00A3E0",
    status: "available", tier: "free", tierLabel: "Free",
    region: "India", monthlyVisitors: "5M", estimatedReach: 1400, avgApplicants: "1–4", indexTime: "24–48h",
    tags: ["Free", "India", "XML Feed"],
    setupUrl: "https://india.recruit.net/recruiters/",
    setupNote: "Register as an employer on Recruit.net India and submit your XML feed URL.",
    configFields: [
      { key: "feed_url",   label: "XML Feed URL", type: "readonly", placeholder: "", required: false },
      { key: "account_id", label: "Account ID",   type: "text",     placeholder: "From recruit.net dashboard", required: true },
    ],
  },
  {
    id: "indeed", name: "Indeed", tagline: "World's most visited job site",
    logoUrl: "https://logo.clearbit.com/indeed.com", logoFallback: "IN", brandColor: "#003A9B",
    status: "available", tier: "freemium", tierLabel: "Premium",
    region: "Global", monthlyVisitors: "250M", estimatedReach: 12000, avgApplicants: "5–20", indexTime: "24–72h",
    tags: ["Global", "Aggregator", "Free"],
    setupUrl: "https://employers.indeed.com",
    setupNote: "Create a free employer account. Indeed crawls your careers page automatically.",
    configFields: [
      { key: "employer_email", label: "Employer Email",    type: "email", placeholder: "hr@yourcompany.com",            required: true },
      { key: "company_url",    label: "Company Jobs URL",  type: "url",   placeholder: "https://yourcompany.com/careers", required: true, helpText: "Indeed will crawl this page for jobs" },
    ],
  },
    {
    id: "linkedin", name: "LinkedIn", tagline: "World's largest professional network",
    logoUrl: "https://cdn.simpleicons.org/linkedin/0A66C2", logoFallback: "in", brandColor: "#0A66C2",
    status: "available", tier: "premium", tierLabel: "Paid",
    region: "Global", monthlyVisitors: "1B+", estimatedReach: 28000, avgApplicants: "15–60", indexTime: "Instant",
    tags: ["Global", "Professional", "High Quality"],
    setupUrl: "https://business.linkedin.com/talent-solutions",
    setupNote: "Requires LinkedIn Recruiter license or Job Postings API access (paid).",
    configFields: [
      { key: "client_id",     label: "OAuth Client ID",     type: "text",     placeholder: "From LinkedIn Developer Portal",    required: true },
      { key: "client_secret", label: "OAuth Client Secret", type: "password", placeholder: "From LinkedIn Developer Portal",    required: true },
      { key: "org_id",        label: "Organisation ID",     type: "text",     placeholder: "urn:li:organization:XXXXXXXX",      required: true },
    ],
  },
  {
    id: "naukri", name: "Naukri", tagline: "India's No.1 Job Portal",
    logoUrl: "https://logo.clearbit.com/naukri.com", logoFallback: "NK", brandColor: "#FF7555",
    status: "available", tier: "freemium", tierLabel: "Freemium",
    region: "India", monthlyVisitors: "75M", estimatedReach: 8500, avgApplicants: "10–40", indexTime: "2–4h",
    tags: ["India", "IT Jobs", "High Volume"],
    setupUrl: "https://www.naukri.com/mnjuser/homepage",
    setupNote: "Register for a free Naukri recruiter account. Free plan allows 1 active job.",
    configFields: [
      { key: "api_key",   label: "Naukri API Key", type: "password", placeholder: "From Naukri recruiter dashboard", required: true },
      { key: "client_id", label: "Client ID",      type: "text",     placeholder: "NKR-XXXXXXXX",                   required: true },
    ],
  },
  {
    id: "internshala", name: "Internshala", tagline: "India's top fresher & internship portal",
    logoUrl: "https://logo.clearbit.com/internshala.com", logoFallback: "IS", brandColor: "#09ACA4",
    status: "available", tier: "freemium", tierLabel: "Freemium",
    region: "India", monthlyVisitors: "14M", estimatedReach: 3800, avgApplicants: "8–30", indexTime: "2–6h",
    tags: ["Freshers", "Internships", "India"],
    setupUrl: "https://internshala.com/recruiter/",
    setupNote: "Create a recruiter account. Free plan supports internship postings.",
    configFields: [
      { key: "recruiter_email",    label: "Recruiter Email", type: "email",    placeholder: "hr@yourcompany.com",        required: true },
      { key: "recruiter_password", label: "API Password",    type: "password", placeholder: "From recruiter portal",     required: true },
    ],
  },
  {
    id: "foundit", name: "Foundit", tagline: "Formerly Monster India · large talent pool",
    logoUrl: "https://logo.clearbit.com/foundit.in", logoFallback: "FD", brandColor: "#7C3AED",
    status: "available", tier: "freemium", tierLabel: "Freemium",
    region: "India", monthlyVisitors: "18M", estimatedReach: 4200, avgApplicants: "5–18", indexTime: "4–8h",
    tags: ["India", "IT Focused", "Large DB"],
    setupUrl: "https://www.foundit.in/recruiter/",
    setupNote: "Register as a recruiter. Free tier allows limited job postings per month.",
    configFields: [
      { key: "api_key",    label: "API Key",    type: "password", placeholder: "From Foundit recruiter portal", required: true },
      { key: "company_id", label: "Company ID", type: "text",     placeholder: "FDIT-XXXXXX",                  required: true },
    ],
  },
  {
    id: "drjobs", name: "DrJobs", tagline: "Leading Gulf & India job platform",
    logoUrl: "https://logo.clearbit.com/drjobs.ae", logoFallback: "DR", brandColor: "#0055A5",
    status: "available", tier: "freemium", tierLabel: "Freemium",
    region: "India + Gulf", monthlyVisitors: "6M", estimatedReach: 1800, avgApplicants: "2–8", indexTime: "4–12h",
    tags: ["India", "Gulf", "IT"],
    setupUrl: "https://drjobs.ae/employer/register",
    setupNote: "Create a free employer account. Supports India and Gulf postings.",
    configFields: [
      { key: "employer_email", label: "Employer Email", type: "email",    placeholder: "hr@yourcompany.com",         required: true },
      { key: "api_token",      label: "API Token",      type: "password", placeholder: "From DrJobs employer portal", required: true },
    ],
  },

  {
    id: "glassdoor", name: "Glassdoor", tagline: "Jobs + company reviews + salary insights",
    logoUrl: "https://cdn.simpleicons.org/glassdoor/0CAA41", logoFallback: "GD", brandColor: "#0CAA41",
    status: "available", tier: "premium", tierLabel: "Paid",
    region: "Global", monthlyVisitors: "59M", estimatedReach: 6500, avgApplicants: "5–20", indexTime: "Instant",
    tags: ["Brand Trust", "Reviews", "Premium"],
    setupUrl: "https://www.glassdoor.com/employers",
    setupNote: "Requires a paid Glassdoor Employer account. Contact their sales team.",
    configFields: [
      { key: "partner_id", label: "Partner ID", type: "text",     placeholder: "From Glassdoor employer account", required: true },
      { key: "api_key",    label: "API Key",    type: "password", placeholder: "From Glassdoor employer portal",  required: true },
    ],
  },
  {
    id: "shine", name: "Shine", tagline: "Premium Indian professional job board",
    logoUrl: "https://logo.clearbit.com/shine.com", logoFallback: "SH", brandColor: "#E8002D",
    status: "available", tier: "premium", tierLabel: "Paid",
    region: "India", monthlyVisitors: "30M", estimatedReach: 5200, avgApplicants: "8–25", indexTime: "4–8h",
    tags: ["India", "Premium", "IT & Tech"],
    setupUrl: "https://www.shine.com/recruiter/",
    setupNote: "Contact Shine sales for API access. Basic posting available on paid plans.",
    configFields: [
      { key: "api_key",    label: "API Key",    type: "password", placeholder: "From Shine recruiter portal", required: true },
      { key: "account_id", label: "Account ID", type: "text",     placeholder: "SHINE-XXXXXXX",              required: true },
    ],
  },
  {
    id: "monster", name: "Monster", tagline: "Global careers platform · mid-market",
    logoUrl: "https://logo.clearbit.com/monster.com", logoFallback: "MN", brandColor: "#6D0DF5",
    status: "available", tier: "premium", tierLabel: "Paid",
    region: "Global", monthlyVisitors: "26M", estimatedReach: 3200, avgApplicants: "4–14", indexTime: "6–12h",
    tags: ["Global", "Established", "Mid-market"],
    setupUrl: "https://hiring.monster.com",
    setupNote: "Requires a paid Monster account. Contact sales for API credentials.",
    configFields: [
      { key: "api_key",    label: "API Key",    type: "password", placeholder: "From Monster hiring portal", required: true },
      { key: "account_id", label: "Account ID", type: "text",     placeholder: "From Monster portal",        required: true },
    ],
  },
  {
    id: "jobsfree", name: "Jobsfree", tagline: "Free job posting directory",
    logoUrl: "https://logo.clearbit.com/jobsfree.com", logoFallback: "JF", brandColor: "#059669",
    status: "coming_soon", tier: "free", tierLabel: "Free",
    region: "Global", monthlyVisitors: "2M", estimatedReach: 600, avgApplicants: "0–3", indexTime: "Manual",
    tags: ["Free", "Manual", "Directory"],
    setupUrl: "", setupNote: "Integration coming soon. Manual posting available on their site.",
    configFields: [],
  },
  {
    id: "postjobfree", name: "PostJobFree", tagline: "Free US-focused job board",
    logoUrl: "https://logo.clearbit.com/postjobfree.com", logoFallback: "PJ", brandColor: "#2563EB",
    status: "coming_soon", tier: "free", tierLabel: "Free",
    region: "US", monthlyVisitors: "3M", estimatedReach: 800, avgApplicants: "0–4", indexTime: "Manual",
    tags: ["Free", "US Focus", "Manual"],
    setupUrl: "", setupNote: "Integration coming soon. US-focused — limited relevance for India roles.",
    configFields: [],
  },
];

export const BOARDS_COUNT      = JOB_BOARDS.length;
export const FREE_BOARDS        = JOB_BOARDS.filter(b => b.tier === "free");
export const CONFIGURED_BOARDS  = JOB_BOARDS.filter(b => b.status === "available" || b.status === "partial");
export const TOTAL_REACH        = JOB_BOARDS.reduce((s, b) => s + b.estimatedReach, 0);
export const FREE_REACH         = FREE_BOARDS.reduce((s, b) => s + b.estimatedReach, 0);
export const getBoardById       = (id: string) => JOB_BOARDS.find(b => b.id === id);

// ─── localStorage ─────────────────────────────────────────────────────────────

const STORAGE_KEY = "hrumbles_jobboard_posts";

export interface PostRecord {
  boardId:  string;
  postedAt: string;
  reach:    number;
}

export type PostHistory = Record<string, Record<string, PostRecord>>;

export const getPostHistory = (): PostHistory => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
};

export const savePostHistory = (h: PostHistory) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(h)); } catch {}
};

export const getJobPosts = (jobId: string): Record<string, PostRecord> =>
  getPostHistory()[jobId] || {};

export const recordPost = (jobId: string, boardIds: string[]): void => {
  const h = getPostHistory();
  if (!h[jobId]) h[jobId] = {};
  boardIds.forEach(id => {
    const board = JOB_BOARDS.find(b => b.id === id);
    h[jobId][id] = { boardId: id, postedAt: new Date().toISOString(), reach: board?.estimatedReach || 0 };
  });
  savePostHistory(h);
};

export const formatPostedDate = (iso: string): string => {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return "Just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
};