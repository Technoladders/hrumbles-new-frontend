import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import {
  Shield,
  AlertTriangle,
  Info,
  FileText,
  Briefcase,
  Users,
  Calendar,
  Mail,
  Phone,
  MapPin,
  FileCheck,
  Award,
  MapPinPlus,
  Banknote,
  FileBadge,
  Eye,
  Download,
  Copy,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { FaLinkedin } from "react-icons/fa";
import { supabase } from "@/integrations/supabase/client";
import { DataSharingOptions } from "@/components/MagicLinkView/EmployeeDataSelection";
import { Candidate } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DocumentState {
  value: string;
  isVerifying: boolean;
  isVerified: boolean;
  verificationDate: string | null;
  error: string | null;
  isEditing: boolean;
}

interface ResumeAnalysis {
  overall_score: number;
  matched_skills: Array<{
    requirement: string;
    matched: string;
    details: string;
  }>;
  summary: string;
  missing_or_weak_areas: string[];
  top_skills: string[];
  development_gaps: string[];
  additional_certifications: string[];
  section_wise_scoring: Array<{
    section: string;
    weightage: number;
    submenus: Array<{
      submenu: string;
      score: number;
      remarks: string;
      weightage: number;
      weighted_score: number;
    }>;
  }>;
}

interface WorkHistory {
  company_id: number;
  company_name: string;
  designation: string;
  years: string;
}

const SharedProfile: React.FC = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [sharedDataOptions, setSharedDataOptions] = useState<DataSharingOptions | null>(null);
  const [resumeAnalysis, setResumeAnalysis] = useState<ResumeAnalysis | null>(null);
  const [workHistory, setWorkHistory] = useState<WorkHistory[]>([]);
  const [activeTab, setActiveTab] = useState<string>("resume-analysis");
  const [isCopied, setIsCopied] = useState(false);
  const [magicLink, setMagicLink] = useState<string | null>(null);

  // Documents state
  const [documents, setDocuments] = useState<{
    uan: DocumentState;
    pan: DocumentState;
    pf: DocumentState;
    esic: DocumentState;
  }>({
    uan: { value: "N/A", isVerifying: false, isVerified: false, verificationDate: null, error: null, isEditing: false },
    pan: { value: "N/A", isVerifying: false, isVerified: false, verificationDate: null, error: null, isEditing: false },
    pf: { value: "N/A", isVerifying: false, isVerified: false, verificationDate: null, error: null, isEditing: false },
    esic: { value: "N/A", isVerifying: false, isVerified: false, verificationDate: null, error: null, isEditing: false },
  });

  // Fetch shared data, resume analysis, and work history
  useEffect(() => {
    const validateAndFetchData = async () => {
      setIsLoading(true);

      try {
        const expiryParam = searchParams.get("expires");
        const jobId = searchParams.get("jobId");

        if (!shareId || !expiryParam) {
          setIsValid(false);
          setIsLoading(false);
          return;
        }

        const expiryTimestamp = parseInt(expiryParam, 10);
        if (isNaN(expiryTimestamp)) {
          setIsValid(false);
          setIsLoading(false);
          return;
        }

        const now = Date.now();
        if (now > expiryTimestamp) {
          setIsExpired(true);
          setIsValid(false);
          setIsLoading(false);
          return;
        }

        // Fetch shared data from Supabase
        const { data: shareData, error: shareError } = await supabase
          .from("shares")
          .select("data_options, candidate")
          .eq("share_id", shareId)
          .single();

        if (shareError || !shareData) {
          throw new Error("Invalid or expired share link");
        }

        const { data_options, candidate: sharedCandidate } = shareData;

        if (!isValidCandidate(sharedCandidate)) {
          throw new Error("Invalid candidate data");
        }

        setCandidate(sharedCandidate);
        setSharedDataOptions(data_options as DataSharingOptions);
        setMagicLink(`${window.location.origin}/share/${shareId}?expires=${expiryParam}${jobId ? `&jobId=${jobId}` : ""}`);
        setDocuments({
          uan: { value: sharedCandidate.metadata?.uan || "N/A", isVerifying: false, isVerified: false, verificationDate: null, error: null, isEditing: false },
          pan: { value: sharedCandidate.metadata?.pan || "N/A", isVerifying: false, isVerified: false, verificationDate: null, error: null, isEditing: false },
          pf: { value: sharedCandidate.metadata?.pf || "N/A", isVerifying: false, isVerified: false, verificationDate: null, error: null, isEditing: false },
          esic: { value: sharedCandidate.metadata?.esicNumber || "N/A", isVerifying: false, isVerified: false, verificationDate: null, error: null, isEditing: false },
        });

        // Fetch resume analysis if jobId is provided
        if (jobId) {
          const { data: resumeData, error: resumeError } = await supabase
            .from("candidate_resume_analysis")
            .select("*")
            .eq("candidate_id", sharedCandidate.id)
            .eq("job_id", jobId)
            .single();

          if (resumeError || !resumeData) {
            console.warn("No resume analysis found for candidate and job");
          } else {
            setResumeAnalysis(resumeData as ResumeAnalysis);
          }

          // Fetch work history if jobId is provided and workInfo is shared
          if (data_options.workInfo) {
            const { data: workData, error: workError } = await supabase
              .from("candidate_companies")
              .select("company_id, designation, years, companies(name)")
              .eq("candidate_id", sharedCandidate.id)
              .eq("job_id", jobId);

            if (workError || !workData) {
              console.warn("No work history found for candidate and job");
            } else {
              const formattedWorkHistory: WorkHistory[] = workData.map((item) => ({
                company_id: item.company_id,
                company_name: item.companies?.name || "Unknown Company",
                designation: item.designation || "-",
                years: item.years || "-",
              }));
              setWorkHistory(formattedWorkHistory);
            }
          }
        }

        setIsValid(true);
      } catch (error) {
        console.error("Error fetching data:", error);
        setIsValid(false);
        toast({
          title: "Error",
          description: "Failed to load shared profile, resume analysis, or work history.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    validateAndFetchData();
  }, [shareId, searchParams, toast]);

  // Type guard for candidate validation
  const isValidCandidate = (data: any): data is Candidate => {
    return (
      data &&
      typeof data === "object" &&
      typeof data.id === "string" &&
      typeof data.name === "string" &&
      (typeof data.experience === "string" || data.experience === undefined) &&
      (typeof data.matchScore === "number" || data.matchScore === undefined) &&
      (typeof data.appliedDate === "string" || data.appliedDate === undefined)
    );
  };

  // Normalize skills
  const normalizeSkills = (skills: any[] | undefined): string[] => {
    if (!skills || !skills.length) return ["N/A"];
    return skills.map((skill) => (typeof skill === "string" ? skill : skill?.name || "Unknown"));
  };

  // Format INR
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

  // Employee data
  const employee = candidate && sharedDataOptions
    ? {
        id: shareId || "unknown",
        name: sharedDataOptions.personalInfo && candidate.name ? candidate.name : "Shared Employee Profile",
        role: sharedDataOptions.personalInfo && candidate.metadata?.role ? candidate.metadata.role : "N/A",
        department: sharedDataOptions.personalInfo && candidate.metadata?.department ? candidate.metadata.department : "N/A",
        joinDate: sharedDataOptions.personalInfo && candidate.appliedDate ? candidate.appliedDate : "N/A",
        status: "Shared",
        tags: sharedDataOptions.personalInfo && candidate.metadata?.tags ? candidate.metadata.tags : [],
        profileImage: sharedDataOptions.personalInfo && candidate.metadata?.profileImage ? candidate.metadata.profileImage : "/lovable-uploads/placeholder.png",
        email: sharedDataOptions.contactInfo && candidate.email ? candidate.email : "N/A",
        phone: sharedDataOptions.contactInfo && candidate.phone ? candidate.phone : "N/A",
        location: sharedDataOptions.contactInfo && candidate.metadata?.currentLocation ? candidate.metadata.currentLocation : "N/A",
        skills: sharedDataOptions.personalInfo && candidate.skills ? normalizeSkills(candidate.skills) : ["N/A"],
        experience: sharedDataOptions.personalInfo && candidate.experience ? candidate.experience : "N/A",
        relvantExpyears: sharedDataOptions.personalInfo && candidate.metadata?.relevantExperience ? candidate.metadata.relevantExperience : "N/A",
        relvantExpmonths: sharedDataOptions.personalInfo && candidate.metadata?.relevantExperienceMonths ? candidate.metadata.relevantExperienceMonths : "N/A",
        preferedLocation: sharedDataOptions.personalInfo && Array.isArray(candidate.metadata?.preferredLocations)
          ? candidate.metadata.preferredLocations.join(", ")
          : "N/A",
        skillRatings: sharedDataOptions.personalInfo && candidate.skill_ratings ? candidate.skill_ratings : [],
        resume: sharedDataOptions.personalInfo && (candidate.resume || candidate.metadata?.resume_url) ? candidate.resume || candidate.metadata.resume_url : "#",
        currentSalary: sharedDataOptions.personalInfo && (candidate.currentSalary ? candidate.currentSalary : "N/A"),
        expectedSalary: sharedDataOptions.personalInfo && (candidate.expectedSalary ? candidate.expectedSalary : "N/A"),
        linkedInId: sharedDataOptions.contactInfo && candidate.metadata?.linkedInId ? candidate.metadata.linkedInId : "N/A",
        noticePeriod: sharedDataOptions.personalInfo && candidate.metadata?.noticePeriod ? candidate.metadata.noticePeriod : "N/A",
        hasOffers: sharedDataOptions.personalInfo && candidate.metadata?.hasOffers ? candidate.metadata.hasOffers : "N/A",
        offerDetails: sharedDataOptions.personalInfo && candidate.metadata?.offerDetails ? candidate.metadata.offerDetails : "N/A",
      }
    : {
        id: "unknown",
        name: "Shared Employee Profile",
        role: "N/A",
        department: "N/A",
        joinDate: "N/A",
        status: "Shared",
        tags: [],
        profileImage: "/lovable-uploads/placeholder.png",
        email: "N/A",
        phone: "N/A",
        location: "N/A",
        skills: ["N/A"],
        experience: "N/A",
        skillRatings: [],
        resume: "#",
        currentSalary: "N/A",
        expectedSalary: "N/A",
        linkedInId: "N/A",
        noticePeriod: "N/A",
        hasOffers: "N/A",
        offerDetails: "N/A",
      };

  // Documents for shared mode
  const documentsShared = {
    uan: {
      value: sharedDataOptions?.documentsInfo && candidate?.metadata?.uan ? candidate.metadata.uan : "Restricted",
      isVerifying: false,
      isVerified: false,
      verificationDate: null,
      error: null,
      isEditing: false,
    },
    pan: {
      value: sharedDataOptions?.documentsInfo && candidate?.metadata?.pan ? candidate.metadata.pan : "Restricted",
      isVerifying: false,
      isVerified: false,
      verificationDate: null,
      error: null,
      isEditing: false,
    },
    pf: {
      value: sharedDataOptions?.documentsInfo && candidate?.metadata?.pf ? candidate.metadata.pf : "Restricted",
      isVerifying: false,
      isVerified: false,
      verificationDate: null,
      error: null,
      isEditing: false,
    },
    esic: {
      value: sharedDataOptions?.documentsInfo && candidate?.metadata?.esicNumber ? candidate.metadata.esicNumber : "Restricted",
      isVerifying: false,
      isVerified: false,
      verificationDate: null,
      error: null,
      isEditing: false,
    },
  };

  // Copy magic link
  const copyMagicLink = () => {
    if (magicLink) {
      navigator.clipboard.writeText(magicLink);
      setIsCopied(true);
      toast({
        title: "Link Copied",
        description: "Magic link copied to clipboard.",
      });
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Render shared data categories
  const renderSharedDataCategories = () => {
    if (!sharedDataOptions) return null;

    const categories = [];
    if (sharedDataOptions.personalInfo) categories.push("Personal Information");
    if (sharedDataOptions.contactInfo) categories.push("Contact Information");
    if (sharedDataOptions.documentsInfo) categories.push("Documents");
    if (sharedDataOptions.workInfo) categories.push("Work Details");
    if (sharedDataOptions.skillinfo) categories.push("Skill Information");

    return (
      <div className="flex flex-wrap gap-2 justify-center mt-3">
        {categories.map((category, index) => (
          <div key={index} className="flex items-center bg-green-50 text-green-700 px-2 py-1 rounded-md text-xs border border-green-200">
            {category === "Personal Information" && <Users className="w-3 h-3 mr-1" />}
            {category === "Contact Information" && <Users className="w-3 h-3 mr-1" />}
            {category === "Documents" && <FileText className="w-3 h-3 mr-1" />}
            {category === "Work Details" && <Briefcase className="w-3 h-3 mr-1" />}
            {category === "Skill Information" && <Briefcase className="w-3 h-3 mr-1" />}
            {category}
          </div>
        ))}
      </div>
    );
  };

  // Render document row
  const renderDocumentRow = (type: keyof typeof documentsShared, label: string) => {
    const doc = documentsShared[type];

    return (
      <div className="border rounded-lg mb-4 bg-white shadow-sm hover:shadow-md transition-shadow w-full">
        <div className="p-4">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{doc.value}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render skills
  const renderSkills = () => {
    if (!sharedDataOptions?.personalInfo) return null;
    return (
      <div className="mt-4">
        <h3 className="text-sm font-medium mb-2">Skills & Expertise</h3>
        <div className="flex flex-wrap gap-2">
          {employee.skillRatings.map((skill, index) => (
            <Badge
              key={index}
              variant="outline"
              className="bg-purple-50 text-purple-700 border-purple-200"
            >
              {skill.name}
            </Badge>
          ))}
        </div>
      </div>
    );
  };

  // Render resume analysis
  const renderResumeAnalysis = () => {
    if (!resumeAnalysis) return null;

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-medium">Resume Analysis</h3>
        <Card className="border border-gray-200 bg-white shadow-sm w-full">
          <CardContent className="p-4">
            <p className="text-sm font-medium">Overall Score: {resumeAnalysis.overall_score}%</p>
            <p className="text-sm text-muted-foreground mt-2">{resumeAnalysis.summary}</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 bg-white shadow-sm w-full">
          <CardContent className="p-4">
            <p className="text-sm font-medium">Top Skills</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {resumeAnalysis.top_skills.map((skill, index) => (
                <Badge key={index} variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 bg-white shadow-sm w-full">
          <CardContent className="p-4">
            <p className="text-sm font-medium">Missing or Weak Areas</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {resumeAnalysis.missing_or_weak_areas.map((area, index) => (
                <Badge key={index} variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  {area}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 bg-white shadow-sm w-full">
          <CardContent className="p-4">
            <p className="text-sm font-medium">Development Gaps</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground mt-2">
              {resumeAnalysis.development_gaps.map((gap, index) => (
                <li key={index}>{gap}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 bg-white shadow-sm w-full">
          <CardContent className="p-4">
            <p className="text-sm font-medium">Certifications</p>
            {resumeAnalysis.additional_certifications.length > 0 ? (
              <ul className="list-disc list-inside text-sm text-muted-foreground mt-2">
                {resumeAnalysis.additional_certifications.map((cert, index) => (
                  <li key={index}>{cert}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">No certifications listed.</p>
            )}
          </CardContent>
        </Card>
        <Card className="border border-gray-200 bg-white shadow-sm w-full">
          <CardContent className="p-4">
            <p className="text-sm font-medium">Matched Skills</p>
            <div className="overflow-x-auto mt-2">
              <table className="min-w-full text-sm text-left text-gray-600">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3">Requirement</th>
                    <th scope="col" className="px-4 py-3">Matched</th>
                    <th scope="col" className="px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {resumeAnalysis.matched_skills.map((skill, index) => (
                    <tr key={index} className="border-b">
                      <td className="px-4 py-3">{skill.requirement}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            skill.matched === "yes" && "bg-green-50 text-green-700 border-green-200",
                            skill.matched === "partial" && "bg-yellow-50 text-yellow-700 border-yellow-200",
                            skill.matched === "no" && "bg-red-50 text-red-700 border-red-200"
                          )}
                        >
                          {skill.matched}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{skill.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 bg-white shadow-sm w-full">
          <CardContent className="p-4">
            <p className="text-sm font-medium">Section-Wise Scoring</p>
            <div className="space-y-4 mt-2">
              {resumeAnalysis.section_wise_scoring.map((section, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                  <p className="text-sm font-medium">{section.section} (Weightage: {section.weightage}%)</p>
                  <div className="overflow-x-auto mt-2">
                    <table className="min-w-full text-sm text-left text-gray-600">
                      <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                        <tr>
                          <th scope="col" className="px-4 py-3">Submenu</th>
                          <th scope="col" className="px-4 py-3">Score</th>
                          <th scope="col" className="px-4 py-3">Weightage</th>
                          <th scope="col" className="px-4 py-3">Weighted Score</th>
                          <th scope="col" className="px-4 py-3">Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {section.submenus.map((submenu, subIndex) => (
                          <tr key={subIndex} className="border-b">
                            <td className="px-4 py-3">{submenu.submenu}</td>
                            <td className="px-4 py-3">{submenu.score}/10</td>
                            <td className="px-4 py-3">{submenu.weightage}%</td>
                            <td className="px-4 py-3">{submenu.weighted_score.toFixed(1)}</td>
                            <td className="px-4 py-3">{submenu.remarks}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Render work history as a timeline
  const renderWorkHistory = () => {
    if (!sharedDataOptions?.workInfo || workHistory.length === 0) return null;

    // Sort work history by start year (descending)
    const sortedWorkHistory = [...workHistory].sort((a, b) => {
      const startYearA = parseInt(a.years.split("-")[0], 10) || 0;
      const startYearB = parseInt(b.years.split("-")[0], 10) || 0;
      return startYearB - startYearA;
    });

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-medium">Work History</h3>
        <div className="space-y-6">
          {sortedWorkHistory.map((history, index) => {
            // Parse years to detect gaps
            const [startYear, endYear] = history.years.split("-").map((year) => parseInt(year.trim(), 10) || 0);
            let hasGap = false;
            let gapText = "";

            // Check for gaps by comparing with the next entry (if exists)
            if (index < sortedWorkHistory.length - 1) {
              const nextHistory = sortedWorkHistory[index + 1];
              const nextStartYear = parseInt(nextHistory.years.split("-")[0], 10) || 0;
              const gap = endYear && nextStartYear ? endYear - nextStartYear : 0;
              if (gap > 1) {
                hasGap = true;
                gapText = `Gap of ${gap - 1} year${gap - 1 > 1 ? "s" : ""}`;
              }
            }

            return (
              <div key={index} className="relative pl-8 pb-6">
                {/* Timeline dot and line */}
                <div className="absolute left-0 top-0 h-full">
                  <div className="w-4 h-4 bg-indigo-500 rounded-full"></div>
                  {index < sortedWorkHistory.length - 1 && (
                    <div className="absolute top-4 left-[7px] w-[2px] h-full bg-indigo-200"></div>
                  )}
                </div>

                {/* Timeline content */}
                <div>
                  <p className={cn("text-xs", hasGap ? "text-red-600" : "text-gray-500")}>
                    {history.years}
                    {hasGap && <span className="ml-2">({gapText})</span>}
                  </p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{history.company_name}</p>
                  <p className="text-xs text-gray-600">{history.designation}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render resume preview
  const renderResumePreview = () => {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-medium">Resume Preview</h3>
        {employee.resume !== "#" ? (
          <iframe
            src={employee.resume}
            title="Resume Preview"
            className="w-full h-[600px] border border-gray-200 rounded-lg"
          />
        ) : (
          <p className="text-sm text-gray-600">No resume available for preview.</p>
        )}
      </div>
    );
  };

  // Available tabs in specified order
  const availableTabs = [
    resumeAnalysis && "resume-analysis",
    sharedDataOptions?.skillinfo && "skill-matrix",
    sharedDataOptions?.workInfo && workHistory.length > 0 && "work-history",
    sharedDataOptions?.documentsInfo && "documents",
    "resume",
  ].filter(Boolean) as string[];

  // Loading or error states
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-3xl">
          <CardHeader className="text-center">
            <CardTitle className="text-lg sm:text-xl">Loading shared profile...</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className="animate-pulse h-6 w-32 bg-gray-200 rounded-md"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-lg border-red-200 bg-red-50">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 bg-red-100 p-3 rounded-full w-16 h-16 flex items-center justify-center">
              <AlertTriangle size={32} className="text-red-500" />
            </div>
            <CardTitle className="text-red-700 text-lg sm:text-xl">
              {isExpired ? "Link Expired" : "Invalid Share Link"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-red-600 mb-6 text-sm sm:text-base">
              {isExpired
                ? "This link has expired. Employee profile links are valid for 2 days only."
                : "This employee profile share link is invalid or has been revoked."}
            </p>
            <Button onClick={() => navigate("/")} variant="outline" className="w-full">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main content
  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-8xl mx-auto">
        <Card className="bg-white w-full">
          <CardHeader>
            <div className="grid grid-cols-1 sm:grid-cols-3 items-center justify-between gap-4">
              {/* Left: Employee Info */}
              <div className="text-left">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{employee.name}</h2>
                <div className="flex items-center mt-1 text-sm text-gray-500">
                  <Calendar className="w-4 h-4 mr-1" />
                  <span>Applied: {employee.joinDate}</span>
                </div>
              </div>

              {/* Center: Secure Profile Info */}
              <div className="text-center mt-2">
                <p className="text-green-600 mb-2 text-sm sm:text-base">You're viewing a securely shared employee profile.</p>
                {renderSharedDataCategories()}
                <div className="flex justify-center items-center mt-2 text-sm text-gray-600">
                  <Info size={16} className="text-green-500 mr-2" />
                  <span>This link will expire in {getExpiryTimeRemaining(searchParams.get("expires"))}</span>
                </div>
              </div>

              {/* Right: Resume Button */}
              <div className="flex justify-end">
                <Button
                  variant="resume"
                  size="sm"
                  className="flex items-center space-x-2 px-3 py-1"
                >
                  <span className="text-sm font-medium">Resume</span>
                  <Separator orientation="vertical" className="h-4 bg-gray-300" />
                  <span
                    onClick={() => window.open(employee.resume, "_blank")}
                    className="cursor-pointer hover:text-gray-800"
                    title="View Resume"
                  >
                    <Eye className="w-4 h-4" />
                  </span>
                  <span
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = employee.resume;
                      link.download = `${employee.name}_Resume.pdf`;
                      link.click();
                      toast({
                        title: "Resume Download Started",
                        description: "The resume is being downloaded.",
                      });
                    }}
                    className="cursor-pointer hover:text-gray-800"
                    title="Download Resume"
                  >
                    <Download className="w-4 h-4" />
                  </span>
                </Button>
              </div>
            </div>

            {(sharedDataOptions?.personalInfo || sharedDataOptions?.contactInfo) && (
              <div className="mt-6">
                <Card className="border border-gray-200 bg-white shadow-sm w-full">
                  <CardContent className="p-4">
                    <div className="flex flex-col space-y-4">
                      {sharedDataOptions?.contactInfo && (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center text-sm space-y-2 sm:space-y-0 sm:space-x-4">
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 mr-2 text-indigo-500" />
                            <span className="text-gray-600">{employee.email}</span>
                            <Button
                              variant="copyicon"
                              size="xs"
                              onClick={() => {
                                navigator.clipboard.writeText(employee.email);
                                toast({
                                  title: "Email Copied",
                                  description: "Email address copied to clipboard.",
                                });
                              }}
                              className="ml-2 text-indigo-500 hover:text-indigo-700"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="flex items-center">
                            <Phone className="w-4 h-4 mr-2 text-indigo-500" />
                            <span className="text-gray-600">{employee.phone}</span>
                            <Button
                              variant="copyicon"
                              size="xs"
                              onClick={() => {
                                navigator.clipboard.writeText(employee.phone);
                                toast({
                                  title: "Phone Copied",
                                  description: "Phone number copied to clipboard.",
                                });
                              }}
                              className="ml-2 text-indigo-500 hover:text-indigo-700"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="flex items-center">
                            {employee.linkedInId !== "N/A" ? (
                              <a
                                href={employee.linkedInId}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-500 hover:text-indigo-700"
                              >
                                <FaLinkedin className="w-6 h-6" />
                              </a>
                            ) : (
                              <FaLinkedin className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        </div>
                      )}
                      {sharedDataOptions?.personalInfo && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mt-4">
                          <div className="flex items-center">
                            <FileBadge className="w-4 h-4 mr-2 text-indigo-500" />
                            <span className="font-medium text-gray-700">Total Experience</span>
                            <span className="mx-2 text-gray-300">•</span>
                            <span className="text-gray-600">{employee.experience}</span>
                          </div>
                          <div className="flex items-center">
                            <Award className="w-4 h-4 mr-2 text-indigo-500" />
                            <span className="font-medium text-gray-700">Relevant Experience</span>
                            <span className="mx-2 text-gray-300">•</span>
                            <span className="text-gray-600">
                              {employee.relvantExpyears} years and {employee.relvantExpmonths} months
                            </span>
                          </div>
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-2 text-indigo-500" />
                            <span className="font-medium text-gray-700">Current Location</span>
                            <span className="mx-2 text-gray-300">•</span>
                            <span className="text-gray-600">{employee.location}</span>
                          </div>
                          <div className="flex items-center">
                            <MapPinPlus className="w-4 h-4 mr-2 text-indigo-500" />
                            <span className="font-medium text-gray-700">Preferred Location</span>
                            <span className="mx-2 text-gray-300">•</span>
                            <span className="text-gray-600">{employee.preferedLocation}</span>
                          </div>
                          <div className="flex items-center">
                            <Banknote className="w-4 h-4 mr-2 text-indigo-500" />
                            <span className="font-medium text-gray-700">Current Salary</span>
                            <span className="mx-2 text-gray-300">•</span>
                            <span className="text-gray-600">{formatINR(employee.currentSalary)} LPA</span>
                          </div>
                          <div className="flex items-center">
                            <Banknote className="w-4 h-4 mr-2 text-indigo-500" />
                            <span className="font-medium text-gray-700">Expected Salary</span>
                            <span className="mx-2 text-gray-300">•</span>
                            <span className="text-gray-600">{formatINR(employee.expectedSalary)} LPA</span>
                          </div>
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2 text-indigo-500" />
                            <span className="font-medium text-gray-700">Notice Period</span>
                            <span className="mx-2 text-gray-300">•</span>
                            <span className="text-gray-600">{employee.noticePeriod} days</span>
                          </div>
                          <div className="flex items-center">
                            <Briefcase className="w-4 h-4 mr-2 text-indigo-500" />
                            <span className="font-medium text-gray-700">Has Offers</span>
                            <span className="mx-2 text-gray-300">•</span>
                            <span className="text-gray-600">{employee.hasOffers}</span>
                          </div>
                          {employee.hasOffers === "Yes" && (
                            <div className="flex items-center col-span-1 sm:col-span-2">
                              <FileText className="w-4 h-4 mr-2 text-indigo-500" />
                              <span className="font-medium text-gray-700">Offer Details</span>
                              <span className="mx-2 text-gray-300">•</span>
                              <span className="text-gray-600">{employee.offerDetails}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                {sharedDataOptions?.personalInfo && renderSkills()}
              </div>
            )}
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="resume-analysis" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="flex flex-wrap gap-2 mb-6 overflow-x-auto">
                {availableTabs.map((tab) => (
                  <TabsTrigger key={tab} value={tab} className="flex-1 min-w-[120px] sm:flex-none">
                    {tab === "resume-analysis" && "Resume Analysis"}
                    {tab === "skill-matrix" && "Skill Matrix"}
                    {tab === "work-history" && "Work History"}
                    {tab === "documents" && "Documents"}
                    {tab === "resume" && "Resume"}
                  </TabsTrigger>
                ))}
              </TabsList>

              {resumeAnalysis && (
                <TabsContent value="resume-analysis">
                  {renderResumeAnalysis()}
                </TabsContent>
              )}

              {sharedDataOptions?.skillinfo && (
                <TabsContent value="skill-matrix">
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium mb-4">Skill Matrix</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {employee.skillRatings.map((skill, index) => (
                        <div
                          key={index}
                          className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                            <p className="text-sm font-medium">{skill.name}</p>
                            {skill.experienceYears !== undefined && skill.experienceMonths !== undefined && (
                              <span className="text-xs text-gray-500 mt-1 sm:mt-0">
                                {`${skill.experienceYears}.${skill.experienceMonths} years`}
                              </span>
                            )}
                            <div className="flex mt-2 sm:mt-0">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <svg
                                  key={star}
                                  className={cn(
                                    "w-5 h-5",
                                    star <= skill.rating ? "text-yellow-400" : "text-gray-300"
                                  )}
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              )}

              {sharedDataOptions?.workInfo && workHistory.length > 0 && (
                <TabsContent value="work-history">
                  {renderWorkHistory()}
                </TabsContent>
              )}

              {sharedDataOptions?.documentsInfo && (
                <TabsContent value="documents">
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium mb-4">Verification Documents</h3>
                    {renderDocumentRow("uan", "UAN Number")}
                    {renderDocumentRow("pan", "PAN Number")}
                    {renderDocumentRow("pf", "PF Number")}
                    {renderDocumentRow("esic", "ESIC Number")}
                  </div>
                </TabsContent>
              )}

              <TabsContent value="resume">
                {renderResumePreview()}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Helper function to calculate remaining time
const getExpiryTimeRemaining = (expiryTimestamp: string | null): string => {
  if (!expiryTimestamp) return "unknown time";

  const expiry = parseInt(expiryTimestamp, 10);
  const now = Date.now();
  const remainingMs = expiry - now;

  if (remainingMs <= 0) return "0 hours";

  const hours = Math.floor(remainingMs / (1000 * 60 * 60));

  if (hours < 24) {
    return `${hours} hour${hours !== 1 ? "s" : ""}`;
  } else {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days} day${days !== 1 ? "s" : ""} and ${remainingHours} hour${remainingHours !== 1 ? "s" : ""}`;
  }
};

export default SharedProfile;