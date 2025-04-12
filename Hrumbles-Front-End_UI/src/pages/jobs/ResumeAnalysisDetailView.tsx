// components/ResumeAnalysisDetailView.tsx
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const ResumeAnalysisDetailView = () => {
  const { candidateId } = useParams<{ candidateId: string }>();

  const { data: analysis, isLoading } = useQuery({
    queryKey: ['resume-analysis', candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resume_analysis')
        .select('*')
        .eq('candidate_id', candidateId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!candidateId,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!analysis) {
    return <div className="text-center mt-10 text-purple-600">No analysis found</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto w-full"> {/* Adjusted max-width to 6xl for better fit */}
        <Link to={-1 as any}>
          <Button variant="ghost" className="mb-6 text-purple-600 hover:text-purple-800">
            <ArrowLeft size={20} className="mr-2" />
            Back
          </Button>
        </Link>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-purple-200">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-purple-800 mb-2">
                {analysis.candidate_name || 'Unknown Candidate'}
              </h1>
              <p className="text-sm sm:text-base text-purple-600">
                Analyzed on: {new Date(analysis.updated_at).toLocaleString()}
              </p>
            </div>
            <div className="mt-4 sm:mt-0 bg-purple-200 px-4 py-2 rounded-lg">
              <p className="text-lg font-semibold text-purple-800">Overall Score</p>
              <p className="text-2xl font-bold text-purple-700">{analysis.overall_score}%</p>
            </div>
          </div>

          {/* Contact Info */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-purple-800 mb-2">Contact Information</h3>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 text-purple-600 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <p>Email: {analysis.email || 'N/A'}</p>
              <p>GitHub: {analysis.github || 'N/A'}</p>
              <p>LinkedIn: {analysis.linkedin || 'N/A'}</p>
            </div>
          </div>

          {/* Matched Skills Table */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-purple-800 mb-4">Matched Skills</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left border-collapse">
                <thead className="bg-purple-100">
                  <tr>
                    <th className="p-3 text-purple-800 font-semibold border-b-2 border-purple-200">Requirement</th>
                    <th className="p-3 text-purple-800 font-semibold border-b-2 border-purple-200">Status</th>
                    <th className="p-3 text-purple-800 font-semibold border-b-2 border-purple-200">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.matched_skills?.length > 0 ? (
                    analysis.matched_skills.map((skill: any, index: number) => (
                      <tr key={index} className="hover:bg-purple-50 transition-colors">
                        <td className="p-3 text-purple-700 border-b border-purple-100">{skill.requirement}</td>
                        <td className="p-3 text-purple-700 border-b border-purple-100 text-center">
                          {skill.matched === 'yes' ? '✅ Yes' : skill.matched === 'partial' ? '⚠️ Partial' : '❌ No'}
                        </td>
                        <td className="p-3 text-purple-600 border-b border-purple-100">{skill.details}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="p-3 text-purple-600 text-center">No skills data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section-wise Scoring Table */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-purple-800 mb-4">Section-wise Scoring</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left border-collapse">
                <thead className="bg-purple-100">
                  <tr>
                    <th className="p-3 text-purple-800 font-semibold border-b-2 border-purple-200">Section</th>
                    <th className="p-3 text-purple-800 font-semibold border-b-2 border-purple-200">Weightage</th>
                    <th className="p-3 text-purple-800 font-semibold border-b-2 border-purple-200">Submenu</th>
                    <th className="p-3 text-purple-800 font-semibold border-b-2 border-purple-200">Score</th>
                    <th className="p-3 text-purple-800 font-semibold border-b-2 border-purple-200">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.section_wise_scoring && Object.values(analysis.section_wise_scoring).length > 0 ? (
                    Object.values(analysis.section_wise_scoring).flatMap((section: any, sectionIndex: number) =>
                      section.submenus.map((submenu: any, submenuIndex: number) => (
                        <tr key={`${sectionIndex}-${submenuIndex}`} className="hover:bg-purple-50 transition-colors">
                          {submenuIndex === 0 && (
                            <td
                              className="p-3 text-purple-700 border-b border-purple-100 align-top"
                              rowSpan={section.submenus.length}
                            >
                              {section.section}
                            </td>
                          )}
                          {submenuIndex === 0 && (
                            <td
                              className="p-3 text-purple-700 border-b border-purple-100 align-top"
                              rowSpan={section.submenus.length}
                            >
                              {section.weightage}%
                            </td>
                          )}
                          <td className="p-3 text-purple-700 border-b border-purple-100">{submenu.submenu} ({submenu.weightage}%)</td>
                          <td className="p-3 text-purple-700 border-b border-purple-100 text-center">{submenu.score}/10</td>
                          <td className="p-3 text-purple-600 border-b border-purple-100">{submenu.remarks}</td>
                        </tr>
                      ))
                    )
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-3 text-purple-600 text-center">No scoring data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Additional Info Tables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-xl font-semibold text-purple-800 mb-4">Top Skills</h3>
              <table className="w-full border-collapse">
                <tbody>
                  {analysis.top_skills?.length > 0 ? (
                    analysis.top_skills.map((skill: string, index: number) => (
                      <tr key={index} className="hover:bg-purple-50 transition-colors">
                        <td className="p-3 text-purple-600 border-b border-purple-100">{skill}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="p-3 text-purple-600 text-center">No top skills listed</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-purple-800 mb-4">Missing/Weak Areas</h3>
              <table className="w-full border-collapse">
                <tbody>
                  {analysis.missing_or_weak_areas?.length > 0 ? (
                    analysis.missing_or_weak_areas.map((area: string, index: number) => (
                      <tr key={index} className="hover:bg-purple-50 transition-colors">
                        <td className="p-3 text-purple-600 border-b border-purple-100">{area}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="p-3 text-purple-600 text-center">No missing/weak areas identified</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          <div>
            <h3 className="text-xl font-semibold text-purple-800 mb-4">Summary</h3>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 text-purple-600">
              {analysis.summary || 'No summary available'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeAnalysisDetailView;