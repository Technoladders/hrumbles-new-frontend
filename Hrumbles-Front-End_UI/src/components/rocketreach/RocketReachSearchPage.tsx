// Hrumbles-Front-End_UI/src/pages/search/RocketReachSearchPage.tsx
// New route — add to your router however your other search pages are wired up.
// Suggested path: /search/rocketreach  (or /search/candidates/pro)
//
// Example in your router:
//   { path: "rocketreach", element: <RocketReachSearchPage /> }

import PeopleSearchUI from "@/components/rocketreach/PeopleSearchUI";

export default function RocketReachSearchPage() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      {/* Page header — matches your other search page headers */}
      <header className="flex-shrink-0 px-6 py-4 border-b border-slate-200 bg-white flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          {/* RocketReach icon */}
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800 leading-tight" style={{ fontFamily: "Syne, sans-serif" }}>
              RocketReach Search
            </h1>
            <p className="text-[10px] text-slate-400 leading-tight">700M+ professional profiles</p>
          </div>
        </div>

        {/* Right side — API docs link */}
        <div className="ml-auto flex items-center gap-3">
          <a
            href="https://rocketreach.co/account?section=nav_gen_api"
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-slate-400 hover:text-violet-600 transition-colors flex items-center gap-1"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            API Key
          </a>
        </div>
      </header>

      {/* Full-height search UI */}
      <div className="flex-1 overflow-hidden">
        <PeopleSearchUI />
      </div>
    </div>
  );
}