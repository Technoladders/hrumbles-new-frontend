import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Calendar,
  Briefcase,
  MapPin,
  FileBadge,
  Eye,
  Download,
  Banknote,
  FileText,
  Copy,
  Mail,
  Phone,
  Award,
  Share2,
  Loader2,
  CheckCircle2,
  XCircle,
  Building,
  Star,
  UserCheck,
  ArrowLeft,
  Link as LinkIcon,
  Fingerprint,
} from "lucide-react";
import { FaLinkedin } from "react-icons/fa";
import { useToast } from "@/components/ui/use-toast";
import { DataSharingOptions } from "@/components/MagicLinkView/types";
import { VerificationProcessDialog } from "./VerificationProcessSection";
import { BgvVerificationSection } from "@/pages/bg-verification/BgvVerificationSection";
import { DocumentState, Candidate } from "@/components/MagicLinkView/types";
 
// Interface for Employee Info
interface EmployeeInfo {
  id: string;
  name: string;
  role: string;
  department: string;
  joinDate: string;
  status: string;
  tags: string[];
  profileImage: string;
  email: string;
  phone: string;
  location: string;
  skills: string[];
  skillRatings: Array<{
    name: string;
    rating: number;
    experienceYears?: number;
    experienceMonths?: number;
  }>;
  experience: string;
  relvantExpyears: string;
  relvantExpmonths: string;
  preferedLocation: string;
  resume: string;
  currentSalary: string;
  expectedSalary: string;
  linkedInId: string;
  noticePeriod: string;
  hasOffers: string;
  offerDetails: string;
  consentStatus: string;
}
 
// Interface for Component Props
interface EmployeeInfoCardProps {
  employee: EmployeeInfo;
  shareMode: boolean;
  sharedDataOptions?: DataSharingOptions;
  onShareClick: () => void;
  isSharing: boolean;
  magicLink: string | null;
  isCopied: boolean;
  onCopyMagicLink: () => void;
  navigateBack: () => void;
  isUanLoading: boolean;
  uanError: string | null;
  uanData: any | null;
  lookupMethod: 'mobile' | 'pan';
  setLookupMethod: (value: 'mobile' | 'pan') => void;
  lookupValue: string;
  setLookupValue: (value: string) => void;
  onUanLookup: () => void;
  isRequestingConsent: boolean;
  consentLink: string | null;
  isConsentLinkCopied: boolean;
  onGenerateConsentLink: () => void;
  onCopyConsentLink: () => void;
  organizationId: string | null;
  userId: string | null;
  documents: {
    uan: DocumentState;
    pan: DocumentState;
    pf: DocumentState;
    esic: DocumentState;
  };
  onDocumentChange: (type: string, value: string) => void;
  onToggleEditing: (type: string) => void;
  onVerifyDocument: (type: string, candidateId: string, workHistory: any, candidate: any, organizationId: string) => Promise<void>;
  onSaveDocuments: () => Promise<void>;
  isSavingDocuments: boolean;
  isUanQueued: boolean;
}
 
// Helper to format currency
const formatINR = (amount: number | string) => {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return isNaN(num)
    ? "N/A"
    : new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(num);
};
 
