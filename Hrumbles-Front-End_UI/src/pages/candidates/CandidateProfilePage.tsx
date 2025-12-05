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
  Linkedin, // Use Lucide Linkedin instead of FaLinkedin for consistency
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
   ChevronLeft,
  Eye,  
  FileText,     // Add this
  Banknote,  // Add this
  Star,      // Add this
  UserCheck, // Add this
} from "lucide-react";
import { Separator } from "@/components/ui/separator"; 
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "react-router-dom";
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


// Highlight Component - Same as in search results
const escapeRegExp = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const Highlight: FC<{ text: string; query: string[] }> = ({ text, query }) => {
  if (!query.length || !text) {
    return <span>{text}</span>;
  }
  const escapedQuery = query.map(term => escapeRegExp(term));
  const regex = new RegExp(`(${escapedQuery.join('|')})`, 'gi');
  
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 text-black px-1 rounded-sm">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
};

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
  const [searchParams] = useSearchParams(); // ADD THIS LINE
  const [isCompareModalOpen, setCompareModalOpen] = useState(false);
  const [isHistoryModalOpen, setHistoryModalOpen] = useState(false);
  const [isEnrichModalOpen, setEnrichModalOpen] = useState(false);
  const organizationId = useSelector(
    (state: any) => state.auth.organization_id
  );


const highlightQuery = useMemo(() => {
  const keywords = searchParams.get('keywords');
  return keywords ? keywords.split(',').filter(Boolean) : [];
}, [searchParams]);
  
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

  console.log("candidatetalent", candidate);

  const resumeFileName = candidate?.resume_path?.split('/').pop() || 'resume';

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

  // Query to check button permission for talent_exportbutton
  const { data: exportPermission, isLoading: isPermissionLoading } = useQuery({
    queryKey: ["exportPermission", organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const { data, error } = await supabase
        .from("button_permissions")
        .select("is_enabled")
        .eq("organization_id", organizationId)
        .eq("permission_type", "talent_exportbutton")
        .single();
      if (error || !data) return null;
      return data.is_enabled;
    },
    enabled: !!organizationId,
  });

  const hasExportPermission = exportPermission === true && !isPermissionLoading;

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


// ... (after sortedWorkExperience useMemo block)

  // --- START NEW WORK HISTORY LOGIC ---
  const [currentWorkPage, setCurrentWorkPage] = useState(0);
  const ITEMS_PER_PAGE = 4;
  
  const workExpTotalPages = Math.ceil(sortedWorkExperience.length / ITEMS_PER_PAGE);
  const showWorkExpNavigation = workExpTotalPages > 1;
  
  const currentWorkItems = sortedWorkExperience.slice(
    currentWorkPage * ITEMS_PER_PAGE,
    (currentWorkPage + 1) * ITEMS_PER_PAGE
  );

  const handleWorkPrev = () => {
    setCurrentWorkPage((prev) => Math.max(prev - 1, 0));
  };

  const handleWorkNext = () => {
    setCurrentWorkPage((prev) => Math.min(prev + 1, workExpTotalPages - 1));
  };

  const getGridColsClass = (itemCount: number) => {
    switch (itemCount) {
      case 1: return "grid-cols-1";
      case 2: return "grid-cols-2";
      case 3: return "grid-cols-3";
      default: return "grid-cols-4";
    }
  };
  const gridColsClass = getGridColsClass(currentWorkItems.length);

  // Animation style for the "Next" button
  const solidPurpleBounceAnimation = `
    @keyframes solid-purple-bounce {
      0%, 100% { transform: translateX(0) scale(1); background-color: #7E22CE; animation-timing-function: cubic-bezier(0.8, 0, 1, 1); }
      50% { transform: translateX(6px) scale(1.05); background-color: #7E22CE; animation-timing-function: cubic-bezier(0, 0, 0.2, 1); }
    }
  `;

  const nextButtonStyle = {
    animation: currentWorkPage === workExpTotalPages - 1 ? "none" : "solid-purple-bounce 1.75s infinite",
  };
  // --- END NEW WORK HISTORY LOGIC ---

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


