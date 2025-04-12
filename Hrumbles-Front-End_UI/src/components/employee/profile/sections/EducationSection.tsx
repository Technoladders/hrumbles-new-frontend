
import React, { useState, useEffect } from "react";
import { GraduationCap, Briefcase } from "lucide-react";
import { InfoCard } from "../InfoCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EducationView } from "../../education/EducationView";
import { ExperienceSection } from "../../sections/ExperienceSection";
import { DocumentViewerDialog } from "../../education/DocumentViewerDialog";
import { toast } from "sonner";
import { EducationEditModal } from "../../modals/EducationEditModal";
import { educationService } from "@/services/employee/education.service";
import { experienceService } from "@/services/employee/experience.service";
import { Experience } from "@/services/types/employee.types";

interface EducationSectionProps {
  employeeId: string;
  onEdit: () => void;
}

interface Document {
  name: string;
  url: string;
  type: string;
}

export const EducationSection: React.FC<EducationSectionProps> = ({
  employeeId,
  onEdit,
}) => {
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [educationDocuments, setEducationDocuments] = useState<Document[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);

  useEffect(() => {
    fetchEducationDocuments();
    fetchExperiences();
  }, [employeeId]);

  const fetchEducationDocuments = async () => {
    try {
      const data = await educationService.fetchEducation(employeeId);
      const documents = data.map((edu: any) => ({
        name: `${edu.type.toUpperCase()} Certificate`,
        url: edu.document_url || "",
        type: edu.type.toUpperCase()
      }));
      setEducationDocuments(documents);
    } catch (error) {
      console.error("Error fetching education documents:", error);
      toast.error("Failed to load education documents");
    }
  };

  const fetchExperiences = async () => {
    try {
      const data = await experienceService.fetchExperiences(employeeId);
      // Transform the API response to match the Experience type
      const transformedData = data.map((exp: any) => ({
        id: exp.id,
        jobTitle: exp.job_title,
        company: exp.company,
        location: exp.location,
        employmentType: exp.employment_type,
        startDate: exp.start_date,
        endDate: exp.end_date,
        offerLetter: exp.offer_letter_url,
        separationLetter: exp.separation_letter_url,
        payslips: exp.payslips || []
      }));
      setExperiences(transformedData);
    } catch (error) {
      console.error("Error fetching experiences:", error);
      toast.error("Failed to load experiences");
    }
  };

  const handleDocumentView = (document: Document) => {
    if (!document.url) {
      toast.error("Document not available");
      return;
    }
    setViewingDocument(document);
  };

  const handleDocumentDownload = async (document: Document) => {
    try {
      if (!document.url) {
        toast.error("Document not available");
        return;
      }

      const response = await fetch(document.url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = downloadUrl;
      link.download = `${document.name}.pdf`;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      toast.success("Document downloaded successfully");
    } catch (error) {
      console.error("Error downloading document:", error);
      toast.error("Failed to download document");
    }
  };

  const handleEditComplete = () => {
    setIsEditModalOpen(false);
    fetchEducationDocuments();
  };

  const handleExperienceUpdate = () => {
    fetchExperiences();
  };

  return (
    <InfoCard title="Education & Experience" icon={GraduationCap}>
      <Tabs defaultValue="education" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="education" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Education
          </TabsTrigger>
          <TabsTrigger value="experience" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Experience
          </TabsTrigger>
        </TabsList>
        <div className="mt-4">
          <TabsContent value="education">
            <EducationView
              documents={educationDocuments}
              onEdit={() => setIsEditModalOpen(true)}
              onViewDocument={handleDocumentView}
              onDownloadDocument={handleDocumentDownload}
            />
          </TabsContent>
          <TabsContent value="experience">
            <ExperienceSection 
              employeeId={employeeId}
              data={experiences}
              onUpdate={handleExperienceUpdate}
            />
          </TabsContent>
        </div>
      </Tabs>

      <DocumentViewerDialog
        isOpen={!!viewingDocument}
        onClose={() => setViewingDocument(null)}
        documentUrl={viewingDocument?.url || ""}
        documentType={viewingDocument?.type || ""}
      />

      <EducationEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        employeeId={employeeId}
        onUpdate={handleEditComplete}
      />
    </InfoCard>
  );
};
