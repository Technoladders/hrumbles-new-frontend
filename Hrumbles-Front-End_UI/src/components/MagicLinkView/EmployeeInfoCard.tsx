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
  MapPinPlus,
  Share2,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { FaLinkedin } from "react-icons/fa";
import { useToast } from "@/components/ui/use-toast";
import { DataSharingOptions } from "@/components/MagicLinkView/types";

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
  // Props for UAN Lookup are kept for completeness, though the UI is commented out
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
  // UAN props (unused in this component's UI but kept for prop integrity)
  isUanLoading,
  uanError,
  uanData,
  lookupMethod,
  setLookupMethod,
  lookupValue,
  setLookupValue,
  onUanLookup,
  // Destructure new consent link props
  isRequestingConsent,
  consentLink,
  isConsentLinkCopied,
  onGenerateConsentLink,
  onCopyConsentLink,
}) => {
  const { toast } = useToast();

  const renderSkills = () => {
    if (shareMode && !sharedDataOptions?.personalInfo) return null;
    return (
      <div className="mt-4">
        <h3 className="text-sm font-medium mb-2">Skills & Expertise</h3>
        <div className="flex flex-wrap gap-2">
          {employee.skillRatings.map((skill, index) => (
            <Badge
              key={index}
              variant="outline"
              className="bg-purple-50 text-purple-700 border-purple-200"
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


  return (
    <Card className="bg-white w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {employee.name}
              </h2>
              <div className="flex items-center gap-2">
                {/* Render the status badge in the header for visibility */}
                {/* {!shareMode && renderConsentStatusBadge()} */}
                <Button onClick={navigateBack} variant="outline" size="sm">
                  Back
                </Button>
              </div>
            </div>
            <div className="flex items-center mt-1 text-sm text-gray-500">
              <Calendar className="w-4 h-4 mr-1" />
              <span>Applied: {employee.joinDate}</span>
            </div>
            {!shareMode && (
              <div className="mt-4 space-y-4">
                {/* --- SHARE LINK SECTION (EXISTING) --- */}
                <Button
                  variant="outline"
                  className="flex items-center justify-center bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200 w-auto"
                  onClick={onShareClick}
                  disabled={isSharing || employee.id === "emp001"}
                >
                  {isSharing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                      Generating Link...
                    </>
                  ) : (
                    <>
                      <Share2 className="mr-2 h-4 w-4" /> Create Shareable Magic Link
                    </>
                  )}
                </Button>
                {magicLink && (
                  <div className="p-3 bg-indigo-50 rounded-md border border-indigo-100 relative">
                    <p className="text-xs text-indigo-700 mb-1 font-medium">
                      Magic Link (expires in 2 days):
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        value={magicLink}
                        readOnly
                        className="text-xs bg-white border-indigo-200 w-full"
                      />
                      <Button variant="ghost" size="sm" onClick={onCopyMagicLink}>
                        {isCopied ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4 text-indigo-500" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
                 {/* --- CONSENT LINK SECTION (NEW) --- */}
                 {/* <Button
                    variant="outline"
                    className="flex items-center justify-center bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 w-full"
                    onClick={onGenerateConsentLink}
                    disabled={isRequestingConsent || employee.id === "emp001" || employee.consentStatus === 'granted'}
                >
                  {isRequestingConsent ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" /> 
                      {employee.consentStatus === 'pending' || employee.consentStatus === 'denied' ? 'Resend Consent Request' : 'Request Candidate Consent'}
                    </>
                  )}
                </Button> */}
                {consentLink && (
                  <div className="p-3 bg-blue-50 rounded-md border border-blue-100 relative">
                    <p className="text-xs text-blue-700 mb-1 font-medium">
                      Consent Link (send to candidate):
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input value={consentLink} readOnly className="text-xs bg-white border-blue-200 w-full" />
                      <Button variant="ghost" size="sm" onClick={onCopyConsentLink}>
                        {isConsentLinkCopied ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4 text-blue-500" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <Button
            variant="resume"
            size="sm"
            className="flex items-center space-x-2 px-3 py-1"
          >
            <span className="text-sm font-medium">Resume</span>
            <Separator orientation="vertical" className="h-4 bg-gray-300" />
            <span
              onClick={() => window.open(employee.resume, "_blank")}
              className="cursor-pointer hover:text-gray-800"
              title="View Resume"
            >
              <Eye className="w-4 h-4" />
            </span>
            <span
              onClick={() => {
                const link = document.createElement("a");
                link.href = employee.resume;
                link.download = `${employee.name}_Resume.pdf`;
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
        </div>

        {(!shareMode || sharedDataOptions?.personalInfo || sharedDataOptions?.contactInfo) && (
          <div className="mt-6">
            <Card className="border border-gray-200 bg-white shadow-sm w-full">
              <CardContent className="p-4">
                <div className="flex flex-col space-y-4">
                  {(!shareMode || sharedDataOptions?.contactInfo) && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center text-sm space-y-2 sm:space-y-0 sm:space-x-4">
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 mr-2 text-indigo-500" />
                        <span className="text-gray-600">{employee.email}</span>
                        <Button
                          variant="copyicon"
                          size="xs"
                          onClick={() => {
                            navigator.clipboard.writeText(employee.email);
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
                      <div className="flex items-center">
                        <Phone className="w-4 h-4 mr-2 text-indigo-500" />
                        <span className="text-gray-600">{employee.phone}</span>
                        <Button
                          variant="copyicon"
                          size="xs"
                          onClick={() => {
                            navigator.clipboard.writeText(employee.phone);
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
                      <div className="flex items-center">
                        {employee.linkedInId !== "N/A" ? (
                          <a
                            href={employee.linkedInId}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-500 hover:text-indigo-700"
                          >
                            <FaLinkedin className="w-6 h-6" />
                          </a>
                        ) : (
                          <FaLinkedin className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                  )}
                  {(!shareMode || sharedDataOptions?.personalInfo) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mt-4">
                      <div className="flex items-center">
                        <FileBadge className="w-4 h-4 mr-2 text-indigo-500" />
                        <span className="font-medium text-gray-700">Total Experience</span>
                        <span className="mx-2 text-gray-300">•</span>
                        <span className="text-gray-600">{employee.experience}</span>
                      </div>
                      <div className="flex items-center">
                        <Award className="w-4 h-4 mr-2 text-indigo-500" />
                        <span className="font-medium text-gray-700">Relevant Experience</span>
                        <span className="mx-2 text-gray-300">•</span>
                        <span className="text-gray-600">{employee.relvantExpyears} years and {employee.relvantExpmonths} months</span>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-indigo-500" />
                        <span className="font-medium text-gray-700">Current Location</span>
                        <span className="mx-2 text-gray-300">•</span>
                        <span className="text-gray-600">{employee.location}</span>
                      </div>
                      <div className="flex items-center">
                        <MapPinPlus className="w-4 h-4 mr-2 text-indigo-500" />
                        <span className="font-medium text-gray-700">Preferred Location</span>
                        <span className="mx-2 text-gray-300">•</span>
                        <span className="text-gray-600">{employee.preferedLocation}</span>
                      </div>
                      <div className="flex items-center">
                        <Banknote className="w-4 h-4 mr-2 text-indigo-500" />
                        <span className="font-medium text-gray-700">Current Salary</span>
                        <span className="mx-2 text-gray-300">•</span>
                        <span className="text-gray-600">{formatINR(employee.currentSalary)} LPA</span>
                      </div>
                      <div className="flex items-center">
                        <Banknote className="w-4 h-4 mr-2 text-indigo-500" />
                        <span className="font-medium text-gray-700">Expected Salary</span>
                        <span className="mx-2 text-gray-300">•</span>
                        <span className="text-gray-600">{formatINR(employee.expectedSalary)} LPA</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-indigo-500" />
                        <span className="font-medium text-gray-700">Notice Period</span>
                        <span className="mx-2 text-gray-300">•</span>
                        <span className="text-gray-600">{employee.noticePeriod} days</span>
                      </div>
                      <div className="flex items-center">
                        <Briefcase className="w-4 h-4 mr-2 text-indigo-500" />
                        <span className="font-medium text-gray-700">Has Offers</span>
                        <span className="mx-2 text-gray-300">•</span>
                        <span className="text-gray-600">{employee.hasOffers}</span>
                      </div>
                      {employee.hasOffers === "Yes" && (
                        <div className="flex items-center col-span-1 sm:col-span-2">
                          <FileText className="w-4 h-4 mr-2 text-indigo-500" />
                          <span className="font-medium text-gray-700">Offer Details</span>
                          <span className="mx-2 text-gray-300">•</span>
                          <span className="text-gray-600">{employee.offerDetails}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            {(!shareMode || sharedDataOptions?.personalInfo) && renderSkills()}
          </div>
        )}
      </CardHeader>
    </Card>
  );
};