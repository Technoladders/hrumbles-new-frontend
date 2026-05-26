import React, { useState } from "react";

interface V2SkillsPanelProps {
  sortedGroupedSkills: Record<string, { name: string; description: string; relatedSkills?: string[] }[]>;
  isLoading: boolean;
  skillRatings: Array<{ name: string; rating: number; experienceYears?: number; experienceMonths?: number }>;
  shareMode: boolean;
  sharedDataOptions?: any;
  expanded?: boolean;
  highlightQuery?: string;
}

const Highlight: React.FC<{ text: string; query?: string }> = ({ text, query }) => {
  if (!query || !query.trim()) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <mark key={i} className="bg-purple-100 text-purple-700 rounded px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
};

const SCard = ({ icon, title, iconBg, children }: {
  icon: React.ReactNode; 
  title: string; 
  iconBg: string; 
  children: React.ReactNode;
}) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
    <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-slate-50/40">
      <div className={`flex h-5 w-5 items-center justify-center rounded-md ${iconBg}`}>{icon}</div>
      <h3 className="text-[9px] font-bold uppercase tracking-wider bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
        {title}
      </h3>
    </div>
    {children}
  </div>
);

export const V2SkillsPanel: React.FC<V2SkillsPanelProps> = ({
  sortedGroupedSkills,
  isLoading,
  skillRatings,
  shareMode,
  sharedDataOptions,
  expanded = false,
  highlightQuery = "",
}) => {
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);

  const hasGroupedSkills = Object.keys(sortedGroupedSkills).length > 0;
  const hasRatings = skillRatings && skillRatings.length > 0;

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-2 mb-2">
        <div className="h-8 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!hasGroupedSkills && !hasRatings) return null;
  if (shareMode && !sharedDataOptions?.skillinfo && !sharedDataOptions?.personalInfo) return null;

  const groupedEntries = Object.entries(sortedGroupedSkills);
  const totalSkills = groupedEntries.reduce((acc, [, s]) => acc + s.length, 0);
  const shouldSplit = totalSkills > 5 && groupedEntries.length > 2;
  const half = Math.ceil(groupedEntries.length / 2);
  const firstHalf = groupedEntries.slice(0, half);
  const secondHalf = groupedEntries.slice(half);

  const getExpText = (skill: any) => {
    const y = skill.experienceYears || 0;
    const m = skill.experienceMonths || 0;
    if (y > 0 && m > 0) return `${y}.${m}y`;
    if (y > 0) return `${y}y`;
    if (m > 0) return `${m}m`;
    return "0y";
  };

  const renderStars = (rating: number) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} width="9" height="9" viewBox="0 0 24 24" fill={s <= rating ? "#7C3AED" : "#E2E8F0"} stroke="none">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
      <span className="font-mono text-[9px] font-semibold text-slate-500 ml-1">
        {rating}/5
      </span>
    </div>
  );

  const renderSkillsTable = (entries: [string, { name: string; description: string; relatedSkills?: string[] }[]][]) => (
    <table className="w-full text-[10px] border-collapse">
      <thead>
        <tr className="border-b border-slate-100">
          <th className="w-1/3 text-left px-2 py-1.5 text-[8px] font-bold uppercase tracking-wider bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Category
          </th>
          <th className="text-left px-2 py-1.5 text-[8px] font-bold uppercase tracking-wider bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Skills
          </th>
        </tr>
      </thead>
      <tbody>
        {entries.map(([groupKey, skills]) => (
          <tr key={groupKey} className="border-b border-slate-50 hover:bg-violet-50/20 transition-colors">
            <td className="px-2 py-1.5 align-top font-semibold text-[9px] text-slate-600 whitespace-normal leading-tight">
              {groupKey}
            </td>
            <td className="px-2 py-1.5">
              <div className="flex flex-wrap gap-1">
                {skills.map((skill) => (
                  <div key={skill.name} className="relative group/sk">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-white border border-purple-200 text-purple-700 cursor-default whitespace-normal leading-tight">
                      <Highlight text={skill.name} query={highlightQuery} />
                    </span>
                    {skill.description && skill.description !== "No description available." && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-max max-w-[200px] p-1.5 rounded-md bg-slate-800 text-white text-[9px] shadow-xl opacity-0 group-hover/sk:opacity-100 transition-opacity z-20 pointer-events-none">
                        {skill.description}
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-[-3px] w-1.5 h-1.5 bg-slate-800 rotate-45" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="space-y-2">
      {/* Grouped Skills Table */}
      {hasGroupedSkills && (
        <SCard 
          icon={
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="url(#pg-grad)" strokeWidth="2">
              <defs>
                <linearGradient id="pg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#9333ea" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
              <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
            </svg>
          } 
          title="Candidate Skills" 
          iconBg="bg-violet-50"
        >
          <div className="p-2">
            {groupedEntries.length === 0 ? (
              <p className="text-[10px] text-slate-400">No skills available.</p>
            ) : shouldSplit ? (
              <div className="grid grid-cols-2 gap-2 divide-x divide-slate-100">
                <div>{renderSkillsTable(firstHalf)}</div>
                <div className="pl-2">{renderSkillsTable(secondHalf)}</div>
              </div>
            ) : (
              renderSkillsTable(groupedEntries)
            )}
          </div>
        </SCard>
      )}

      {/* Skill Ratings */}
      {expanded && hasRatings && (!shareMode || sharedDataOptions?.personalInfo) && (
        <SCard 
          icon={
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="url(#pg-grad)" strokeWidth="2">
              <defs>
                <linearGradient id="pg-grad2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#9333ea" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          }
          title="Skill Ratings" 
          iconBg="bg-amber-50"
        >
          <div className="p-2 max-h-[300px] overflow-y-auto">
            {[...skillRatings]
              .sort((a, b) => b.rating - a.rating)
              .map((skill, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-1.5 px-1 border-b border-slate-100 last:border-0"
                >
                  <span className="text-[10px] font-medium text-slate-700">
                    {skill.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100">
                      {getExpText(skill)}
                    </span>
                    {renderStars(skill.rating)}
                  </div>
                </div>
              ))}
          </div>
        </SCard>
      )}
    </div>
  );
};