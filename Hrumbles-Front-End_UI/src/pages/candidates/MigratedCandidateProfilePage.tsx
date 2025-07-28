// src/pages/candidates/MigratedCandidateProfilePage.tsx

import { FC } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Briefcase, GraduationCap, Mail, Phone, Linkedin, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Loader from '@/components/ui/Loader';
import { Database } from 'lucide-react'; // Assuming you have this for your other component

// Define types for the nested JSONB data for better type safety
interface ExperienceDetail {
  designation: string;
  organization: string;
  startDate: string;
  endDate: string;
  profile: string;
}

interface EducationDetail {
  institute?: { label?: string };
  course?: { label?: string };
  spec?: { label?: string };
  yearOfCompletion?: string;
}

interface SkillMatrixItem {
  skill?: { label?: string };
  experienceTimeLable?: string;
}

// Full type for the candidate profile
interface MigratedCandidateProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_number: string | null;
  roll_name: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  summary: string | null;
  skills: string[] | null;
  skill_matrix: SkillMatrixItem[] | null;
  experience_details: ExperienceDetail[] | null;
  education_details: EducationDetail[] | null;
}

const MigratedCandidateProfilePage: FC = () => {
  // This syntax is now correct in a .tsx file
  const { candidateId } = useParams<{ candidateId: string }>();

  const { data: candidate, isLoading } = useQuery<MigratedCandidateProfile>({
    queryKey: ['migratedCandidateProfile', candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mongo_candidates')
        .select('*')
        .eq('id', candidateId as string) // Asserting candidateId is a string
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!candidateId,
  });

  if (isLoading) return <div className="flex justify-center items-center h-screen"><Loader /></div>;
  if (!candidate) return <div className="text-center mt-10">Candidate not found.</div>;

  const fullName = `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim() || 'Unnamed Candidate';

  // The rest of the component's JSX is the same...
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto p-4 md:p-8">
        <Link to="/migrated-talent-pool">
          <Button variant="outline" className="mb-6"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Migrated Pool</Button>
        </Link>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader className="text-center">
                <div className="w-24 h-24 rounded-full bg-indigo-600 mx-auto flex items-center justify-center text-white text-4xl font-bold mb-4">{fullName.charAt(0)}</div>
                <h1 className="text-2xl font-bold">{fullName}</h1>
                <p className="text-gray-500">{candidate.roll_name}</p>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-600">
                {candidate.email && <div className="flex items-center gap-2"><Mail size={16} /><a href={`mailto:${candidate.email}`} className="hover:underline">{candidate.email}</a></div>}
                {candidate.phone_number && <div className="flex items-center gap-2"><Phone size={16} />{candidate.phone_number}</div>}
                {candidate.linkedin_url && <div className="flex items-center gap-2"><Linkedin size={16} /><a href={candidate.linkedin_url} target="_blank" rel="noreferrer" className="hover:underline">LinkedIn Profile</a></div>}
                {candidate.github_url && <div className="flex items-center gap-2"><Github size={16} /><a href={candidate.github_url} target="_blank" rel="noreferrer" className="hover:underline">GitHub Profile</a></div>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Simple Skills List</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {(candidate.skills || []).map((skill, i) => <Badge key={i} variant="secondary">{skill}</Badge>)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Detailed Skill Matrix</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(candidate.skill_matrix || []).map((sm, i) => (
                  <div key={i} className="text-sm">
                    <span className="font-semibold">{sm.skill?.label}</span>
                    <span className="text-gray-500"> - {sm.experienceTimeLable} exp.</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2 space-y-8">
            {candidate.summary && (
              <Card>
                <CardHeader><CardTitle>Professional Summary</CardTitle></CardHeader>
                <CardContent><p className="text-gray-700 whitespace-pre-wrap">{candidate.summary}</p></CardContent>
              </Card>
            )}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Briefcase />Work Experience</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                {(candidate.experience_details || []).map((exp, index) => (
                  <div key={index} className="pl-4 border-l-2 border-indigo-200">
                    <h3 className="font-semibold text-lg">{exp.designation} at {exp.organization}</h3>
                    <p className="text-sm text-gray-500 mb-2">{exp.startDate} - {exp.endDate}</p>
                    <p className="text-gray-600 whitespace-pre-wrap text-sm">{exp.profile}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap />Education</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {(candidate.education_details || []).map((edu, index) => (
                   <div key={index}>
                    <h3 className="font-semibold">{edu.institute?.label || 'N/A'}</h3>
                    <p className="text-gray-600">{edu.course?.label || ''} in {edu.spec?.label || 'N/A'}</p>
                    <p className="text-sm text-gray-500">Year of Completion: {edu.yearOfCompletion}</p>
                   </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MigratedCandidateProfilePage;