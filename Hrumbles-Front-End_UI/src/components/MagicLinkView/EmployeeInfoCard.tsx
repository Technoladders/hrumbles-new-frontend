// components/EmployeeInfoCard.tsx
import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
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
  // ---- ADD THESE NEW ICONS ----
  Building,
  Star,
  UserCheck,
  ArrowLeft,
  Link as LinkIcon, 
} from "lucide-react";

import { FaLinkedin } from "react-icons/fa";
import { useToast } from "@/components/ui/use-toast";
import { DataSharingOptions } from "@/components/MagicLinkView/types";
import { VerificationProcessDialog } from "./VerificationProcessSection";
import { DocumentState } from "@/components/MagicLinkView/types";

// Updated Interface for Employee Info
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
  consentStatus: string; // New property
}

// Updated Interface for Component Props
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
  // Props for UAN Lookup
  isUanLoading: boolean;
  uanError: string | null;
  uanData: any | null;
  lookupMethod: 'mobile' | 'pan';
  setLookupMethod: (value: 'mobile' | 'pan') => void;
  lookupValue: string;
  setLookupValue: (value: string) => void;
  onUanLookup: () => void;
  // New props for Consent Link functionality
  isRequestingConsent: boolean;
  consentLink: string | null;
  isConsentLinkCopied: boolean;
  onGenerateConsentLink: () => void;
  onCopyConsentLink: () => void;
  
  // ============================================
  // ADD THESE NEW PROPS (around line 65-75):
  // ============================================
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


const InfoItem = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | React.ReactNode }) => (
  <div className="flex items-start p-3 bg-gray-50 rounded-lg">
    <div className="flex-shrink-0 text-purple-600">{icon}</div>
    <div className="ml-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value}</p>
    </div>
  </div>
);




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
  // UAN props
  isUanLoading,
  uanError,
  uanData,
  lookupMethod,
  setLookupMethod,
  lookupValue,
  setLookupValue,
  onUanLookup,
  // Consent props
  isRequestingConsent,
  consentLink,
  isConsentLinkCopied,
  onGenerateConsentLink,
  onCopyConsentLink,
  
  // ============================================
  // ADD THESE NEW DESTRUCTURED PROPS (around line 110):
  // ============================================
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
 const [hoveredCopy, setHoveredCopy] = React.useState<string | null>(null);


// ADD THIS NEW VERSION
  const renderSkills = () => {
    if (shareMode && !sharedDataOptions?.personalInfo) return null;
    return (
      <div className="mt-6">
        <h3 className="text-lg font-bold text-gray-800 mb-3">Skills & Expertise</h3>
        <div className="flex flex-wrap gap-2">
          {employee.skillRatings.map((skill, index) => (
            <Badge
              key={index}
              className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-none text-sm px-4 py-1 shadow-lg"
            >
              {skill.name}
            </Badge>
          ))}
        </div>
      </div>
    );
  };

  // New helper function to render the consent status badge
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


// PASTE THIS ENTIRE BLOCK TO REPLACE YOUR CURRENT 'return' STATEMENT

