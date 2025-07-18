import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Briefcase, GraduationCap, Code, Star, Mail, Phone, Linkedin, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const CandidateProfilePage = () => {
  const { candidateId } = useParams<{ candidateId: string }>();

  const { data: candidate, isLoading } = useQuery({
    queryKey: ['talentPoolCandidate', candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_talent_pool')
        .select('*')
        .eq('id', candidateId)
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

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto p-4 md:p-8">
        <Link to="/talent-pool">
          <Button variant="outline" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Talent Pool
          </Button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Profile Summary */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader className="text-center">
                <div className="w-24 h-24 rounded-full bg-primary mx-auto flex items-center justify-center text-white text-4xl font-bold mb-4">
                  {candidate.candidate_name?.charAt(0)}
                </div>
                <h1 className="text-2xl font-bold">{candidate.candidate_name}</h1>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-600">
                {candidate.email && <div className="flex items-center gap-2"><Mail size={16} /><a href={`mailto:${candidate.email}`} className="hover:underline">{candidate.email}</a></div>}
                {candidate.phone && <div className="flex items-center gap-2"><Phone size={16} />{candidate.phone}</div>}
                {candidate.linkedin_url && <div className="flex items-center gap-2"><Linkedin size={16} /><a href={candidate.linkedin_url} target="_blank" rel="noreferrer" className="hover:underline">LinkedIn</a></div>}
                {candidate.github_url && <div className="flex items-center gap-2"><Github size={16} /><a href={candidate.github_url} target="_blank" rel="noreferrer" className="hover:underline">GitHub</a></div>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Top Skills</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {(candidate.top_skills || []).map((skill: string) => <Badge key={skill} variant="secondary">{skill}</Badge>)}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Details */}
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardHeader><CardTitle>Professional Summary</CardTitle></CardHeader>
              <CardContent><p className="text-gray-700">{candidate.professional_summary}</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Briefcase />Work Experience</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                {(candidate.work_experience || []).map((exp: any, index: number) => (
                  <div key={index} className="pl-4 border-l-2">
                    <h3 className="font-semibold text-lg">{exp.designation} at {exp.company}</h3>
                    <p className="text-sm text-gray-500 mb-2">{exp.duration}</p>
                    <ul className="list-disc pl-5 space-y-1 text-gray-600">
                      {(exp.responsibilities || []).map((resp: string, i: number) => <li key={i}>{resp}</li>)}
                    </ul>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap />Education</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {(candidate.education || []).map((edu: any, index: number) => (
                   <div key={index}>
                    <h3 className="font-semibold">{edu.institution}</h3>
                    <p className="text-gray-600">{edu.degree}</p>
                    <p className="text-sm text-gray-500">{edu.year}</p>
                   </div>
                ))}
              </CardContent>
            </Card>
            {/* Add more cards for Projects, Certifications etc. */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateProfilePage;