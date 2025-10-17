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
import { generateDocx, generatePdf } from "@/utils/cvGenerator"; // Import the new functions

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

  // --- START: New Query to fetch enriched skills ---
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

  // --- Add this hook near the top of the component ---

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
  // --- END: New Query and Skill Grouping Logic ---

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
        icon: Building,
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
      { icon: Factory, label: "Industry", value: candidate.industry },
      {
        icon: GraduationCap,
        label: "Highest Education",
        value: candidate.highest_education,
      },
    ];

    return details.filter((detail) => detail.value && detail.value.length > 0);
  }, [candidate]);

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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  if (!candidate) {
    return <div className="text-center mt-10">Candidate not found.</div>;
  }

  const professionalSummaryPoints = candidate.professional_summary; // Keep raw data
  const workExperience = parseJsonArray(candidate.work_experience);
  // --- START: Add this sorting logic ---
  const getEndYear = (duration) => {
    if (!duration || typeof duration !== "string") return 0;

    // Prioritize "Present" or "Current" jobs by giving them a future year
    if (
      duration.toLowerCase().includes("present") ||
      duration.toLowerCase().includes("current")
    ) {
      return new Date().getFullYear() + 1;
    }

    // Find all 4-digit numbers (years) in the string
    const years = duration.match(/\d{4}/g);
    if (!years) return 0;

    // Return the highest year found (handles "2021-2023" correctly)
    return Math.max(...years.map((year) => parseInt(year, 10)));
  };

  // Create a new sorted array to avoid modifying the original data directly
  const sortedWorkExperience = [...workExperience].sort((a, b) => {
    const yearB = getEndYear(b.duration);
    const yearA = getEndYear(a.duration);
    return yearB - yearA; // Sorts in descending order (most recent first)
  });
  // --- END: Sorting Logic ---
  const education = parseJsonArray(candidate.education);
  const certifications = parseJsonArray(candidate.certifications);
  // const topSkills = parseJsonArray(candidate.top_skills);
  const projects = parseJsonArray(candidate.projects);
  const resumeFileName = candidate.candidate_name
    ? `${candidate.candidate_name.replace(/\s+/g, "_")}_Resume.pdf`
    : "resume.pdf";

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

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-8xl px-4 py-3 md:px-6 md:py-6">
        <div className="sticky top-0 z-40 -mx-4 mb-4 border-b border-slate-200/60 bg-slate-50/80 backdrop-blur-lg md:-mx-6">
          <div className="mx-auto flex w-full max-w-8xl items-center justify-between px-4 py-2 md:px-6">
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
                size="sm"
                variant="outline"
                onClick={() => setCompareModalOpen(true)}
                className="gap-1.5 text-xs h-8"
              >
                <ScanSearch className="h-3.5 w-3.5" /> Compare
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="gap-1.5 text-xs h-8">
                    <Download className="h-3.5 w-3.5" /> Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => generateDocx(candidate)}>
                    Standard Format (DOCX)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => generatePdf(candidate)}>
                    Standard Format (PDF)
                  </DropdownMenuItem>
                  {candidate.resume_path && (
                    <a href={candidate.resume_path} download={resumeFileName}>
                      <DropdownMenuItem>Download Original CV</DropdownMenuItem>
                    </a>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs h-8 bg-violet-600 text-white hover:bg-violet-700 hover:text-white"
                onClick={() => setEnrichModalOpen(true)}
              >
                <Sparkles className="h-3.5 w-3.5" /> Enrich
              </Button>
            </div>
          </div>
        </div>

        <Card className="mb-5 overflow-hidden border-slate-200/60 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row md:items-start gap-4">
              <div className="grid h-16 w-16 flex-shrink-0 place-items-center rounded-lg bg-violet-100 text-2xl font-bold text-violet-600">
                {candidate.candidate_name?.charAt(0)}
              </div>
              <div className="flex-grow">
                <h1 className="text-lg font-bold text-slate-900">
                  {candidate.candidate_name}
                </h1>
                <p className="text-sm text-slate-600 -mt-0.5">
                  {candidate.suggested_title}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  {candidate.linkedin_url && (
                    <a
                      href={
                        candidate.linkedin_url.startsWith("http")
                          ? candidate.linkedin_url
                          : `https://${candidate.linkedin_url}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="group inline-flex items-center gap-1.5 text-slate-600 hover:text-violet-700"
                    >
                      <Linkedin className="h-3.5 w-3.5 text-slate-400" />{" "}
                      LinkedIn
                    </a>
                  )}
                  {candidate.email && (
                    <a
                      href={`mailto:${candidate.email}`}
                      className="group inline-flex items-center gap-1.5 text-slate-600 hover:text-violet-700"
                    >
                      <Mail className="h-3.5 w-3.5 text-slate-400" />{" "}
                      {candidate.email}
                    </a>
                  )}
                  {candidate.phone && (
                    <span className="inline-flex items-center gap-1.5 text-slate-600">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />{" "}
                      {candidate.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {keyDetails.length > 0 && (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-3 gap-y-2 rounded-lg border border-slate-200/60 bg-slate-50/50 p-2.5">
                {keyDetails.map((detail) => (
                  <div key={detail.label} className="flex items-center gap-2">
                    <detail.icon className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] font-medium text-slate-500">
                        {detail.label}
                      </p>
                      <p
                        className="text-xs font-semibold text-slate-800 truncate"
                        title={detail.value}
                      >
                        {detail.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="space-y-5 lg:col-span-2">
          <Card className="border-slate-200/60 shadow-sm">
    <CardHeader className="p-3">
      <CardTitle className="text-sm font-semibold text-slate-900">
        Top Skills
      </CardTitle>
    </CardHeader>
    <CardContent className="p-0">
      {isLoadingEnrichedSkills ? (
        <p className="p-3 text-xs text-slate-500">
          Loading skills...
        </p>
      ) : (
        (() => {
          const entries = Object.entries(sortedGroupedSkills);
          const totalSkills = entries.reduce((acc, [, skills]) => acc + skills.length, 0);
          const half = Math.ceil(entries.length / 2);
          const firstHalf = entries.slice(0, half);
          const secondHalf = entries.slice(half);
          const renderTable = (tableEntries) => (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50">
                  <th className="w-1/3 text-left px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    Skills
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableEntries.map(([groupKey, skills]) => (
                  <tr
                    key={groupKey}
                    className="border-t border-slate-100"
                  >
                    <td className="px-3 py-2 align-top font-medium text-[8px] text-slate-600">
                      {groupKey}
                    </td>
                    <td className="px-3 text-[8px] py-2">
                      <div className="flex flex-wrap gap-1">
                        {skills.map((skill) => (
                          <div
                            key={skill.name}
                            className="relative group"
                          >
                            <Badge
                              variant="secondary"
                              className="bg-violet-50 text-violet-700 font-medium text-[8px] px-2 py-0.5 ring-1 ring-inset ring-violet-200/80 cursor-default"
                            >
                              {skill.name}
                            </Badge>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-max max-w-xs p-2 rounded-md bg-slate-800 text-white text-xs shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 pointer-events-none">
                              <p className="text-white text-[11px] leading-snug">
                                {skill.description}
                              </p>
                              <div className="absolute left-1/2 -translate-x-1/2 bottom-[-4px] h-2 w-2 bg-slate-800 rotate-45"></div>
                            </div>
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

            <Card className="border-slate-200/60 shadow-sm">
              <CardHeader className="p-3">
                <CardTitle className="text-sm font-semibold text-slate-900">
                  About
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 text-sm text-slate-600 space-y-2 leading-relaxed">
                {renderAboutContent()}
              </CardContent>
            </Card>

            {sortedWorkExperience.length > 0 && (
              <Card className="border-slate-200/60 shadow-sm">
                <CardHeader className="p-3">
                  <CardTitle className="text-sm font-semibold text-slate-900">
                    Work Experience
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="relative pl-2.5">
                    <div className="absolute left-6 top-1 h-full w-0.5 bg-slate-200" />
                    <div className="space-y-5">
                      {sortedWorkExperience.map((exp: any) => (
                        <div
                          key={`${exp.company}-${exp.designation}`}
                          className="relative pl-9"
                        >
                          <div className="absolute left-0 top-0.5 grid h-8 w-8 place-items-center rounded-full bg-violet-100 text-xs font-bold text-violet-600 ring-4 ring-white">
                            {exp.company?.charAt(0) || "W"}
                          </div>
                          <p className="text-xs font-semibold text-violet-600">
                            {exp.duration}
                          </p>
                          <h3 className="font-semibold text-sm text-slate-800">
                            {exp.designation}
                          </h3>
                          <p className="text-xs text-slate-500 -mt-0.5">
                            {exp.company}
                          </p>
                          <ul className="mt-1 list-disc pl-3.5 text-xs text-slate-600 space-y-1">
                            {exp.responsibilities?.map(
                              (resp: string, i: number) => (
                                <li key={i}>{resp}</li>
                              )
                            )}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {parseJsonArray(candidate.projects).length > 0 && (
              <Card className="border-slate-200/60 shadow-sm">
                <CardHeader className="p-3">
                  <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Projects
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="divide-y divide-slate-100">
                    {parseJsonArray(candidate.projects).map(
                      (proj: any, index: number) => (
                        <div key={index} className="py-2 first:pt-0 last:pb-0">
                          <h3 className="font-semibold text-xs text-slate-800">
                            {proj.name}
                          </h3>
                          <p className="mt-0.5 text-xs text-slate-500 leading-normal">
                            {proj.description}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {candidate.other_details &&
              Object.keys(candidate.other_details).length > 0 && (
                <Card className="border-slate-200/60 shadow-sm">
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Other Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="space-y-3">
                      {Object.entries(candidate.other_details).map(
                        ([key, value]) =>
                          Array.isArray(value) &&
                          value.length > 0 && (
                            <div key={key}>
                              <h3 className="font-semibold text-xs text-slate-800 mb-1">
                                {key}
                              </h3>
                              <ul className="list-disc pl-3.5 space-y-1 text-xs text-slate-600">
                                {value.map((item, index) => (
                                  <li key={index}>{item}</li>
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

          <div className="space-y-5">
            {parseJsonArray(candidate.education).length > 0 && (
              <Card className="border-slate-200/60 shadow-sm">
                <CardHeader className="p-3">
                  <CardTitle className="text-sm font-semibold text-slate-900">
                    Education
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 divide-y divide-slate-100">
                  {parseJsonArray(candidate.education).map(
                    (edu: any, index: number) => (
                      <div key={index} className="py-2 first:pt-0 last:pb-0">
                        <p className="font-semibold text-xs text-slate-800">
                          {edu.degree}
                        </p>
                        <p className="text-xs text-slate-500">
                          {edu.institution}
                        </p>
                        {edu.year && (
                          <p className="text-[11px] text-slate-400">
                            {edu.year}
                          </p>
                        )}
                      </div>
                    )
                  )}
                </CardContent>
              </Card>
            )}

            {parseJsonArray(candidate.certifications).length > 0 && (
              <Card className="border-slate-200/60 shadow-sm">
                <CardHeader className="p-3">
                  <CardTitle className="text-sm font-semibold">
                    Certifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <ul className="space-y-1.5">
                    {parseJsonArray(candidate.certifications).map(
                      (cert, index) => (
                        <li
                          key={index}
                          className="flex items-center gap-2 text-xs"
                        >
                          <Award className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                          <span className="text-slate-700">{cert}</span>
                        </li>
                      )
                    )}
                  </ul>
                </CardContent>
              </Card>
            )}

            {(isLoadingRelated ||
              (relatedCandidates && relatedCandidates.length > 0)) && (
              <Card className="border-slate-200/60 shadow-sm">
                <CardHeader className="p-3">
                  <CardTitle className="text-sm font-semibold text-slate-900">
                    Related Candidates
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-1.5 pt-0">
                  {isLoadingRelated ? (
                    <div className="space-y-1 p-1.5">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-slate-100 animate-pulse"></div>
                          <div className="flex-grow space-y-1">
                            <div className="h-2.5 w-3/4 rounded bg-slate-100 animate-pulse"></div>
                            <div className="h-2 w-1/2 rounded bg-slate-100 animate-pulse"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {relatedCandidates.map((rel_candidate) => (
                        <div key={rel_candidate.id} className="relative group">
                          <Link
                            to={`/talent-pool/${rel_candidate.id}`}
                            className="flex items-center gap-2 rounded-md p-1.5 transition-colors hover:bg-slate-100"
                          >
                            <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                              {rel_candidate.candidate_name?.charAt(0)}
                            </div>
                            <div className="flex-grow overflow-hidden">
                              <p className="truncate text-xs font-semibold text-slate-800">
                                {rel_candidate.candidate_name}
                              </p>
                              <p className="truncate text-[11px] text-slate-500">
                                {rel_candidate.suggested_title}
                              </p>
                            </div>
                            <Badge
                              variant="secondary"
                              className="bg-slate-100 text-slate-600 text-[10px] h-4 px-1.5"
                            >
                              {rel_candidate.matching_skill_count} Matched skills
                            </Badge>
                          </Link>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-max max-w-xs p-2 rounded-md bg-slate-800 text-white text-xs shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 pointer-events-none">
                            <p className="font-semibold mb-1 border-b border-slate-600 pb-1 text-center text-[11px]">
                              Matched Skills:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {rel_candidate.matching_skills?.map((skill) => (
                                <span
                                  key={skill}
                                  className="bg-slate-600 px-1.5 py-0.5 rounded-sm text-[10px]"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-[-4px] h-2 w-2 bg-slate-800 rotate-45"></div>
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