export const EmployeeInfoCard: React.FC<EmployeeInfoCardProps> = ({
  employee,
  shareMode,
  sharedDataOptions,
  onShareClick,
  isSharing,
  magicLink,
  isCopied,
  onCopyMagicLink,
  navigateBack,
  isUanLoading,
  uanError,
  uanData,
  lookupMethod,
  setLookupMethod,
  lookupValue,
  setLookupValue,
  onUanLookup,
  isRequestingConsent,
  consentLink,
  isConsentLinkCopied,
  onGenerateConsentLink,
  onCopyConsentLink,
  organizationId,
  userId,
  documents,
  onDocumentChange,
  onToggleEditing,
  onVerifyDocument,
  onSaveDocuments,
  isSavingDocuments,
  isUanQueued,
}) => {
  const { toast } = useToast();
 
  // Construct a candidate object required by the verification components
  const candidateForVerification: Candidate = {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      metadata: { uan: documents?.uan?.value || null },
  } as any;
 
  // Helper to get experience text
  const getExperienceText = (skill: typeof employee.skillRatings[0]) => {
    const years = skill.experienceYears || 0;
    const months = skill.experienceMonths || 0;
         
    if (years > 0 && months > 0) {
      return `${years}.${months} years`;
    } else if (years > 0) {
      return `${years} year${years > 1 ? 's' : ''}`;
    } else if (months > 0) {
      return `${months} month${months > 1 ? 's' : ''}`;
    }
    return '0 years';
  };
 
  // Helper to render stars
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3 h-3 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "fill-gray-300 text-gray-300"
            }`}
          />
        ))}
        <span className="text-xs font-bold text-white ml-1">
          {rating}/5
        </span>
      </div>
    );
  };
 
  // Renders the skills section
  const renderSkills = () => {
    if (shareMode && !sharedDataOptions?.personalInfo) return null;
    return (
      <div className="mt-6">
        <h3 className="text-lg font-bold text-gray-800 mb-3">Skills & Expertise</h3>
        <div className="flex flex-wrap gap-2">
          {employee.skillRatings.map((skill, index) => (
            <div key={index} className="relative group">
              <Badge
                className="bg-white text-purple-700 border border-purple-300 text-xs font-normal px-3 py-1.5 shadow-sm cursor-pointer transition-all hover:bg-purple-50 hover:border-purple-400 rounded-md"
              >
                {skill.name}
              </Badge>
              {/* Hover Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-purple-600 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                <div className="flex flex-col gap-1">
                  <div className="font-semibold">{getExperienceText(skill)}</div>
                  {renderStars(skill.rating)}
                </div>
                {/* Arrow */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-purple-600"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
 
  // Renders the consent status badge
  const renderConsentStatusBadge = () => {
    switch (employee.consentStatus) {
      case 'granted':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle2 className="w-3 h-3 mr-1"/>Consent Granted</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100"><Loader2 className="w-3 h-3 mr-1 animate-spin"/>Consent Pending</Badge>;
      case 'denied':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100"><XCircle className="w-3 h-3 mr-1"/>Consent Denied</Badge>;
      default:
        return <Badge variant="outline">Consent Not Requested</Badge>;
    }
  };
 
  return (
    <Card className="bg-white w-full overflow-hidden border-none shadow-xl rounded-2xl">
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
         
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-purple-700">
                {employee.name}
            </h2>
            {/* <p className="text-sm text-gray-500 mt-1">Applied: N/A</p> */}
          </div>
 
          <div className="flex items-center gap-3">
            {!shareMode && (
                <VerificationProcessDialog
                    candidate={candidateForVerification}
                    organizationId={organizationId}
                    userId={userId}
                    isUanLoading={isUanLoading}
                    uanData={uanData}
                    lookupMethod={lookupMethod}
                    setLookupMethod={setLookupMethod}
                    lookupValue={lookupValue}
                    setLookupValue={setLookupValue}
                    onUanLookup={onUanLookup}
                    documents={documents}
                    shareMode={shareMode}
                    onDocumentChange={onDocumentChange}
                    onToggleEditing={onToggleEditing}
                    onVerifyDocument={onVerifyDocument}
                    onSaveDocuments={onSaveDocuments}
                    isSavingDocuments={isSavingDocuments}
                    isUanQueued={isUanQueued}
                />
            )}
           
            {!shareMode && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex items-center space-x-2 px-3 h-9 bg-white text-black-600 border-purple-600 "
                  >
                    <Fingerprint className="w-4 h-4" />
                    <span className="text-sm font-medium">Background Verification</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl w-full h-[80vh] p-0">
                  <BgvVerificationSection candidate={candidateForVerification} />
                </DialogContent>
              </Dialog>
            )}
 
            <Button
                size="sm"
                className="flex items-center space-x-2 px-3 h-9 bg-purple-600 text-white shadow-lg hover:bg-purple-700"
            >
                <span className="text-sm font-medium">Resume</span>
                <Separator orientation="vertical" className="h-4 bg-white/30" />
                <Eye
                    onClick={() => window.open(employee.resume, "_blank")}
                    className="w-4 h-4 cursor-pointer"
                    title="View Resume"
                />
                <Download
                    onClick={() => {
                        const link = document.createElement("a");
                        link.href = employee.resume;
                        link.download = `${employee.name}_Resume.pdf`;
                        link.click();
                        toast({ title: "Resume Download Started" });
                    }}
                    className="w-4 h-4 cursor-pointer"
                    title="Download Resume"
                />
            </Button>
          </div>
        </div>
      </div>
 
      <CardContent className="p-6">
        {/* Contact Info - Simple Line by Line */}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 mb-6">
          <div
              className="relative flex items-center cursor-pointer group"
              onClick={() => {
                  navigator.clipboard.writeText(employee.email);
                  toast({ title: "Email Copied!", description: employee.email });
              }}
          >
              <Mail className="w-4 h-4 mr-2 text-purple-600 flex-shrink-0"/>
              <span className="text-sm text-gray-700">{employee.email}</span>
          </div>
          <div
              className="relative flex items-center cursor-pointer group"
              onClick={() => {
                  navigator.clipboard.writeText(employee.phone);
                  toast({ title: "Phone Copied!", description: employee.phone });
              }}
          >
              <Phone className="w-4 h-4 mr-2 text-purple-600 flex-shrink-0"/>
              <span className="text-sm text-gray-700">{employee.phone}</span>
          </div>
          <a href={employee.linkedInId} target="_blank" rel="noopener noreferrer" className="flex items-center group">
              <FaLinkedin className="w-4 h-4 mr-2 text-purple-600 flex-shrink-0" />
              <span className="text-sm text-purple-700 group-hover:underline">LinkedIn Profile</span>
          </a>
        </div>
 
        <Separator className="my-6"/>
 
        {/* Info Grid - Simple Line by Line */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4">
            <div className="flex items-center">
              <Briefcase className="w-4 h-4 mr-2 text-purple-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 uppercase">Total Experience</p>
                <p className="text-sm font-medium text-gray-800">{employee.experience}</p>
              </div>
            </div>
            <div className="flex items-center">
              <Star className="w-4 h-4 mr-2 text-purple-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 uppercase">Relevant Experience</p>
                <p className="text-sm font-medium text-gray-800">N/A</p>
              </div>
            </div>
            <div className="flex items-center">
              <MapPin className="w-4 h-4 mr-2 text-purple-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 uppercase">Current Location</p>
                <p className="text-sm font-medium text-gray-800">{employee.location}</p>
              </div>
            </div>
            <div className="flex items-center">
              <Building className="w-4 h-4 mr-2 text-purple-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 uppercase">Preferred Location</p>
                <p className="text-sm font-medium text-gray-800">{employee.preferedLocation}</p>
              </div>
            </div>
            <div className="flex items-center">
              <Banknote className="w-4 h-4 mr-2 text-purple-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 uppercase">Current Salary</p>
                <p className="text-sm font-medium text-gray-800">{formatINR(employee.currentSalary)} LPA</p>
              </div>
            </div>
            <div className="flex items-center">
              <Banknote className="w-4 h-4 mr-2 text-purple-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 uppercase">Expected Salary</p>
                <p className="text-sm font-medium text-gray-800">{formatINR(employee.expectedSalary)} LPA</p>
              </div>
            </div>
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-purple-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 uppercase">Notice Period</p>
                <p className="text-sm font-medium text-gray-800">{employee.noticePeriod} </p>
              </div>
            </div>
            <div className="flex items-center">
              <UserCheck className="w-4 h-4 mr-2 text-purple-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 uppercase">Has Offers</p>
                <p className="text-sm font-medium text-gray-800">{employee.hasOffers}</p>
              </div>
            </div>
        </div>
       
        {renderSkills()}
      </CardContent>
    </Card>
  );
};