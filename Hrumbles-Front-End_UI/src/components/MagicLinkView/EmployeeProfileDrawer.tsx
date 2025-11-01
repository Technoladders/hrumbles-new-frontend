import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { useSelector } from "react-redux";
import EmployeeDataSelection, { DataSharingOptions } from "./EmployeeDataSelection";
import { useEmployeeProfile } from "@/components/MagicLinkView/hooks/useEmployeeProfile";
import { useDocumentVerification } from "@/components/MagicLinkView/hooks/useDocumentVerification";
import { useWorkHistoryVerification } from "@/components/MagicLinkView/hooks/useWorkHistoryVerification";
import { useTimeline } from "@/components/MagicLinkView/hooks/useTimeline";
import { useShareLink } from "@/components/MagicLinkView/hooks/useShareLink";
import { EmployeeInfoCard } from "./EmployeeInfoCard";
import { ProfileTabs } from "./ProfileTabs";
import { Candidate } from "@/components/MagicLinkView/types";
import { useUanLookup } from "@/components/MagicLinkView/hooks/useUanLookup";
import { useConsentLink } from "@/components/MagicLinkView/hooks/useConsentLink";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { WorkHistorySection } from "./WorkHistorySection";

interface EmployeeProfilePageProps {
  shareMode?: boolean;
  shareId?: string;
  sharedDataOptions?: DataSharingOptions;
}

