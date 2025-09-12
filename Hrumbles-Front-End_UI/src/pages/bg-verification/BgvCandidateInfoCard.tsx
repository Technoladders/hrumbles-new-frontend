import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, Mail, Phone, Eye, Download, FileBadge, MapPin, Briefcase, Copy, Pencil } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Candidate } from "@/lib/types";
import { EditCandidateDetailsModal } from "./EditCandidateDetailsModal";

// Interface for Candidate (aligned with console data)
interface CandidateInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
  applied_date: string;
  location: string | null;
  resume_url: string;
  career_experience: Array<{
    company: string;
    designation: string;
    start_date: string;
    end_date: string;
  }>;
  skills: string[];
}

// Interface for Component Props
interface BgvCandidateInfoCardProps {
  candidate: CandidateInfo;
}



export const BgvCandidateInfoCard: React.FC<BgvCandidateInfoCardProps> = ({ candidate }) => {
  const { toast } = useToast();
   const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Convert numeric month to name
  const getMonthName = (month: number) => {
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    return months[month];
  };

  // Format date range (e.g., "Aug 2023 - Present")
  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = endDate === "Present" ? "Present" : new Date(endDate);
    const startMonth = getMonthName(start.getMonth());
    const startYear = start.getFullYear();
    const endMonth = end === "Present" ? "Present" : getMonthName((end as Date).getMonth());
    const endYear = end === "Present" ? "" : (end as Date).getFullYear();
    return `${startMonth} ${startYear} - ${endMonth} ${endYear}`;
  };

  console.log(candidate);


  // Render skills badges
  const renderSkills = () => {
    return (
      <div className="mt-4">
        <h3 className="text-sm font-medium mb-2">Skills & Expertise</h3>
        <div className="flex flex-wrap gap-2">
          {candidate.skills?.map((skill, index) => (
            <Badge key={index} variant="outline" className="bg-purple-100 text-purple-700">
              {skill}
            </Badge>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
    <Card className="bg-white w-full h-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{candidate.name}</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsEditModalOpen(true)}>
                  <Pencil className="h-4 w-4" />
                  <span className="sr-only">Edit Candidate Details</span>
                </Button>
            </div>
            <div className="flex items-center mt-1 text-sm text-gray-500">
              <Calendar className="w-4 h-4 mr-1" />
              <span>Created: {candidate.applied_date}</span>
            </div>
          </div>
          {candidate.resume_url && (
            <Button
              variant="resume"
              size="sm"
              className="flex items-center space-x-2 px-3 py-1"
            >
              <span className="text-sm font-medium">Resume</span>
              <Separator orientation="vertical" className="h-4 bg-gray-300" />
              <span
                onClick={() => window.open(candidate.resume_url, "_blank")}
                className="cursor-pointer hover:text-gray-800"
                title="View Resume"
              >
                <Eye className="w-4 h-4" />
              </span>
              <span
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = candidate.resume_url;
                  link.download = `${candidate.name}_Resume.docx`;
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
          )}
        </div>

        <div className="mt-6">
          <Card className="border border-gray-200 bg-white shadow-sm w-full">
  <CardContent className="p-4">
    <div className="flex flex-col space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
        <div className="flex items-center space-x-2">
          <Mail className="w-4 h-4 mr-2 text-indigo-500" />
          <span className="text-gray-600">{candidate.email}</span>
          <Button
            variant="copyicon"
            size="xs"
            onClick={() => {
              navigator.clipboard.writeText(candidate.email);
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
        <div className="flex items-center space-x-2">
          <Phone className="w-4 h-4 mr-2 text-indigo-500" />
          <span className="text-gray-600">{candidate.phone}</span>
          <Button
            variant="copyicon"
            size="xs"
            onClick={() => {
              navigator.clipboard.writeText(candidate.phone);
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
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
        <div className="flex items-center space-x-2">
          <FileBadge className="w-4 h-4 text-indigo-500" />
          <span>Total Experience • {calculateTotalExperience()}</span>
        </div>
        {/* <div className="flex items-center space-x-2">
          <MapPin className="w-4 h-4 text-indigo-500" />
          <span>Current Location • {candidate.location || "N/A"}</span>
        </div> */}
      </div>
      {/* <div className="space-y-4">
        <h3 className="text-sm font-medium">Experience</h3>
        {candidate.career_experience?.map((exp, index) => (
          <div key={index} className="flex items-start space-x-2">
            <Briefcase className="w-6 h-6 text-blue-500 mt-1" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">{exp.company}</div>
              <div className="text-sm text-gray-700">{exp.designation}</div>
              <div className="text-sm text-gray-500">
                {formatDateRange(exp.start_date, exp.end_date)} • {candidate.location || "N/A"} • Full-Time
              </div>
            </div>
          </div>
        ))}
      </div> */}
      {renderSkills()}
    </div>
  </CardContent>
</Card>
        </div>
      </CardHeader>
    </Card>
       {/* --- RENDER THE EDIT MODAL --- */}
      <EditCandidateDetailsModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        candidate={candidate}
      />
    </>
  );

  // Calculate total experience (unchanged logic, updated format)
  function calculateTotalExperience() {
    if (!candidate.career_experience || candidate.career_experience.length === 0) {
      return "N/A";
    }
    const experiences = candidate.career_experience;
    let totalMonths = 0;
    experiences.forEach((exp) => {
      const start = new Date(exp.start_date);
      const end = exp.end_date === "Present" ? new Date() : new Date(exp.end_date);
      const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      totalMonths += months;
    });
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    return years > 0 ? `${years} years and ${months} months` : `${months} months`;
  }
};