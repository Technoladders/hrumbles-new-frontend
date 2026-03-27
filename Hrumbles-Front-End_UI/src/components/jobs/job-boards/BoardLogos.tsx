// src/components/jobs/job-boards/BoardLogos.tsx
// All logos are inline SVG — zero external network requests.

import React from "react";

interface LogoProps {
  size?: number;
  className?: string;
}

// ─── LinkedIn ────────────────────────────────────────────────────────────────
export const LinkedInLogo: React.FC<LogoProps> = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="28" height="28" rx="6" fill="#0A66C2"/>
    <path d="M7.5 11.5H10.5V20.5H7.5V11.5Z" fill="white"/>
    <circle cx="9" cy="8.75" r="1.75" fill="white"/>
    <path d="M13 11.5H15.8V12.9C16.3 12.1 17.3 11.3 18.8 11.3C21.3 11.3 22 12.9 22 15.2V20.5H19V15.8C19 14.7 18.6 14 17.6 14C16.6 14 16 14.7 16 15.8V20.5H13V11.5Z" fill="white"/>
  </svg>
);

// ─── Naukri ───────────────────────────────────────────────────────────────────
export const NaukriLogo: React.FC<LogoProps> = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="28" height="28" rx="6" fill="#FF7555"/>
    <text x="5" y="20" fontFamily="Arial Black, Arial" fontWeight="900" fontSize="15" fill="white">N</text>
    <text x="14" y="20" fontFamily="Arial Black, Arial" fontWeight="900" fontSize="9" fill="white" opacity="0.85">aukri</text>
  </svg>
);

// ─── Indeed ───────────────────────────────────────────────────────────────────
export const IndeedLogo: React.FC<LogoProps> = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="28" height="28" rx="6" fill="#003A9B"/>
    <circle cx="14" cy="10" r="3.5" fill="#FFFFFF"/>
    <rect x="11.5" y="14.5" width="5" height="8" rx="2.5" fill="#FFFFFF"/>
  </svg>
);

// ─── Glassdoor ────────────────────────────────────────────────────────────────
export const GlassdoorLogo: React.FC<LogoProps> = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="28" height="28" rx="6" fill="#0CAA41"/>
    <path d="M14 6C9.58 6 6 9.58 6 14C6 18.42 9.58 22 14 22C18.42 22 22 18.42 22 14H14V6Z" fill="white"/>
    <path d="M14 22C18.42 22 22 18.42 22 14C22 9.58 18.42 6 14 6V14H22" fill="white" opacity="0.4"/>
  </svg>
);

// ─── Shine ────────────────────────────────────────────────────────────────────
export const ShineLogo: React.FC<LogoProps> = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="28" height="28" rx="6" fill="#E8002D"/>
    <path d="M18.5 10.5C18.5 8.85 17.15 7.5 14 7.5C11.5 7.5 9.5 8.7 9.5 10.5C9.5 12.3 11 13 14 13.5C17 14 18.5 14.8 18.5 16.8C18.5 18.5 16.5 20.5 14 20.5C11 20.5 9.5 18.8 9.5 17.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// ─── Monster ──────────────────────────────────────────────────────────────────
export const MonsterLogo: React.FC<LogoProps> = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="28" height="28" rx="6" fill="#6D0DF5"/>
    <path d="M6 8H9L14 16L19 8H22V20H19.5V12.5L14 20.5L8.5 12.5V20H6V8Z" fill="white"/>
  </svg>
);

// ─── CareerJet ────────────────────────────────────────────────────────────────
export const CareerJetLogo: React.FC<LogoProps> = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="28" height="28" rx="6" fill="#E05200"/>
    <circle cx="10" cy="21" r="1.8" fill="white"/>
    <path d="M7.5 5.5a14.5 14.5 0 0 1 14.5 14.5" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
    <path d="M7.5 11a9 9 0 0 1 9 9" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
    <path d="M7.5 16.5a3.5 3.5 0 0 1 3.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
  </svg>
);

// ─── WhatJobs ─────────────────────────────────────────────────────────────────
export const WhatJobsLogo: React.FC<LogoProps> = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="28" height="28" rx="6" fill="#1D72B8"/>
    <path d="M6 8L9.5 20L14 11L18.5 20L22 8" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
);

