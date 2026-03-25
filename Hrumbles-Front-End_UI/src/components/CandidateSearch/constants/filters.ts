export const POPULAR_TITLES = [
  "Senior Software Engineer","Full Stack Developer","Backend Engineer","Frontend Engineer",
  "Machine Learning Engineer","Data Scientist","DevOps Engineer","Site Reliability Engineer",
  "Engineering Manager","Staff Engineer","Principal Engineer","Data Engineer",
  "Cloud Architect","Platform Engineer","iOS Developer","Android Developer","Security Engineer",
  "Software Architect","QA Engineer","Mobile Developer","Product Manager",
];

export const POPULAR_LOCATIONS = [
  "India","United States","United Kingdom","Canada","Germany","Singapore","Australia",
  "Netherlands","Remote","San Francisco","New York","Bangalore","London",
  "Berlin","Toronto","Hyderabad","Amsterdam","Stockholm","Dubai","Tokyo",
  "Ireland","France","Brazil","Spain","Sweden","Poland","Israel","Mexico",
];

export const SENIORITIES = [
  { v: "intern",   l: "Intern",    d: "Student / trainee" },
  { v: "entry",    l: "Entry",     d: "0–2 yr" },
  { v: "senior",   l: "Senior",    d: "5+ yr" },
  { v: "manager",  l: "Manager",   d: "Team lead" },
  { v: "director", l: "Director",  d: "Dept lead" },
  { v: "head",     l: "Head",      d: "Function lead" },
  { v: "vp",       l: "VP",        d: "Exec leadership" },
  { v: "c_suite",  l: "C-Suite",   d: "CXO" },
  { v: "partner",  l: "Partner",   d: "Firm leadership" },
  { v: "founder",  l: "Founder",   d: "Company founder" },
  { v: "owner",    l: "Owner",     d: "Business owner" },
] as const;

export type SeniorityValue = typeof SENIORITIES[number]["v"];

export const QUICK_SEARCHES = [
  { label: "Full-Stack Dev",    skills: ["React","Node.js","PostgreSQL"] },
  { label: "ML Engineer",       skills: ["Python","PyTorch","AWS"] },
  { label: "DevOps Specialist", skills: ["Kubernetes","Terraform","Docker"] },
  { label: "Backend Engineer",  skills: ["Go","PostgreSQL","Redis"] },
  { label: "Data Engineer",     skills: ["Apache Spark","Airflow","Python"] },
];

export const POPULAR_SKILLS = [
  "Python","React","TypeScript","Kubernetes","AWS","PyTorch","Go","PostgreSQL",
];

export const API_BASE_URL = "https://api.apollo.io/api/v1/mixed_people/api_search";
export const API_KEY_STORAGE_KEY = "talent_search_api_key";
export const RESULTS_PER_PAGE = 25;