// ... existing code ...

  const renderResumeEmbed = () => {
    if (!candidate?.resume_path) return null;

    const fileUrl = candidate.resume_path;
    // Get file extension (handle query params if presigned url)
    const extension = fileUrl.split(/[#?]/)[0].split('.').pop().trim().toLowerCase();
    
    // 1. If PDF, render native iframe
    if (extension === 'pdf') {
      return (
        <iframe 
          src={`${fileUrl}#toolbar=0`} 
          className="w-full h-[800px] rounded-md border border-slate-200"
          title="Resume PDF"
        />
      );
    } 
    
    // 2. If Image, render img tag
    if (['jpg', 'jpeg', 'png'].includes(extension)) {
      return (
        <img 
          src={fileUrl} 
          alt="Resume" 
          className="w-full h-auto rounded-md border border-slate-200"
        />
      );
    }

    // 3. If DOC/DOCX/Other, use Google Docs Viewer (Standard way to embed docs in web)
    // Note: URL must be publicly accessible for Google Docs Viewer to work.
    return (
      <iframe 
        src={`https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`}
        className="w-full h-[800px] rounded-md border border-slate-200"
        title="Resume Document"
      />
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

// Helper to format currency
  const formatINR = (amount: number | string) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return isNaN(num)
      ? "N/A"
      : new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0,
        }).format(num);
  };



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
                <Button variant="default" size="sm" className="gap-2" disabled={hasExportPermission}>
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
            {/* {candidate.resume_path && (
              <a href={!hasExportPermission ? candidate.resume_path : '#'}
                download={!hasExportPermission ? resumeFileName : undefined}
                className={hasExportPermission ? 'pointer-events-none' : ''} className="w-full">
                <Button size="sm" variant="datepicker" className="w-full flex items-center justify-center gap-2" disabled={hasExportPermission}>
                  <Download size={16} />
                  <span>View CV</span>
                </Button>
              </a>
            )} */}

          </div>
        </div>

        {/* --- REMOVED THE OLD CANDIDATE CARD HERE --- */}

        {/* New Candidate Info Card */}
        <Card className="bg-white w-full border-none shadow-xl rounded-2xl mb-8">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight text-purple-700">
                  {candidate.candidate_name}
                </h2>
             <p className="text-sm text-gray-500 mt-1">
  <Highlight text={candidate.suggested_title || ''} query={highlightQuery} />
</p>
              </div>

              <div className="flex items-center gap-3">
                {candidate.resume_path && (
                  <Button
                    size="sm"
                    className="flex items-center space-x-2 px-3 h-9 bg-purple-600 text-white shadow-lg hover:bg-purple-700"
                    disabled={hasExportPermission}
                  >
                    <span className="text-sm font-medium">Resume</span>
                    <Separator orientation="vertical" className="h-4 bg-white/30" />
                    <a
                      href={candidate.resume_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center"
                    >
                      <Eye className="w-4 h-4 cursor-pointer" title="View Resume" />
                    </a>

                    {!hasExportPermission && (
                      <Download
                        onClick={(e) => {
                          e.stopPropagation();
                          const link = document.createElement("a");
                          link.href = candidate.resume_path;
                          link.download = resumeFileName;
                          link.click();
                        }}
                        className="w-4 h-4 cursor-pointer ml-2"
                        title="Download Resume"
                      />
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <CardContent className="p-6">
            {/* Contact Info - Simple Line by Line */}
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 mb-6">
              {candidate.email && (
                <div
                  className="relative flex items-center cursor-pointer group"
                  onClick={() => {
                    navigator.clipboard.writeText(candidate.email);
                    // toast({ title: "Email Copied!" }); // Uncomment if you have toast
                  }}
                >
                  <Mail className="w-4 h-4 mr-2 text-purple-600 flex-shrink-0" />
                  <span className="text-sm text-gray-700 group-hover:text-purple-700 transition-colors">
                    {candidate.email}
                  </span>
                </div>
              )}

              {candidate.phone && (
                <div
                  className="relative flex items-center cursor-pointer group"
                  onClick={() => {
                    navigator.clipboard.writeText(candidate.phone);
                    // toast({ title: "Phone Copied!" }); // Uncomment if you have toast
                  }}
                >
                  <Phone className="w-4 h-4 mr-2 text-purple-600 flex-shrink-0" />
                  <span className="text-sm text-gray-700 group-hover:text-purple-700 transition-colors">
                    {candidate.phone}
                  </span>
                </div>
              )}

              {candidate.linkedin_url && (
                <a
                  href={candidate.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center group"
                >
                  <Linkedin className="w-4 h-4 mr-2 text-purple-600 flex-shrink-0" />
                  <span className="text-sm text-purple-700 group-hover:underline">
                    LinkedIn Profile
                  </span>
                </a>
              )}
            </div>

            <Separator className="my-6" />

            {/* Info Grid - Simple Line by Line */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6">
              {/* Total Experience */}
              <div className="flex items-center">
                <Briefcase className="w-4 h-4 mr-2 text-purple-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 uppercase">Total Experience</p>
                  <p className="text-sm font-medium text-gray-800">
                    {candidate.total_experience || "N/A"}
                  </p>
                </div>
              </div>

              {/* Relevant Experience */}
              <div className="flex items-center">
                <Star className="w-4 h-4 mr-2 text-purple-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 uppercase">Relevant Experience</p>
                  <p className="text-sm font-medium text-gray-800">
                    {/* Assuming relevant_experience exists in your DB, otherwise fallsback to Total or N/A */}
                    {candidate.relevant_experience || candidate.total_experience || "N/A"}
                  </p>
                </div>
              </div>

              {/* Current Location */}
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-2 text-purple-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 uppercase">Current Location</p>
                  <p className="text-sm font-medium text-gray-800">
                    {candidate.current_location || "N/A"}
                  </p>
                </div>
              </div>

              {/* Preferred Location */}
              <div className="flex items-center">
                <Building className="w-4 h-4 mr-2 text-purple-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 uppercase">Preferred Location</p>
                  <p className="text-sm font-medium text-gray-800">
                    {parseJsonArray(candidate.preferred_locations).join(", ") || "N/A"}
                  </p>
                </div>
              </div>

              {/* Current Salary */}
              <div className="flex items-center">
                <Banknote className="w-4 h-4 mr-2 text-purple-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 uppercase">Current Salary</p>
                  <p className="text-sm font-medium text-gray-800">
                    {candidate.current_salary ? `${formatINR(candidate.current_salary)}` : "N/A"}
                  </p>
                </div>
              </div>

              {/* Expected Salary */}
              <div className="flex items-center">
                <Banknote className="w-4 h-4 mr-2 text-purple-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 uppercase">Expected Salary</p>
                  <p className="text-sm font-medium text-gray-800">
                    {candidate.expected_salary ? `${formatINR(candidate.expected_salary)}` : "N/A"}
                  </p>
                </div>
              </div>

              {/* Notice Period */}
              <div className="flex items-center relative group">
                <Calendar className="w-4 h-4 mr-2 text-purple-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 uppercase">Notice Period</p>
                  <p className="text-sm font-medium text-gray-800">
                    {candidate.notice_period || "N/A"}
                  </p>
                </div>
              </div>

              {/* Has Offers */}
              <div className="flex items-center">
                <UserCheck className="w-4 h-4 mr-2 text-purple-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 uppercase">Has Offers</p>
                  <p className="text-sm font-medium text-gray-800">
                    {candidate.has_offers === true || candidate.has_offers === "yes" ? "Yes" : "No"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>


{/* Work History - Horizontal Timeline */}
            {sortedWorkExperience.length > 0 && (
              <Card className="border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
                <style>{solidPurpleBounceAnimation}</style>
                <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-5">
                  <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-3">
                    <div className="rounded-lg bg-purple-100 p-2">
                      <Briefcase className="h-5 w-5 text-purple-600" />
                    </div>
                    Work Experience
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 relative">
                  
                  <div className="relative px-8">
                     {/* Left Navigation Button */}
                     {showWorkExpNavigation && (
                      <button
                        onClick={handleWorkPrev}
                        disabled={currentWorkPage === 0}
                        className={`absolute left-0 top-[40px] transform -translate-y-1/2 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all
                          ${
                            currentWorkPage === 0
                              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                              : "bg-[#7E22CE] text-white hover:bg-[#6B21A8] shadow-lg"
                          }`}
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                    )}

                    {/* Right Navigation Button */}
                    {showWorkExpNavigation && (
                      <button
                        onClick={handleWorkNext}
                        disabled={currentWorkPage === workExpTotalPages - 1}
                        style={nextButtonStyle}
                        className={`absolute right-0 top-[40px] transform -translate-y-1/2 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all
                          ${
                            currentWorkPage === workExpTotalPages - 1
                              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                              : "bg-[#7E22CE] text-white hover:bg-[#6B21A8] shadow-lg"
                          }`}
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    )}

                    {/* Timeline Grid */}
                    <div className="relative py-2 mt-2">
                       {/* Purple Connecting Line */}
                       <div className="absolute top-4 left-0 w-full h-0.5 bg-purple-200"></div>

                       <div className={`grid ${gridColsClass} gap-4 relative`}>
                          {currentWorkItems.map((exp: any, index: number) => {
                             const title = exp.designation || exp.title;
                             const company = exp.company;
                             const duration = exp.duration || 
                               (exp.start_date && exp.end_date 
                                 ? `${exp.start_date} - ${exp.end_date}`
                                 : exp.start_date || exp.end_date || "N/A");

                             return (
                               <div key={index} className="flex flex-col items-center group w-full">
                                  {/* Dot */}
                                  <div className="relative z-10 w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 border-3 border-white shadow-md flex items-center justify-center mb-2 transition-all">
                                    <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                                  </div>

                                  {/* Company Name */}
                                  <div className="text-center px-1 w-full ">
                                 <p className="text-xs font-bold text-gray-900 line-clamp-2 leading-tight">
  <Highlight text={company || ''} query={highlightQuery} />
</p>
                                  </div>

                                  {/* Designation */}
                                  <div className="text-center px-1 w-full mt-0.5">
                         <p className="text-xs font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 line-clamp-2">
  <Highlight text={title || ''} query={highlightQuery} />
</p>
                                  </div>

                                   {/* Duration */}
                                   <div className="text-center px-1 w-full mb-1">
                                    <p className="text-xs text-gray-500">
                                      {duration}
                                    </p>
                                  </div>
                               </div>
                             );
                          })}
                       </div>
                    </div>
                  </div>
                  
                  {showWorkExpNavigation && (
                    <p className="text-xs text-gray-400 text-center mt-6">
                      Page {currentWorkPage + 1} of {workExpTotalPages}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
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
  <Highlight text={skill.name} query={highlightQuery} />
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



            {/* Education - IMPROVED */}
        {/* Education - COMPACT & CLEAN */}
            {candidate.education && parseJsonArray(candidate.education).length > 0 && (
              <Card className="border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-4">
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <div className="rounded-md bg-indigo-50 p-1.5">
                      <GraduationCap className="h-4 w-4 text-indigo-600" />
                    </div>
                    Education
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="relative border-l border-slate-200 ml-2 space-y-5 my-1">
                    {parseJsonArray(candidate.education).map(
                      (edu: any, index: number) => (
                        <div key={index} className="relative pl-5">
                          {/* Timeline Dot */}
                          <div className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-indigo-500 shadow-sm"></div>
                          
            <h3 className="text-sm font-bold text-slate-800 leading-tight">
  <Highlight text={edu.degree || ''} query={highlightQuery} />
</h3>
<p className="text-xs font-medium text-indigo-600 mt-0.5">
  <Highlight text={edu.institution || ''} query={highlightQuery} />
</p>
                          {edu.year && (
                            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                              <Calendar className="h-2.5 w-2.5" />
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

            {/* Certifications - COMPACT LIST */}
            {candidate.certifications && parseJsonArray(candidate.certifications).length > 0 && (
              <Card className="border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-4">
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <div className="rounded-md bg-amber-50 p-1.5">
                      <Award className="h-4 w-4 text-amber-600" />
                    </div>
                    Certifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                    {parseJsonArray(candidate.certifications).map(
                      (cert: string, index: number) => (
                        <div
                          key={index}
                          className="flex items-start gap-2 group"
                        >
                          <Award className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                          <p className="text-xs font-medium text-slate-700 leading-snug group-hover:text-amber-700 transition-colors">
                            {cert}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Projects - IMPROVED */}
            {/* {processedProjects.length > 0 && (
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
            )} */}

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

                          {candidate.resume_path && (
              <Card className="border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-3">
                      <div className="rounded-lg bg-pink-100 p-2">
                        <FileText className="h-5 w-5 text-pink-600" /> 
                        {/* Make sure to import FileText from lucide-react */}
                      </div>
                      Resume / CV
                    </CardTitle>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2"
                      onClick={() => window.open(candidate.resume_path, '_blank')}
                    >
                      <Download className="h-4 w-4" />
                      Download Original
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="bg-slate-50 rounded-lg p-1">
                     {renderResumeEmbed()}
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