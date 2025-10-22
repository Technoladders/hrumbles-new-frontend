import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ResumeAnalysis, WorkHistory, Candidate, DataSharingOptions } from "@/components/MagicLinkView/types";
import { ResumeAnalysisSection } from "./ResumeAnalysisSection";
import { SkillMatrixSection } from "./SkillMatrixSection";
import { ResumePreviewSection } from "./ResumePreviewSection";
 
interface ProfileTabsProps {
  availableTabs: string[];
  resumeAnalysis: ResumeAnalysis | null;
  shareMode: boolean;
  sharedDataOptions?: DataSharingOptions;
  employeeSkillRatings: Array<{
    name: string;
    rating: number;
    experienceYears?: number;
    experienceMonths?: number;
  }>;
  employeeResumeUrl: string;
  candidate: Candidate | null;
}
 
export const ProfileTabs: React.FC<ProfileTabsProps> = ({
  availableTabs,
  resumeAnalysis,
  shareMode,
  sharedDataOptions,
  employeeSkillRatings,
  employeeResumeUrl,
  candidate,
}) => {
  const showDocumentTabs = availableTabs.includes('resume-analysis') || availableTabs.includes('resume');
  const showAssessmentTabs = availableTabs.includes('skill-matrix');
 
  if (showDocumentTabs) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="resume-analysis" className="w-full">
            <TabsList className="inline-flex h-10 items-center justify-center rounded-full bg-gray-100 border p-1 mb-4">
              {availableTabs.includes('resume-analysis') && (
                <TabsTrigger
                  value="resume-analysis"
                  className="rounded-full px-4 py-1.5 text-sm font-medium text-gray-600 transition-all data-[state=active]:bg-[#3e36d9] data-[state=active]:text-white data-[state=active]:shadow-md"
                >
                  Resume Analysis
                </TabsTrigger>
              )}
              {availableTabs.includes('resume') && (
                <TabsTrigger
                  value="resume"
                  className="rounded-full px-4 py-1.5 text-sm font-medium text-gray-600 transition-all data-[state=active]:bg-[#3e36d9] data-[state=active]:text-white data-[state=active]:shadow-md"
                >
                  Resume
                </TabsTrigger>
              )}
            </TabsList>
           
            {resumeAnalysis && (
              <TabsContent value="resume-analysis">
                <ResumeAnalysisSection resumeAnalysis={resumeAnalysis} />
              </TabsContent>
            )}
            <TabsContent value="resume">
              <ResumePreviewSection resumeUrl={employeeResumeUrl} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    );
  }
 
  // if (showAssessmentTabs) {
  //   return (
  //     <Card>
  //       <CardContent className="pt-6">
  //         <Tabs defaultValue="skill-matrix" className="w-full">
  //           <TabsList className="inline-flex h-10 items-center justify-center rounded-full bg-gray-100 border p-1 mb-4">
  //             {availableTabs.includes('skill-matrix') && (
  //               <TabsTrigger
  //                 value="skill-matrix"
  //                 className="rounded-full px-4 py-1.5 text-sm font-medium text-gray-600 transition-all data-[state=active]:bg-[#3e36d9] data-[state=active]:text-white data-[state=active]:shadow-md"
  //               >
  //                 Skill Matrix
  //               </TabsTrigger>
  //             )}
  //           </TabsList>
 
  //           {(!shareMode || sharedDataOptions?.skillinfo) && (
  //             <TabsContent value="skill-matrix">
  //               <SkillMatrixSection skillRatings={employeeSkillRatings} />
  //             </TabsContent>
  //           )}
  //         </Tabs>
  //       </CardContent>
  //     </Card>
  //   );
  // }
 
  return null;
};