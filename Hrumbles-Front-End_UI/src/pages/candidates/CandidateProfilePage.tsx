import { useState } from "react";
import { useParams, Link } from "react-router-dom";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CompareWithJobDialog from '@/components/candidates/talent-pool/CompareWithJobDialog';
import AnalysisHistoryDialog from '@/components/candidates/AnalysisHistoryDialog';

 
// Helper to safely parse JSON arrays from the database
const parseJsonArray = (data: any) => {
  if (Array.isArray(data)) return data;
  if (typeof data === 'string') {
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
 
  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }
 
  if (!candidate) {
    return <div className="text-center mt-10">Candidate not found.</div>;
  }
 
  const professionalSummaryPoints = candidate.professional_summary; // Keep raw data
  const workExperience = parseJsonArray(candidate.work_experience);
  const education = parseJsonArray(candidate.education);
  const certifications = parseJsonArray(candidate.certifications);
  const topSkills = parseJsonArray(candidate.top_skills);
  const projects = parseJsonArray(candidate.projects);
  const resumeFileName = candidate.candidate_name ? `${candidate.candidate_name.replace(/\s+/g, '_')}_Resume.pdf` : 'resume.pdf';
 
  const renderAboutContent = () => {
    const summaryArray = parseJsonArray(professionalSummaryPoints);
    if (summaryArray.length > 0) {
      return summaryArray.map((point, index) => <p key={index}>{point}</p>);
    }
    if (typeof professionalSummaryPoints === 'string' && professionalSummaryPoints.trim() !== '') {
      return <p>{professionalSummaryPoints}</p>;
    }
    return <p className="text-gray-500">No summary available for this candidate.</p>;
  };
 
  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto p-4 md:p-8">
        <Link to="/talent-pool" className="mb-6 inline-block"> 
          <Button variant="outline" className="border-gray-300">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Talent Pool
          </Button>
        </Link>
 
        {/* --- Header Section --- */}
        <Card className="mb-8 overflow-hidden border rounded-lg">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              <div className="w-24 h-24 rounded-full bg-purple-100 flex items-center justify-center text-purple-500 text-4xl font-bold flex-shrink-0">
                {candidate.candidate_name?.charAt(0)}
              </div>
              <div className="flex-grow space-y-2">
                <h1 className="text-3xl font-bold text-gray-900">{candidate.candidate_name}</h1>
                <p className="text-lg text-gray-600">{candidate.suggested_title}</p>
                {candidate.linkedin_url && (
  <a
    href={
      candidate.linkedin_url.startsWith("http")
        ? candidate.linkedin_url
        : `https://${candidate.linkedin_url}`
    }
    target="_blank"
    rel="noreferrer"
    className="text-blue-600 hover:underline text-sm flex items-center gap-2"
  >
    <Linkedin size={16} /> LinkedIn Profile
  </a>
)}

                <div className="pt-2 space-y-2 text-sm text-gray-700">
                    <div className="flex items-center gap-3">
                        <Mail size={16} className="text-gray-500"/>
                       <a href={`mailto:${candidate.email}`} className="hover:underline hover:text-purple-700 break-all">
                {candidate.email}
                      </a>
                    </div>
                    <div className="flex items-center gap-3">
                        <Phone size={16} className="text-gray-500" />
                        <span>{candidate.phone}</span>
                    </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0 w-full sm:w-48">
                <Button size="sm" variant="datepicker" onClick={() => setCompareModalOpen(true)} className="w-full flex items-center justify-center gap-2">
                    <ScanSearch size={16} />
                    <span>Compare with Job</span>
                </Button>
                <Button size="sm" variant="outline1" onClick={() => setHistoryModalOpen(true)} className="w-full flex items-center justify-center gap-2" variant="secondary">
                    <History size={16} />
                    <span>Analysis History</span>
                </Button>
               
                {candidate.resume_path && (
                  <a href={candidate.resume_path} download={resumeFileName} className="w-full">
                    <Button size="sm" variant="datepicker" className="w-full flex items-center justify-center gap-2">
                        <Download size={16} />
                        <span>Download CV</span>
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
 
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* --- Main Content (Left) --- */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="border rounded-lg">
              <CardHeader><CardTitle className="text-xl font-bold">About</CardTitle></CardHeader>
              <CardContent className="text-gray-600 space-y-4">
                 {renderAboutContent()}
              </CardContent>
            </Card>
 
             {workExperience && workExperience.length > 0 && (
                <Card className="border rounded-lg">
                    <CardHeader><CardTitle className="text-xl font-bold">Work Experience</CardTitle></CardHeader>
                    <CardContent>
                        <div className="relative pl-8 pt-4 space-y-10 border-l-2 border-gray-100">
                            {workExperience.map((exp, index) => (
                                <div key={index} className="relative">
                                    <div className="absolute -left-[50px] top-1 w-12 h-12 rounded-md bg-purple-50 flex items-center justify-center text-sm font-bold text-purple-600 ring-4 ring-white">{exp.company?.charAt(0) || 'W'}</div>
                                    <p className="font-bold text-md text-gray-800 uppercase tracking-wide">{exp.designation} <span className="ml-2 font-normal text-sm text-purple-600 normal-case">{exp.duration}</span></p>
                                    <p className="text-md text-gray-700">{exp.company}</p>
                                    <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-gray-600">
                                      {exp.responsibilities.map((resp, respIndex) => (<li key={respIndex}>{resp}</li>))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
             )}
 
            {projects && projects.length > 0 && (
                <Card className="border rounded-lg">
                    <CardHeader><CardTitle className="text-xl font-bold flex items-center gap-2"><Lightbulb size={22}/> Projects</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        {projects.map((proj, index) => (
                            <div key={index} className="pt-2">
                                <h3 className="font-semibold text-gray-800">{proj.name}</h3>
                                <p className="text-sm text-gray-600 mt-1">{proj.description}</p>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
 
            {candidate.other_details && Object.keys(candidate.other_details).length > 0 && (
              <Card className="border rounded-lg">
                <CardHeader><CardTitle className="text-xl font-bold flex items-center gap-2"><Info size={22}/> Other Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(candidate.other_details).map(([key, value]) => (
                    <div key={key}>
                      <h3 className="font-semibold text-lg text-gray-800 mb-2">{key}</h3>
                      <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                        {Array.isArray(value) && value.map((item, index) => (<li key={index}>{item}</li>))}
                      </ul>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
 
          {/* --- Information Sidebar (Right) --- */}
          <div className="lg:col-span-1 space-y-6">
             {topSkills && topSkills.length > 0 && (
                <Card className="border rounded-lg">
                    <CardHeader><CardTitle className="text-xl font-bold">Top Skills</CardTitle></CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                        {topSkills.map((skill: string) => (<Badge key={skill} variant="secondary" className="bg-purple-100 text-purple-700">{skill}</Badge>))}
                    </CardContent>
                </Card>
             )}
             
             {education && education.length > 0 && (
                <Card className="border rounded-lg">
                    <CardHeader><CardTitle className="text-xl font-bold">Education</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {education.map((edu: any, index: number) => (
                            <div key={index} className="pt-2 border-b last:border-b-0 pb-2">
                                <p className="font-semibold text-gray-800">{edu.degree}</p>
                                <p className="text-sm text-gray-600">{edu.institution}</p>
                                {edu.year && <p className="text-xs text-gray-500 mt-1">{edu.year}</p>}
                            </div>
                        ))}
                    </CardContent>
                </Card>
             )}
 
            {certifications && certifications.length > 0 && (
                <Card className="border rounded-lg">
                    <CardHeader><CardTitle className="text-xl font-bold">Certifications</CardTitle></CardHeader>
                    <CardContent>
                        <ul className="space-y-2">
                            {certifications.map((cert: string, index: number) => (
                                <li key={index} className="flex items-center gap-2 text-sm">
                                    <Award size={16} className="text-yellow-600" />
                                    <span>{cert}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}
          </div>
        </div>

        {/* Render modals needed for the buttons */}
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
            </>
        )}
      </div>
    </div>
  );
};
 
export default CandidateProfilePage;
 