// ─── Talent.com ───────────────────────────────────────────────────────────────
export const TalentLogo: React.FC<LogoProps> = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="28" height="28" rx="6" fill="#6139FF"/>
    <path d="M7 9.5H21M14 9.5V20.5" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
    <path d="M11 14.5C11 14.5 11.5 12.5 14 12.5C16.5 12.5 17 14.5 17 14.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
  </svg>
);

// ─── Recruit.net ──────────────────────────────────────────────────────────────
export const RecruitNetLogo: React.FC<LogoProps> = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="28" height="28" rx="6" fill="#00A3E0"/>
    <path d="M8 7.5H15C17.5 7.5 19.5 9.5 19.5 12C19.5 14.5 17.5 16.5 15 16.5H8V7.5Z" stroke="white" strokeWidth="2" fill="none"/>
    <path d="M14.5 16.5L19.5 20.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <path d="M8 7.5V20.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// ─── Internshala ──────────────────────────────────────────────────────────────
export const IntersahalaLogo: React.FC<LogoProps> = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="28" height="28" rx="6" fill="#09ACA4"/>
    {/* Graduation cap */}
    <path d="M14 7L22 11L14 15L6 11L14 7Z" fill="white"/>
    <path d="M10 13V17.5C10 17.5 11.5 19.5 14 19.5C16.5 19.5 18 17.5 18 17.5V13" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
    <line x1="22" y1="11" x2="22" y2="15.5" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

// ─── Foundit ──────────────────────────────────────────────────────────────────
export const FounditLogo: React.FC<LogoProps> = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="28" height="28" rx="6" fill="#7C3AED"/>
    {/* Magnifier */}
    <circle cx="12.5" cy="12.5" r="5" stroke="white" strokeWidth="2" fill="none"/>
    <path d="M16.5 16.5L21 21" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
    <path d="M10.5 12.5H14.5M12.5 10.5V14.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

// ─── DrJobs ───────────────────────────────────────────────────────────────────
export const DrJobsLogo: React.FC<LogoProps> = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="28" height="28" rx="6" fill="#0055A5"/>
    <path d="M7 7.5H13C17.5 7.5 21 10.5 21 14C21 17.5 17.5 20.5 13 20.5H7V7.5Z" stroke="white" strokeWidth="2" fill="none"/>
    <path d="M7 7.5V20.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// ─── Jobsfree ─────────────────────────────────────────────────────────────────
export const JobsfreeLogo: React.FC<LogoProps> = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="28" height="28" rx="6" fill="#059669"/>
    <rect x="7" y="8" width="14" height="12" rx="2" stroke="white" strokeWidth="1.8" fill="none"/>
    <path d="M10 8V7C10 5.9 10.9 5 12 5H16C17.1 5 18 5.9 18 7V8" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M10 14H18M10 17H15" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

// ─── PostJobFree ──────────────────────────────────────────────────────────────
export const PostJobFreeLogo: React.FC<LogoProps> = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="28" height="28" rx="6" fill="#2563EB"/>
    <rect x="7" y="7" width="14" height="14" rx="2.5" stroke="white" strokeWidth="1.8" fill="none"/>
    <path d="M10 11H18M10 14H18M10 17H14" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="20" cy="8" r="4" fill="#22C55E"/>
    <path d="M18.2 8L19.5 9.3L21.8 7" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ─── Logo map — keyed by board id ─────────────────────────────────────────────
export const BOARD_LOGOS: Record<string, React.FC<LogoProps>> = {
  linkedin:    LinkedInLogo,
  naukri:      NaukriLogo,
  indeed:      IndeedLogo,
  glassdoor:   GlassdoorLogo,
  shine:       ShineLogo,
  monster:     MonsterLogo,
  careerjet:   CareerJetLogo,
  whatjobs:    WhatJobsLogo,
  talent:      TalentLogo,
  recruitnet:  RecruitNetLogo,
  internshala: IntersahalaLogo,
  foundit:     FounditLogo,
  drjobs:      DrJobsLogo,
  jobsfree:    JobsfreeLogo,
  postjobfree: PostJobFreeLogo,
};

// ─── Generic board logo component ─────────────────────────────────────────────
export const BoardLogo: React.FC<{ boardId: string; size?: number; className?: string }> = ({
  boardId, size = 28, className,
}) => {
  const Logo = BOARD_LOGOS[boardId];
  if (!Logo) {
    return (
      <div
        className={className}
        style={{ width: size, height: size, borderRadius: 6, background: "#e2e8f0",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: size * 0.35, fontWeight: 700, color: "#64748b" }}
      >
        {boardId.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return <Logo size={size} className={className} />;
};