return (
    <Card className="bg-white w-full overflow-hidden border-none shadow-2xl rounded-2xl">
      {/* ======================================================================= */}
      {/* HEADER SECTION - This is the completely redesigned header */}
      {/* ======================================================================= */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-start">
          
          {/* --- LEFT COLUMN: Name & Magic Link --- */}
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">
                  {employee.name}
              </h2>
              <p className="text-sm text-gray-500 mt-1">Applied: {employee.joinDate}</p>
            </div>

            {!shareMode && (
              <div>
                <Button
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold w-full md:w-auto"
                  onClick={onShareClick}
                  disabled={isSharing}
                >
                  {isSharing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
                    </>
                  ) : (
                    <>
                      <Share2 className="mr-2 h-4 w-4" /> Create Shareable Magic Link
                    </>
                  )}
                </Button>
                {magicLink && (
                  <div className="mt-3 p-2 bg-gray-100 rounded-md border flex items-center gap-2">
                    <LinkIcon className="h-5 w-5 text-purple-500 flex-shrink-0" />
                    <Input value={magicLink} readOnly className="text-sm bg-white border-gray-200 text-gray-700 flex-grow h-8" />
                    <Button variant="ghost" size="icon" onClick={onCopyMagicLink} className="h-8 w-8">
                      {isCopied ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5 text-gray-400" />}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* --- RIGHT COLUMN: Verification & Resume Buttons --- */}
          <div className="flex items-center gap-3">
            {!shareMode && (
                <VerificationProcessDialog 
                    candidate={{
                      id: employee.id,
                      name: employee.name,
                      email: employee.email,
                      phone: employee.phone,
                      metadata: { uan: documents?.uan?.value || null },
                    } as any}
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

      {/* ======================================================================= */}
      {/* BODY SECTION - This remains largely the same but with minor style tweaks */}
      {/* ======================================================================= */}
      <CardContent className="p-6">
        {/* Contact Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Email Item */}
          <div
              className="relative flex items-center p-3 bg-gray-100 rounded-lg cursor-pointer group transition-all hover:bg-purple-50 hover:shadow-md"
              onMouseEnter={() => setHoveredCopy('email')}
              onMouseLeave={() => setHoveredCopy(null)}
              onClick={() => {
                  navigator.clipboard.writeText(employee.email);
                  toast({ title: "Email Copied!", description: employee.email });
              }}
          >
              <Mail className="w-5 h-5 mr-3 text-purple-600 flex-shrink-0"/>
              <span className="text-sm text-gray-700 truncate pr-6">{employee.email}</span>
              {hoveredCopy === 'email' && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <Copy className="w-4 h-4 text-gray-400 group-hover:text-purple-600 transition-colors" />
                  </div>
              )}
          </div>
          {/* Phone Item */}
          <div
              className="relative flex items-center p-3 bg-gray-100 rounded-lg cursor-pointer group transition-all hover:bg-purple-50 hover:shadow-md"
              onMouseEnter={() => setHoveredCopy('phone')}
              onMouseLeave={() => setHoveredCopy(null)}
              onClick={() => {
                  navigator.clipboard.writeText(employee.phone);
                  toast({ title: "Phone Copied!", description: employee.phone });
              }}
          >
              <Phone className="w-5 h-5 mr-3 text-purple-600 flex-shrink-0"/>
              <span className="text-sm text-gray-700 pr-6">{employee.phone}</span>
              {hoveredCopy === 'phone' && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <Copy className="w-4 h-4 text-gray-400 group-hover:text-purple-600 transition-colors" />
                  </div>
              )}
          </div>
          {/* LinkedIn Item */}
          <a href={employee.linkedInId} target="_blank" rel="noopener noreferrer" className="flex items-center p-3 bg-gray-100 rounded-lg transition-all hover:bg-purple-50 hover:shadow-md">
              <FaLinkedin className="w-5 h-5 mr-3 text-purple-600 flex-shrink-0" />
              <span className="text-sm font-medium text-purple-700">LinkedIn Profile</span>
          </a>
        </div>

        <Separator className="my-6"/>

        {/* Professional Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <InfoItem icon={<Briefcase size={20}/>} label="Total Experience" value={`${employee.experience}`} />
            <InfoItem icon={<Star size={20}/>} label="Relevant Experience" value="N/A" />
            <InfoItem icon={<MapPin size={20}/>} label="Current Location" value={employee.location} />
            <InfoItem icon={<Building size={20}/>} label="Preferred Location" value={employee.preferedLocation} />
            <InfoItem icon={<Banknote size={20}/>} label="Current Salary" value={`${formatINR(employee.currentSalary)} LPA`} />
            <InfoItem icon={<Banknote size={20}/>} label="Expected Salary" value={`${formatINR(employee.expectedSalary)} LPA`} />
            <InfoItem icon={<Calendar size={20}/>} label="Notice Period" value={`${employee.noticePeriod} days`} />
            <InfoItem icon={<UserCheck size={20}/>} label="Has Offers" value={employee.hasOffers} />
        </div>
        
        {/* Skills Section */}
        {renderSkills()}
      </CardContent>
    </Card>
  );
};