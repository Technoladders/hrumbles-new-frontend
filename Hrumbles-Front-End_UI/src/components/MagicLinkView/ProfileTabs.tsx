// components/ProfileTabs.tsx
import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CardContent } from "@/components/ui/card";
import { ResumeAnalysis, WorkHistory, DocumentState, Candidate, DataSharingOptions, CompanyOption} from "@/components/MagicLinkView/types";
import { ResumeAnalysisSection } from "./ResumeAnalysisSection";
import { SkillMatrixSection } from "./SkillMatrixSection";
import { WorkHistorySection } from "./WorkHistorySection";
import { DocumentsSection } from "./DocumentsSection";
import { ResumePreviewSection } from "./ResumePreviewSection";


interface ProfileTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
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
  onDocumentChange: (type: keyof typeof documents, value: string) => void;
  onToggleEditing: (type: keyof typeof documents) => void;
  onToggleUANResults: () => void;
  onVerifyDocument: (type: keyof typeof documents) => Promise<void>;
  onSaveDocuments: () => Promise<void>;
  isSavingDocuments: boolean;

  employeeResumeUrl: string;
  candidateId: string | undefined;
  candidate: Candidate | null; // Pass down
  userId: string; // Pass down
  organizationId: string; // Pass down
  workHistory: WorkHistory[];
  isVerifyingAllWorkHistory: boolean;
  onVerifyAllCompanies: () => void;
  onVerifySingleWorkHistory: (company: WorkHistory) => void;
  updateWorkHistoryItem: (companyId: number, updates: Partial<WorkHistory>) => void;

}

export const ProfileTabs: React.FC<ProfileTabsProps> = ({
  activeTab,
  setActiveTab,
  availableTabs,
  resumeAnalysis,
  workHistory,
  documents,
  shareMode,
  sharedDataOptions,
  employeeSkillRatings,
  onDocumentChange,
  onToggleEditing,
  onToggleUANResults,
  onVerifyDocument,
  onSaveDocuments,
  isSavingDocuments,
  isVerifyingAllWorkHistory,
  onVerifyAllCompanies,
  onVerifySingleWorkHistory,
  updateWorkHistoryItem,
  employeeResumeUrl,
  candidateId,
  candidate, // Destructure
  userId,    // Destructure
  organizationId // Destructure
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
              {tab === "documents" && "Documents"}
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

        {(!shareMode || sharedDataOptions?.documentsInfo) && (
          <TabsContent value="documents">
            <DocumentsSection
              documents={documents}
              shareMode={shareMode}
              onDocumentChange={onDocumentChange}
              onToggleEditing={onToggleEditing}
              onToggleUANResults={onToggleUANResults}
              onVerifyDocument={onVerifyDocument}
              onSaveDocuments={onSaveDocuments}
              isSavingDocuments={isSavingDocuments}
            />
          </TabsContent>
        )}

        <TabsContent value="resume">
          <ResumePreviewSection resumeUrl={employeeResumeUrl} />
        </TabsContent>
      </Tabs>
    </CardContent>
  );
};