import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  Briefcase,
  GraduationCap,
  Award,
  Mail,
  Phone,
  Linkedin,
  Download,
  Info,
  Lightbulb,
  History,
  ScanSearch,
  Sparkles,
  Building,
  Factory,
  MapPin,
  Calendar,
  Wallet,
  Clock,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CompareWithJobDialog from "@/components/candidates/talent-pool/CompareWithJobDialog";
import AnalysisHistoryDialog from "@/components/candidates/AnalysisHistoryDialog";
import EnrichDataDialog from "@/components/candidates/talent-pool/EnrichDataDialog";
import { generateDocx, generatePdf } from "@/utils/cvGenerator";

// Helper to safely parse JSON arrays from the database
const parseJsonArray = (data: any) => {
  if (Array.isArray(data)) return data;
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  return [];
};

const CandidateProfilePage = () => {
  const { candidateId } = useParams<{ candidateId: string }>();
  const [isCompareModalOpen, setCompareModalOpen] = useState(false);
  const [isHistoryModalOpen, setHistoryModalOpen] = useState(false);
  const [isEnrichModalOpen, setEnrichModalOpen] = useState(false);
  const organizationId = useSelector(
    (state: any) => state.auth.organization_id
  );

  const { data: candidate, isLoading } = useQuery({
    queryKey: ["talentPoolCandidate", candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_talent_pool")
        .select("*")
        .eq("id", candidateId)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!candidateId,
  });

  const topSkills = useMemo(
    () => parseJsonArray(candidate?.top_skills),
    [candidate]
  );

  const { data: enrichedSkills, isLoading: isLoadingEnrichedSkills } = useQuery(
    {
      queryKey: ["enrichedSkills", topSkills],
      queryFn: async () => {
        if (!topSkills || topSkills.length === 0) return [];
        const { data, error } = await supabase.rpc("get_enriched_skills", {
          p_skill_names: topSkills,
        });
        if (error)
          throw new Error(`Error fetching enriched skills: ${error.message}`);
        return data;
      },
      enabled: !!topSkills && topSkills.length > 0,
    }
  );

  const { data: relatedCandidates, isLoading: isLoadingRelated } = useQuery({
    queryKey: ["relatedCandidates", candidateId, organizationId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_related_candidates", {
        p_candidate_id: candidateId,
        p_organization_id: organizationId,
        p_limit: 10,
      });
      if (error) {
        console.error("Error fetching related candidates:", error);
        return [];
      }
      return data;
    },
    enabled: !!candidateId && !!organizationId,
  });

  interface TimelineEvent {
    id: string;
    event_type: string;
    changed_at: string;
    talent_pool_id: string;
    changed_by_user: {
      first_name: string;
      last_name: string;
    } | null;
  }

  interface SupabaseResponse {
    data: TimelineEvent[] | null;
    error: Error | null;
  }

  const { data: timelineEvents, isLoading: isLoadingTimeline } = useQuery<TimelineEvent[]>({
    queryKey: ["candidateTimeline", candidateId],
    queryFn: async () => {
      console.log("Fetching timeline for candidateId:", candidateId);

      const { data, error } = await supabase
        .from("hr_talent_pool_timeline")
        .select("*, changed_by_user:hr_employees(first_name, last_name)") 
        .eq("talent_pool_id", candidateId)
        .order("changed_at", { ascending: false });

      console.log("Data returned from Supabase:", data);

      if (error) {
        console.error("Error fetching timeline:", error);
        return [];
      }
      return data ?? [];
    },
    enabled: !!candidateId,
  });

  const groupedSkills = useMemo(() => {
    if (!enrichedSkills || !topSkills) return {};
    const enrichedSkillMap = new Map(
      enrichedSkills.map((skill) => [
        skill.skill_name.trim().toLowerCase(),
        skill,
      ])
    );

    const groups = topSkills.reduce((acc, rawSkill) => {
      const skillKey = rawSkill.trim().toLowerCase();
      const enriched = enrichedSkillMap.get(skillKey);

      if (enriched) {
        const groupKey = `${enriched.category || "Other"}`;
        if (!acc[groupKey]) acc[groupKey] = [];
        if (!acc[groupKey].some((s) => s.name === enriched.normalized_name)) {
          acc[groupKey].push({
            name: enriched.normalized_name,
            description: enriched.description,
          });
        }
      } else {
        const groupKey = "Other Skills (General)";
        if (!acc[groupKey]) acc[groupKey] = [];
        if (!acc[groupKey].some((s) => s.name === rawSkill)) {
          acc[groupKey].push({
            name: rawSkill,
            description: "No description available.",
          });
        }
      }
      return acc;
    }, {} as Record<string, { name: string; description: string }[]>);

    return groups;
  }, [enrichedSkills, topSkills]);

  const sortedGroupedSkills = useMemo(() => {
    const entries = Object.entries(groupedSkills);
    const otherSkillsEntry = entries.find(([key]) =>
      key.startsWith("Other Skills")
    );
    const sortedEntries = entries
      .filter(([key]) => !key.startsWith("Other Skills"))
      .sort(([a], [b]) => a.localeCompare(b));

    if (otherSkillsEntry) {
      sortedEntries.push(otherSkillsEntry);
    }

    return Object.fromEntries(sortedEntries);
  }, [groupedSkills]);

  // Helper function to sort work experience by end date
  const getEndYear = (duration: string) => {
    if (!duration || typeof duration !== "string") return 0;
    if (
      duration.toLowerCase().includes("present") ||
      duration.toLowerCase().includes("current")
    ) {
      return new Date().getFullYear() + 1;
    }
    const years = duration.match(/\d{4}/g);
    if (!years) return 0;
    return Math.max(...years.map((year) => parseInt(year, 10)));
  };

  const sortedWorkExperience = useMemo(() => {
    const workExp = parseJsonArray(candidate?.work_experience);
    return [...workExp].sort((a, b) => {
      const yearB = getEndYear(b.duration || b.end_date || "");
      const yearA = getEndYear(a.duration || a.end_date || "");
      return yearB - yearA;
    });
  }, [candidate]);

  const keyDetails = useMemo(() => {
    if (!candidate) return [];

    const details = [
      {
        icon: Briefcase,
        label: "Experience",
        value: candidate.total_experience,
      },
      {
        icon: Calendar,
        label: "Notice Period",
        value: candidate.notice_period,
      },
      {
        icon: Factory,
        label: "Current Company",
        value: candidate.current_company,
      },
      {
        icon: Briefcase,
        label: "Current Role",
        value: candidate.current_designation,
      },
      {
        icon: MapPin,
        label: "Current Location",
        value: candidate.current_location,
      },
      {
        icon: MapPin,
        label: "Preferred Locations",
        value: parseJsonArray(candidate.preferred_locations).join(", "),
      },
      {
        icon: Wallet,
        label: "Current Salary",
        value: candidate.current_salary,
      },
      {
        icon: Wallet,
        label: "Expected Salary",
        value: candidate.expected_salary,
      },
      {
        icon: GraduationCap,
        label: "Highest Education",
        value: candidate.highest_education,
      },
    ];

    return details.filter((detail) => detail.value);
  }, [candidate]);

  const professionalSummaryPoints = candidate?.professional_summary;

  const renderAboutContent = () => {
    const summaryArray = parseJsonArray(professionalSummaryPoints);
    if (summaryArray.length > 0) {
      return summaryArray.map((point, index) => <p key={index}>{point}</p>);
    }
    if (
      typeof professionalSummaryPoints === "string" &&
      professionalSummaryPoints.trim() !== ""
    ) {
      return <p>{professionalSummaryPoints}</p>;
    }
    return (
      <p className="text-gray-500">No summary available for this candidate.</p>
    );
  };

  // Enhanced projects processing
  const processedProjects = useMemo(() => {
    const rawProjects = parseJsonArray(candidate?.projects);
    return rawProjects.map((proj: any) => {
      if (typeof proj === 'string') {
        const lines = proj.split('\n');
        const name = lines[0]?.trim() || 'Untitled Project';
        const description = lines.slice(1).join('\n').trim();
        return { name, description, technologies: [] };
      } else if (typeof proj === 'object' && proj !== null) {
        const name = proj.name || proj.title || 'Untitled Project';
        const description = proj.description || '';
        const technologies = proj.technologies || [];
        return { name, description, technologies };
      }
      return { name: 'Untitled Project', description: '', technologies: [] };
    }).filter(proj => proj.description || proj.name !== 'Untitled Project');
  }, [candidate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-500">Candidate not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-screen-8xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header - STICKY */}
        <div className="sticky top-0 z-20 bg-white border-b border-slate-200 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 mb-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
         <Button
                variant="ghost"
                size="icon"
                onClick={() => window.history.back()}
                className="h-8 w-8 rounded-full"
              >
                <ArrowLeft className="h-4 w-4 text-slate-600" />
              </Button>
              <div>
                <p className="text-xs font-semibold text-slate-800">
                  {candidate.candidate_name}
                </p>
                <p className="text-xs text-slate-500 -mt-0.5">
                  {candidate.suggested_title}
                </p>
              </div>
              </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCompareModalOpen(true)}
              className="gap-2"
            >
              <ScanSearch className="h-4 w-4" />
              Compare
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHistoryModalOpen(true)}
              className="gap-2"
            >
              <History className="h-4 w-4" />
              History
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEnrichModalOpen(true)}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Enrich
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => generatePdf(candidate)}>
                  Download as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => generateDocx(candidate)}>
                  Download as DOCX
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Candidate Card */}
        <Card className="border-slate-200 bg-white shadow-md mb-8">
          <CardContent className="p-6">
            <div className="flex gap-6">
              <div className="grid h-20 w-20 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-purple-500 to-purple-600 text-3xl font-bold text-white shadow-lg">
                {candidate.candidate_name?.charAt(0)}
              </div>
              <div className="flex-grow">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                      {candidate.candidate_name}
                    </h1>
                    <p className="mt-1 text-base text-slate-600">
                      {candidate.suggested_title}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
                  {candidate.email && (
                    <a
                      href={`mailto:${candidate.email}`}
                      className="flex items-center gap-1.5 hover:text-purple-600 transition-colors"
                    >
                      <Mail className="h-4 w-4" />
                      {candidate.email}
                    </a>
                  )}
                  {candidate.phone && (
                    <a
                      href={`tel:${candidate.phone}`}
                      className="flex items-center gap-1.5 hover:text-purple-600 transition-colors"
                    >
                      <Phone className="h-4 w-4" />
                      {candidate.phone}
                    </a>
                  )}
                  {candidate.linkedin_url && (
                    <a
                      href={candidate.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 hover:text-purple-600 transition-colors"
                    >
                      <Linkedin className="h-4 w-4" />
                      LinkedIn Profile
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Details in single long box */}
            <div className="mt-6 border border-slate-200 rounded-lg bg-slate-50/30 p-4">
              <div className="flex flex-wrap gap-x-8 gap-y-3">
                {keyDetails.map((detail, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2"
                  >
                    <div className="rounded-md bg-white p-1.5 text-slate-600 shadow-sm">
                      <detail.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500">
                        {detail.label}
                      </p>
                      <p className="text-sm font-semibold text-slate-900">
                        {detail.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* IMPROVED SECTIONS START HERE */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Main Content (2/3 width) */}
          <div className="space-y-6 lg:col-span-2">
            {/* Top Skills Section - COMPACT TABLE WITH NEW UI */}
            <Card className="border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-5">
                <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-3">
                  <div className="rounded-lg bg-purple-100 p-2">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                  </div>
                  Top Skills
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                {isLoadingEnrichedSkills ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="space-y-2">
                        <div className="h-4 w-32 rounded bg-slate-100 animate-pulse"></div>
                        <div className="flex flex-wrap gap-2">
                          {[...Array(4)].map((_, j) => (
                            <div
                              key={j}
                              className="h-8 w-20 rounded-full bg-slate-100 animate-pulse"
                            ></div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : Object.keys(sortedGroupedSkills).length === 0 ? (
                  <p className="text-sm text-slate-500">No skills available.</p>
                ) : (
                  (() => {
                    const entries = Object.entries(sortedGroupedSkills);
                    const totalSkills = entries.reduce((acc, [, skills]) => acc + skills.length, 0);
                    const half = Math.ceil(entries.length / 2);
                    const firstHalf = entries.slice(0, half);
                    const secondHalf = entries.slice(half);
                    const renderTable = (tableEntries: [string, { name: string; description: string }[]][]) => (
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="w-1/3 text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                              Category
                            </th>
                            <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                              Skills
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {tableEntries.map(([groupKey, skills]) => (
                            <tr
                              key={groupKey}
                              className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                            >
                              <td className="px-3 py-2 align-top font-medium text-xs text-slate-600">
                                {groupKey}
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex flex-wrap gap-1">
                                  {skills.map((skill) => (
                                    <div
                                      key={skill.name}
                                      className="relative group"
                                    >
                                      <Badge
                                        variant="secondary"
                                        className="cursor-help px-2 py-0.5 text-xs font-medium bg-purple-500 text-white border-0 shadow-sm hover:shadow hover:bg-purple-400 transition-all duration-200"
                                      >
                                        {skill.name}
                                      </Badge>
                                      {skill.description && skill.description !== "No description available." && (
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-max max-w-xs p-2 rounded-md bg-slate-800 text-white text-xs shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 pointer-events-none whitespace-pre-wrap">
                                          <p className="leading-tight">
                                            {skill.description}
                                          </p>
                                          <div className="absolute left-1/2 -translate-x-1/2 bottom-[-4px] h-2 w-2 bg-slate-800 rotate-45"></div>
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
                    if (totalSkills <= 5) {
                      return renderTable(entries);
                    } else {
                      return (
                        <div className="grid grid-cols-2 gap-4">
                          <div>{renderTable(firstHalf)}</div>
                          <div>{renderTable(secondHalf)}</div>
                        </div>
                      );
                    }
                  })()
                )}
              </CardContent>
            </Card>

            {/* About Section - IMPROVED */}
            <Card className="border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-5">
                <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-3">
                  <div className="rounded-lg bg-blue-100 p-2">
                    <Info className="h-5 w-5 text-blue-600" />
                  </div>
                  About
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className="text-sm text-slate-700 leading-relaxed space-y-2">
                  {renderAboutContent()}
                </div>
              </CardContent>
            </Card>

            {/* Work Experience - IMPROVED */}
            {sortedWorkExperience.length > 0 && (
                <Card className="border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
                  <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-5">
                    <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-3">
                      <div className="rounded-lg bg-green-100 p-2">
                        <Briefcase className="h-5 w-5 text-green-600" />
                      </div>
                      Work Experience
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5">
                    <div className="relative pl-8">
                      {/* Timeline line */}
                      <div className="absolute left-4 top-3 h-[calc(100%-24px)] w-0.5 bg-gradient-to-b from-slate-300 via-slate-200 to-transparent" />
                      
                      <div className="space-y-6">
                        {sortedWorkExperience.map((exp: any, index: number) => {
                          const title = exp.designation || exp.title;
                          const company = exp.company;
                          const duration = exp.duration || 
                            (exp.start_date && exp.end_date 
                              ? `${exp.start_date} - ${exp.end_date}`
                              : exp.start_date || exp.end_date || "");
                          const responsibilities = parseJsonArray(exp.responsibilities);
                          const description = exp.description;
                          
                          return (
                            <div key={index} className="relative group/exp">
                              {/* Timeline dot */}
                              <div className="absolute -left-8 top-1.5 h-4 w-4 rounded-full bg-white border-2 border-purple-500 shadow-sm group-hover/exp:border-purple-600 group-hover/exp:shadow-md transition-all duration-200"></div>
                              
                              <div className="rounded-lg border border-slate-100 bg-gradient-to-br from-white to-slate-50/50 p-4 hover:border-purple-200 hover:shadow-sm transition-all duration-200">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-grow">
                                    <h3 className="text-base font-bold text-slate-900">
                                      {title}
                                    </h3>
                                    <p className="mt-1 text-sm font-medium text-purple-600 flex items-center gap-1">
                                      <Building className="h-3.5 w-3.5" />
                                      {company}
                                    </p>
                                  </div>
                                  {duration && (
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                                      <Calendar className="h-3.5 w-3.5" />
                                      <span>{duration}</span>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Show responsibilities as bullet points if available */}
                                {responsibilities.length > 0 && (
                                  <ul className="mt-3 list-disc pl-5 text-sm text-slate-600 space-y-1.5 leading-relaxed">
                                    {responsibilities.map((resp: string, i: number) => (
                                      <li key={i}>{resp}</li>
                                    ))}
                                  </ul>
                                )}
                                
                                {/* Show description as paragraph if available and no responsibilities */}
                                {!responsibilities.length && description && (
                                  <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                                    {description}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

            {/* Education - IMPROVED */}
            {candidate.education &&
              parseJsonArray(candidate.education).length > 0 && (
                <Card className="border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
                  <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-5">
                    <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-3">
                      <div className="rounded-lg bg-indigo-100 p-2">
                        <GraduationCap className="h-5 w-5 text-indigo-600" />
                      </div>
                      Education
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5">
                    <div className="space-y-4">
                      {parseJsonArray(candidate.education).map(
                        (edu: any, index: number) => (
                          <div
                            key={index}
                            className="rounded-lg border border-slate-100 bg-gradient-to-br from-white to-slate-50/50 p-4 hover:border-indigo-200 hover:shadow-sm transition-all duration-200"
                          >
                            <h3 className="text-base font-bold text-slate-900">
                              {edu.degree}
                            </h3>
                            <p className="mt-1 text-sm font-medium text-indigo-600">
                              {edu.institution}
                            </p>
                            {edu.year && (
                              <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {edu.year}
                              </p>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

            {/* Certifications - IMPROVED */}
            {candidate.certifications &&
              parseJsonArray(candidate.certifications).length > 0 && (
                <Card className="border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
                  <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-5">
                    <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-3">
                      <div className="rounded-lg bg-amber-100 p-2">
                        <Award className="h-5 w-5 text-amber-600" />
                      </div>
                      Certifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {parseJsonArray(candidate.certifications).map(
                        (cert: string, index: number) => (
                          <div
                            key={index}
                            className="rounded-lg border border-slate-100 bg-gradient-to-br from-white to-amber-50/30 p-3 hover:border-amber-200 hover:shadow-sm transition-all duration-200"
                          >
                            <div className="flex items-start gap-2">
                              <Award className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                              <p className="text-sm font-medium text-slate-800 leading-relaxed">
                                {cert}
                              </p>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

            {/* Projects - IMPROVED */}
            {processedProjects.length > 0 && (
                <Card className="border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
                  <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-5">
                    <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-3">
                      <div className="rounded-lg bg-teal-100 p-2">
                        <Lightbulb className="h-5 w-5 text-teal-600" />
                      </div>
                      Projects
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5">
                    <div className="space-y-4">
                      {processedProjects.map((proj: any, index: number) => (
                        <div
                          key={index}
                          className="rounded-lg border border-slate-100 bg-gradient-to-br from-white to-slate-50/50 p-4 hover:border-teal-200 hover:shadow-sm transition-all duration-200"
                        >
                          <h3 className="text-base font-bold text-slate-900">
                            {proj.name}
                          </h3>
                          {proj.description && (
                            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                              {proj.description}
                            </p>
                          )}
                          {proj.technologies && proj.technologies.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs font-medium text-slate-500 mb-2">Technologies:</p>
                              <div className="flex flex-wrap gap-1">
                                {proj.technologies.map((tech: string, techIdx: number) => (
                                  <Badge key={techIdx} variant="secondary" className="text-xs">
                                    {tech}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

            {/* Other Details - IMPROVED */}
            {candidate.other_details &&
              Object.keys(candidate.other_details).length > 0 && (
                <Card className="border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
                  <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-5">
                    <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-3">
                      <div className="rounded-lg bg-cyan-100 p-2">
                        <Info className="h-5 w-5 text-cyan-600" />
                      </div>
                      Other Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5">
                    <div className="space-y-4">
                      {Object.entries(candidate.other_details).map(
                        ([key, value]) =>
                          Array.isArray(value) &&
                          value.length > 0 && (
                            <div key={key} className="rounded-lg border border-slate-100 bg-gradient-to-br from-white to-slate-50/50 p-4">
                              <h3 className="text-sm font-bold text-slate-800 mb-2 uppercase tracking-wide">
                                {key}
                              </h3>
                              <ul className="space-y-1.5">
                                {value.map((item, index) => (
                                  <li key={index} className="flex items-start gap-2 text-sm text-slate-600">
                                    <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
          </div>

          {/* Right Column - Sidebar (1/3 width) */}
          <div className="space-y-6">
                         {/* Candidate Timeline - IMPROVED */}
            {(isLoadingTimeline ||
              (timelineEvents && timelineEvents.length > 0)) && (
              <Card className="border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-5">
                  <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-3">
                    <div className="rounded-lg bg-orange-100 p-2">
                      <History className="h-5 w-5 text-orange-600" />
                    </div>
                    Candidate Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  {isLoadingTimeline ? (
                    <div className="space-y-4">
                      {[...Array(2)].map((_, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="h-10 w-10 rounded-full bg-slate-100 animate-pulse flex-shrink-0"></div>
                          <div className="flex-grow space-y-2">
                            <div className="h-3 w-3/4 rounded bg-slate-100 animate-pulse"></div>
                            <div className="h-2.5 w-1/2 rounded bg-slate-100 animate-pulse"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-5 top-5 h-[calc(100%-40px)] w-0.5 bg-gradient-to-b from-orange-200 via-orange-100 to-transparent" />
                      <div className="space-y-5">
                        {timelineEvents.map((event, index) => (
                          <div key={event.id} className="relative pl-12">
                            <div className="absolute left-0 top-0.5 grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-orange-100 to-orange-50 text-orange-600 ring-4 ring-white shadow-sm">
                              <Clock className="h-4 w-4" />
                            </div>
                            <div className="rounded-lg border border-slate-100 bg-gradient-to-br from-white to-slate-50/50 p-3 hover:border-orange-200 hover:shadow-sm transition-all duration-200">
                              <p className="font-semibold text-sm text-slate-900">
                                {event.event_type}
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                by{" "}
                                <span className="font-medium text-slate-700">
                                  {event.changed_by_user
                                    ? `${event.changed_by_user.first_name} ${event.changed_by_user.last_name}`
                                    : "System"}
                                </span>
                              </p>
                              <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(event.changed_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Related Candidates - IMPROVED */}
            {(isLoadingRelated ||
              (relatedCandidates && relatedCandidates.length > 0)) && (
              <Card className="border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 sticky top-6">
                <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-5">
                  <CardTitle className="text-lg font-bold text-slate-900">
                    Related Candidates
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  {isLoadingRelated ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-3">
                          <div className="h-10 w-10 rounded-full bg-slate-100 animate-pulse"></div>
                          <div className="flex-grow space-y-2">
                            <div className="h-3 w-3/4 rounded bg-slate-100 animate-pulse"></div>
                            <div className="h-2.5 w-1/2 rounded bg-slate-100 animate-pulse"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {relatedCandidates.map((rel_candidate) => (
                        <div key={rel_candidate.id} className="relative group/candidate">
                          <Link
                            to={`/talent-pool/${rel_candidate.id}`}
                            className="flex items-center gap-3 rounded-lg p-3 transition-all hover:bg-gradient-to-r hover:from-purple-50 hover:to-transparent border border-transparent hover:border-purple-100"
                          >
                            <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-purple-100 to-purple-50 text-sm font-bold text-purple-700 shadow-sm">
                              {rel_candidate.candidate_name?.charAt(0)}
                            </div>
                            <div className="flex-grow overflow-hidden">
                              <p className="truncate text-sm font-semibold text-slate-900 group-hover/candidate:text-purple-700 transition-colors">
                                {rel_candidate.candidate_name}
                              </p>
                              <p className="truncate text-xs text-slate-500 mt-0.5">
                                {rel_candidate.suggested_title}
                              </p>
                            </div>
                            <Badge
                              variant="secondary"
                              className="bg-purple-100 text-purple-700 text-[10px] h-5 px-2 font-semibold shrink-0"
                            >
                              {rel_candidate.matching_skill_count}
                            </Badge>
                          </Link>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs p-3 rounded-lg bg-slate-900 text-white text-xs shadow-xl opacity-0 group-hover/candidate:opacity-100 transition-opacity duration-200 z-30 pointer-events-none">
                            <p className="font-semibold mb-2 border-b border-slate-700 pb-1.5 text-center">
                              Matched Skills
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {rel_candidate.matching_skills?.map((skill) => (
                                <span
                                  key={skill}
                                  className="bg-slate-700 px-2 py-1 rounded text-[10px] font-medium"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-[-4px] h-2 w-2 bg-slate-900 rotate-45"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}


          </div>
        </div>

        {candidateId && (
          <>
            <CompareWithJobDialog
              isOpen={isCompareModalOpen}
              onClose={() => setCompareModalOpen(false)}
              candidateId={candidateId}
            />
            <AnalysisHistoryDialog
              isOpen={isHistoryModalOpen}
              onClose={() => setHistoryModalOpen(false)}
              candidateId={candidateId}
              candidateName={candidate.candidate_name}
            />
            <EnrichDataDialog
              isOpen={isEnrichModalOpen}
              onClose={() => setEnrichModalOpen(false)}
              candidate={candidate}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default CandidateProfilePage;