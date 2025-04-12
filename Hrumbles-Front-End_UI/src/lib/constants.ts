// List of Indian states for job location selection
export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry"
];

// Simplified Indian cities list (only city names)
export const INDIAN_CITIES = [
  { value: "mumbai", label: "Mumbai" },
  { value: "delhi", label: "Delhi" },
  { value: "bengaluru", label: "Bengaluru" },
  { value: "hyderabad", label: "Hyderabad" },
  { value: "chennai", label: "Chennai" },
  { value: "kolkata", label: "Kolkata" },
  { value: "pune", label: "Pune" },
  { value: "ahmedabad", label: "Ahmedabad" },
  { value: "jaipur", label: "Jaipur" },
  { value: "lucknow", label: "Lucknow" },
  { value: "kanpur", label: "Kanpur" },
  { value: "nagpur", label: "Nagpur" },
  { value: "indore", label: "Indore" },
  { value: "thane", label: "Thane" },
  { value: "bhopal", label: "Bhopal" },
  { value: "visakhapatnam", label: "Visakhapatnam" },
  { value: "patna", label: "Patna" },
  { value: "vadodara", label: "Vadodara" },
  { value: "ghaziabad", label: "Ghaziabad" },
  { value: "ludhiana", label: "Ludhiana" },
  { value: "agra", label: "Agra" },
  { value: "nashik", label: "Nashik" },
  { value: "faridabad", label: "Faridabad" },
  { value: "meerut", label: "Meerut" },
  { value: "rajkot", label: "Rajkot" },
  { value: "kalyan", label: "Kalyan" },
  { value: "varanasi", label: "Varanasi" },
  { value: "srinagar", label: "Srinagar" },
  { value: "aurangabad", label: "Aurangabad" },
  { value: "dhanbad", label: "Dhanbad" },
  { value: "amritsar", label: "Amritsar" },
  { value: "allahabad", label: "Allahabad" },
  { value: "guwahati", label: "Guwahati" },
  { value: "chandigarh", label: "Chandigarh" },
  { value: "coimbatore", label: "Coimbatore" },
  { value: "jabalpur", label: "Jabalpur" },
  { value: "gwalior", label: "Gwalior" },
  { value: "vijayawada", label: "Vijayawada" },
  { value: "jodhpur", label: "Jodhpur" },
  { value: "madurai", label: "Madurai" },
  { value: "raipur", label: "Raipur" },
  { value: "kochi", label: "Kochi" },
  { value: "jamshedpur", label: "Jamshedpur" },
  { value: "surat", label: "Surat" },
  { value: "dehradun", label: "Dehradun" },
  { value: "shimla", label: "Shimla" },
  { value: "thiruvananthapuram", label: "Thiruvananthapuram" },
  { value: "puducherry", label: "Puducherry" },
  { value: "ranchi", label: "Ranchi" },
  { value: "mangalore", label: "Mangalore" },
  { value: "remote", label: "Remote" }
];

// Mock employees data
export const MOCK_EMPLOYEES = [
  { value: "emp1", label: "Rahul Sharma - Talent Acquisition" },
  { value: "emp2", label: "Priya Singh - HR Manager" },
  { value: "emp3", label: "Amit Patel - Technical Recruiter" },
  { value: "emp4", label: "Neha Gupta - HR Executive" },
  { value: "emp5", label: "Vikram Joshi - Recruiting Lead" }
];

// Mock teams data
export const MOCK_TEAMS = [
  { value: "team1", label: "North India Recruitment Team" },
  { value: "team2", label: "Tech Recruitment Team" },
  { value: "team3", label: "Campus Recruitment Team" },
  { value: "team4", label: "Marketing & Sales Recruitment" },
  { value: "team5", label: "Senior Management Recruitment" }
];

// Mock vendors data
export const MOCK_VENDORS = [
  { value: "vendor1", label: "TechHire Solutions" },
  { value: "vendor2", label: "Recruit Wizards" },
  { value: "vendor3", label: "Talent Bridge Consultants" },
  { value: "vendor4", label: "NextGen Staffing" },
  { value: "vendor5", label: "Elite HR Services" }
];

// Import the Candidate type to fix the error
import { Candidate } from "@/lib/types";

// Mock candidates data
export const MOCK_CANDIDATES = [
  {
    id: 1,
    name: "Ankit Verma",
    status: "Screening",
    experience: "4 years",
    matchScore: 85,
    appliedDate: "2023-08-15",
    skills: ["React", "Node.js", "MongoDB"]
  },
  {
    id: 2,
    name: "Kavita Reddy",
    status: "Interviewing",
    experience: "6 years",
    matchScore: 92,
    appliedDate: "2023-08-12",
    skills: ["JavaScript", "TypeScript", "React", "AWS"]
  },
  {
    id: 3,
    name: "Sanjay Mehta",
    status: "Selected",
    experience: "8 years",
    matchScore: 95,
    appliedDate: "2023-08-10",
    skills: ["React", "Redux", "Node.js", "Express", "MongoDB"]
  },
  {
    id: 4,
    name: "Preeti Iyer",
    status: "Rejected",
    experience: "2 years",
    matchScore: 65,
    appliedDate: "2023-08-14",
    skills: ["HTML", "CSS", "JavaScript", "React"]
  },
  {
    id: 5,
    name: "Rajesh Kumar",
    status: "Screening",
    experience: "5 years",
    matchScore: 78,
    appliedDate: "2023-08-13",
    skills: ["React", "Angular", "Vue", "Node.js"]
  }
] as Candidate[];
