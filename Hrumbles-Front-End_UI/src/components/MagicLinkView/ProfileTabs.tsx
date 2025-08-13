import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CardContent } from "@/components/ui/card";
import { ResumeAnalysis, WorkHistory, Candidate, DataSharingOptions } from "@/components/MagicLinkView/types";
import { ResumeAnalysisSection } from "./ResumeAnalysisSection";
import { SkillMatrixSection } from "./SkillMatrixSection";
import { WorkHistorySection } from "./WorkHistorySection";
import { ResumePreviewSection } from "./ResumePreviewSection";
import { BgvVerificationSection } from "@/pages/bg-verification/BgvVerificationSection";


interface ProfileTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  availableTabs: string[];
  resumeAnalysis: ResumeAnalysis | null;
  workHistory: WorkHistory[];
  shareMode: boolean;
  sharedDataOptions?: DataSharingOptions;
  employeeSkillRatings: Array<{
    name: string;
    rating: number;
    experienceYears?: number;
    experienceMonths?: number;
  }>;
  isVerifyingAllWorkHistory: boolean;
  onVerifyAllCompanies: () => void;
  onVerifySingleWorkHistory: (company: WorkHistory) => void;
  updateWorkHistoryItem: (companyId: number, updates: Partial<WorkHistory>) => void;
  employeeResumeUrl: string;
  candidateId: string | undefined;
  candidate: Candidate | null;
  userId: string;
  organizationId: string;
}

export const ProfileTabs: React.FC<ProfileTabsProps> = ({
  activeTab,
  setActiveTab,
  availableTabs,
  resumeAnalysis,
  workHistory,
  shareMode,
  sharedDataOptions,
  employeeSkillRatings,
  isVerifyingAllWorkHistory,
  onVerifyAllCompanies,
  onVerifySingleWorkHistory,
  updateWorkHistoryItem,
  employeeResumeUrl,
  candidateId,
  candidate,
  userId,
  organizationId,
}) => {
  return (
    <CardContent>
      <Tabs defaultValue="resume-analysis" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap gap-2 mb-6 overflow-x-auto">
          {availableTabs.map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="flex-1 min-w-[100px] text-xs sm:text-sm sm:min-w-[120px]"
            >
              {tab === "resume-analysis" && "Resume Analysis"}
              {tab === "skill-matrix" && "Skill Matrix"}
              {tab === "work-history" && "Work History"}
              {tab === "bg-verification" && "Background Verification"}
              {tab === "resume" && "Resume"}
            </TabsTrigger>
          ))}
        </TabsList>

        {resumeAnalysis && (
          <TabsContent value="resume-analysis">
            <ResumeAnalysisSection resumeAnalysis={resumeAnalysis} />
          </TabsContent>
        )}

        {(!shareMode || sharedDataOptions?.skillinfo) && (
          <TabsContent value="skill-matrix">
            <SkillMatrixSection skillRatings={employeeSkillRatings} />
          </TabsContent>
        )}

        {workHistory.length > 0 && (
          <TabsContent value="work-history">
            <WorkHistorySection
              workHistory={workHistory}
              shareMode={shareMode}
              isVerifyingAll={isVerifyingAllWorkHistory}
              onVerifyAllCompanies={onVerifyAllCompanies}
              onVerifySingleWorkHistory={onVerifySingleWorkHistory}
              updateWorkHistoryItem={updateWorkHistoryItem}
              candidate={candidate}
            />
          </TabsContent>
        )}

        <TabsContent value="bg-verification">
          <BgvVerificationSection candidate={candidate} />
        </TabsContent>

        <TabsContent value="resume">
          <ResumePreviewSection resumeUrl={employeeResumeUrl} />
        </TabsContent>
      </Tabs>
    </CardContent>
  );
};