const EmployeeProfilePage: React.FC<EmployeeProfilePageProps> = ({
  shareMode = false,
  shareId,
  sharedDataOptions: initialSharedDataOptions,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { candidateId, jobId } = useParams<{ candidateId: string; jobId: string }>();

  const user = useSelector((state: any) => state.auth.user);
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  const {
    candidate,
    documents,
    resumeAnalysis,
    loading,
    error,
    setDocuments,
    setCandidate,
  } = useEmployeeProfile(shareMode, shareId, initialSharedDataOptions);

  const {
    documents: verifiedDocuments,
    handleDocumentChange,
    toggleEditing,
    toggleUANResults,
    verifyDocument,
    saveDocuments,
    isSavingDocuments,
  } = useDocumentVerification(documents, shareMode);

  const {
    workHistory,
    setWorkHistory,
    isVerifyingAll: isVerifyingAllWorkHistory,
    verifyAllCompanies,
    handleVerifySingleWorkHistory,
    updateWorkHistoryItem,
  } = useWorkHistoryVerification(candidate, organization_id);

  console.log("candidateptofile", workHistory);

  const { timeline, timelineLoading, timelineError } = useTimeline(
    candidateId,
    shareMode
  );

  const {
    isSharing,
    magicLink,
    isCopied,
    setShowDataSelection,
    showDataSelection,
    generateMagicLink,
    copyMagicLink,
    currentDataOptions,
    setCurrentDataOptions,
  } = useShareLink(initialSharedDataOptions);

  const {
    isRequesting: isRequestingConsent,
    consentLink,
    isCopied: isConsentLinkCopied,
    generateConsentLink,
    copyConsentLink,
    setConsentLink,
  } = useConsentLink();

  const handleSaveUanResult = useCallback(async (dataToSave: any) => {
    if (dataToSave.status !== 1) {
      console.log("UAN lookup was not successful, skipping UI update.");
      return;
    }

    const uanNumber = dataToSave?.msg?.uan_details?.[0]?.uan || null;
    if (!uanNumber) {
      console.log("No UAN number found in the response, skipping UI update.");
      return;
    }
    
    const updatedMetadata = {
      ...candidate.metadata,
      uan: uanNumber,
    };

    const { error: updateCandidateError } = await supabase
      .from('hr_job_candidates')
      .update({ metadata: updatedMetadata })
      .eq('id', candidate.id);

    if (updateCandidateError) {
      toast({ title: "Profile Update Failed", description: updateCandidateError.message, variant: "destructive" });
    }

    setCandidate((prevCandidate) => ({
      ...prevCandidate,
      metadata: updatedMetadata,
    }));

    setDocuments((prev) => ({
      ...prev,
      uan: { ...prev.uan, value: uanNumber },
    }));

    toast({
      title: 'Success',
      description: `UAN ${uanNumber} has been updated on the profile.`,
      variant: 'success',
    });
  }, [candidate, setCandidate, setDocuments, toast]);

  const {
    isLoading: isUanLoading,
    uanData,
    lookupMethod,
    setLookupMethod,
    lookupValue,
    setLookupValue,
    handleLookup: onUanLookup,
    isQueued: isUanQueued,
  } = useUanLookup(candidate, organization_id, user?.id, handleSaveUanResult);

  console.log("UAN Data:", uanData);

  useEffect(() => {
    setDocuments(verifiedDocuments);
  }, [verifiedDocuments, setDocuments]);

  useEffect(() => {
    if (shareMode && initialSharedDataOptions) {
      setCurrentDataOptions(initialSharedDataOptions);
    }
  }, [shareMode, initialSharedDataOptions, setCurrentDataOptions]);

  // Separate state for left and right tabs
const [leftActiveTab, setLeftActiveTab] = useState<string>("resume-analysis");
const [rightActiveTab, setRightActiveTab] = useState<string>("skill-matrix");

  const normalizeSkills = (skills: any[] | undefined): string[] => {
    if (!skills || !skills.length) return ["N/A"];
    return skills.map((skill) => (typeof skill === "string" ? skill : skill?.name || "Unknown"));
  };

  const employeeFormatted = candidate
    ? {
        id: candidate.id || "emp001",
        name: candidate.name || "Unknown Candidate",
        role: candidate.metadata?.role || "N/A",
        department: candidate.metadata?.department || "N/A",
        joinDate: candidate.appliedDate || "N/A",
        status: candidate.status || "Applied",
        tags: candidate.metadata?.tags || ["N/A"],
        profileImage: candidate.metadata?.profileImage || "/lovable-Uploads/placeholder.png",
        email: candidate.email || "N/A",
        phone: candidate.phone || "N/A",
        location: candidate.metadata?.currentLocation || "N/A",
        skills: normalizeSkills(candidate.skills || candidate.skill_ratings),
        skillRatings: candidate.skill_ratings || [],
        experience: candidate.experience || "N/A",
        relvantExpyears: candidate.metadata?.relevantExperience || "N/A",
        relvantExpmonths: candidate.metadata?.relevantExperienceMonths || "N/A",
        preferedLocation: Array.isArray(candidate.metadata?.preferredLocations)
          ? candidate.metadata.preferredLocations.join(", ")
          : "N/A",
        resume: candidate.resume || candidate.metadata?.resume_url || "#",
        currentSalary: candidate.current_salary  || "N/A",
        expectedSalary: candidate.expected_salary || "N/A",
        linkedInId: candidate.metadata?.linkedInId || "N/A",
        noticePeriod: candidate.metadata?.noticePeriod || "N/A",
        hasOffers: candidate.metadata?.hasOffers || "N/A",
        offerDetails: candidate.metadata?.offerDetails || "N/A",
        consentStatus: candidate.consent_status || 'not_requested',
      }
    : {
        id: "emp001",
        name: "Unknown Candidate",
        role: "N/A",
        department: "N/A",
        joinDate: "N/A",
        status: "N/A",
        tags: ["N/A"],
        profileImage: "/lovable-uploads/placeholder.png",
        email: "N/A",
        phone: "N/A",
        location: "N/A",
        skills: ["N/A"],
        skillRatings: [],
        experience: "N/A",
        relvantExpyears: "N/A",
        relvantExpmonths: "N/A",
        preferedLocation: "N/A",
        resume: "#",
        currentSalary: "N/A",
        expectedSalary: "N/A",
        linkedInId: "N/A",
        noticePeriod: "N/A",
        hasOffers: "N/A",
        offerDetails: "N/A",
        consentStatus: 'not_requested',
      };

  const employee = shareMode
    ? {
        ...employeeFormatted,
        email: currentDataOptions?.contactInfo && candidate?.email ? candidate.email : "N/A",
        phone: currentDataOptions?.contactInfo && candidate?.phone ? candidate.phone : "N/A",
        currentSalary: currentDataOptions?.personalInfo && candidate?.currentSalary ? candidate.currentSalary : "N/A",
        expectedSalary: currentDataOptions?.personalInfo && candidate?.expectedSalary ? candidate.expectedSalary : "N/A",
        linkedInId: currentDataOptions?.contactInfo && candidate?.metadata?.linkedInId ? candidate.metadata.linkedInId : "N/A",
        noticePeriod: currentDataOptions?.personalInfo && candidate?.metadata?.noticePeriod ? candidate.metadata.noticePeriod : "N/A",
        hasOffers: currentDataOptions?.personalInfo && candidate?.metadata?.hasOffers ? candidate.metadata.hasOffers : "N/A",
        offerDetails: currentDataOptions?.personalInfo && candidate?.metadata?.offerDetails ? candidate.metadata.offerDetails : "N/A",
      }
    : employeeFormatted;

  const availableTabs = [
    resumeAnalysis && "resume-analysis",
    (!shareMode || currentDataOptions?.skillinfo) && "skill-matrix",
    workHistory.length > 0 && "work-history",
    (!shareMode || currentDataOptions?.documentsInfo) && "bg-verification",
    "resume",
  ].filter(Boolean) as string[];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-lg">Loading...</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-500" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-lg">Error</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-6 text-sm">{error}</p>
            <Button onClick={() => navigate(-1)} variant="outline">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (shareMode && !availableTabs.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-lg">No Data Available</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-6 text-sm">
              No data has been selected for sharing.
            </p>
            <Button onClick={() => navigate(-1)} variant="outline">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

 return (
  <>
    <div className="min-h-screen bg-gray-50 py-4 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-10xl mx-auto">

                {!shareMode && (
          <div className="mb-4">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </Button>
          </div>
        )}
        {/* CHANGED: Single column layout - removed flex-row and width constraints */}
        <div className="flex flex-col gap-6">
          
          {/* Employee Info Card - Full Width */}
          <EmployeeInfoCard
            employee={employee as any}
            shareMode={shareMode}
            sharedDataOptions={currentDataOptions}
            onShareClick={() => setShowDataSelection(true)}
            isSharing={isSharing}
            magicLink={magicLink}
            isCopied={isCopied}
            onCopyMagicLink={copyMagicLink}
            navigateBack={() => navigate(-1)}
            isUanLoading={isUanLoading}
            uanError={error}
            uanData={uanData}
            lookupMethod={lookupMethod}
            setLookupMethod={setLookupMethod}
            lookupValue={lookupValue}
            setLookupValue={setLookupValue}
            onUanLookup={onUanLookup}
            isRequestingConsent={isRequestingConsent}
            consentLink={consentLink}
            isConsentLinkCopied={isConsentLinkCopied}
            onGenerateConsentLink={() => generateConsentLink(candidate!, organization_id)}
            onCopyConsentLink={copyConsentLink}
            organizationId={organization_id}
            userId={user?.id}
            documents={verifiedDocuments}
            onDocumentChange={handleDocumentChange}
            onToggleEditing={toggleEditing}
            onVerifyDocument={(type) => verifyDocument(type, candidateId || '', workHistory, candidate, organization_id)}
            onSaveDocuments={() => saveDocuments(candidateId || '', candidate?.metadata)}
            isSavingDocuments={isSavingDocuments}
            isUanQueued={isUanQueued}
          />

          {/* Work History Timeline - Full Width */}
          {workHistory.length > 0 && (
            <WorkHistorySection
              workHistory={workHistory}
              shareMode={shareMode}
              isVerifyingAll={isVerifyingAllWorkHistory}
              onVerifyAllCompanies={verifyAllCompanies}
              onVerifySingleWorkHistory={handleVerifySingleWorkHistory}
              updateWorkHistoryItem={updateWorkHistoryItem}
              candidate={candidate}
            />
          )}

          {/* Skill Matrix - Full Width */}
          <ProfileTabs
            availableTabs={[
              (!shareMode || currentDataOptions?.skillinfo) && "skill-matrix",
            ].filter(Boolean) as string[]}
            resumeAnalysis={resumeAnalysis}
            workHistory={workHistory}
            shareMode={shareMode}
            sharedDataOptions={currentDataOptions}
            employeeSkillRatings={employee.skillRatings}
            onDocumentChange={handleDocumentChange}
            onToggleEditing={toggleEditing}
            onToggleUANResults={toggleUANResults}
            onVerifyDocument={(type) =>
              verifyDocument(type, candidateId || '', workHistory, candidate, organization_id)
            }
            onSaveDocuments={() => saveDocuments(candidateId || '', candidate?.metadata)}
            isSavingDocuments={isSavingDocuments}
            isVerifyingAllWorkHistory={isVerifyingAllWorkHistory}
            employeeResumeUrl={employee.resume}
            candidateId={candidateId}
            userId={user?.id}
            organizationId={organization_id}
            onVerifyAllCompanies={verifyAllCompanies}
            onVerifySingleWorkHistory={handleVerifySingleWorkHistory}
            updateWorkHistoryItem={updateWorkHistoryItem}
            candidate={candidate}
          />

          {/* Resume Analysis and Resume tabs - Full Width */}
          <ProfileTabs
            availableTabs={[
              resumeAnalysis && "resume-analysis",
              "resume"
            ].filter(Boolean) as string[]}
            resumeAnalysis={resumeAnalysis}
            workHistory={workHistory}
            shareMode={shareMode}
            sharedDataOptions={currentDataOptions}
            employeeSkillRatings={employee.skillRatings}
            onDocumentChange={handleDocumentChange}
            onToggleEditing={toggleEditing}
            onToggleUANResults={toggleUANResults}
            onVerifyDocument={(type) =>
              verifyDocument(type, candidateId || '', workHistory, candidate, organization_id)
            }
            onSaveDocuments={() => saveDocuments(candidateId || '', candidate?.metadata)}
            isSavingDocuments={isSavingDocuments}
            isVerifyingAllWorkHistory={isVerifyingAllWorkHistory}
            employeeResumeUrl={employee.resume}
            candidateId={candidateId}
            userId={user?.id}
            organizationId={organization_id}
            onVerifyAllCompanies={verifyAllCompanies}
            onVerifySingleWorkHistory={handleVerifySingleWorkHistory}
            updateWorkHistoryItem={updateWorkHistoryItem}
            candidate={candidate}
          />

        </div>
      </div>
    </div>
 
    {!shareMode && (
      <EmployeeDataSelection
        open={showDataSelection}
        onClose={() => setShowDataSelection(false)}
        onConfirm={(options) => generateMagicLink(options, candidate!, jobId, organization_id)}
        defaultOptions={currentDataOptions}
      />
    )}
  </>
);
};

export default EmployeeProfilePage;