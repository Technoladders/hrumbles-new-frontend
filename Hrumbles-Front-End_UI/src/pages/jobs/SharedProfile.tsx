import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import EmployeeProfileDrawer from "@/components/MagicLinkView/EmployeeProfileDrawer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, AlertTriangle, Info, Share2, FileText, Briefcase, Users } from "lucide-react";
import { DataSharingOptions } from "@/components/MagicLinkView/EmployeeDataSelection";

const SharedProfile = () => {
  const { shareId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [sharedDataOptions, setSharedDataOptions] = useState<DataSharingOptions | null>(null);
  const [candidate, setCandidate] = useState<any | null>(null); // Use 'any' temporarily if TypeScript complains

  useEffect(() => {
    const validateShare = async () => {
      setIsLoading(true);

      try {
        const expiryParam = searchParams.get("expires");
        const optionsParam = searchParams.get("options");
        const candidateParam = searchParams.get("candidate");

        console.log("Share ID:", shareId);
        console.log("Expiry Param:", expiryParam);
        console.log("Options Param:", optionsParam);
        console.log("Candidate Param:", candidateParam);

        if (!shareId || !expiryParam) {
          console.log("Missing shareId or expiryParam");
          setIsValid(false);
          setIsLoading(false);
          return;
        }

        const expiryTimestamp = parseInt(expiryParam, 10);
        if (isNaN(expiryTimestamp)) {
          console.log("Invalid expiry timestamp");
          setIsValid(false);
          setIsLoading(false);
          return;
        }

        const now = Date.now();
        if (now > expiryTimestamp) {
          console.log("Link expired");
          setIsExpired(true);
          setIsValid(false);
          setIsLoading(false);
          return;
        }

        if (optionsParam) {
          try {
            const parsedOptions = JSON.parse(decodeURIComponent(optionsParam));
            console.log("Parsed Options:", parsedOptions);
            setSharedDataOptions(parsedOptions);
          } catch (error) {
            console.error("Error parsing data options:", error);
          }
        }

        if (candidateParam) {
          try {
            const parsedCandidate = JSON.parse(decodeURIComponent(candidateParam));
            console.log("Parsed Candidate:", parsedCandidate);
            setCandidate(parsedCandidate);
          } catch (error) {
            console.error("Error parsing candidate data:", error);
          }
        }

        const shareIdRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-\d+$/;
        if (shareIdRegex.test(shareId)) {
          console.log("Valid shareId format");
          setIsValid(true);
        } else {
          console.log("Invalid shareId format:", shareId);
          setIsValid(false);
        }
      } catch (error) {
        console.error("Error validating share:", error);
        setIsValid(false);
      } finally {
        setIsLoading(false);
      }
    };

    validateShare();
  }, [shareId, searchParams]);

  // Render the list of shared data categories
  const renderSharedDataCategories = () => {
    if (!sharedDataOptions) return null;

    const categories = [];

    if (sharedDataOptions.personalInfo) categories.push("Personal Information");
    if (sharedDataOptions.contactInfo) categories.push("Contact Information");
    if (sharedDataOptions.documentsInfo) categories.push("Documents");
    if (sharedDataOptions.workInfo) categories.push("Work Details");
    if (sharedDataOptions.assignedInfo) categories.push("Team Assignment");
    if (sharedDataOptions.activityInfo) categories.push("Activity Log");

    return (
      <div className="flex flex-wrap gap-2 justify-center mt-3">
        {categories.map((category, index) => (
          <div key={index} className="flex items-center bg-green-50 text-green-700 px-2 py-1 rounded-md text-xs border border-green-200">
            {category === "Personal Information" && <Users className="w-3 h-3 mr-1" />}
            {category === "Contact Information" && <Users className="w-3 h-3 mr-1" />}
            {category === "Documents" && <FileText className="w-3 h-3 mr-1" />}
            {category === "Work Details" && <Briefcase className="w-3 h-3 mr-1" />}
            {category === "Team Assignment" && <Users className="w-3 h-3 mr-1" />}
            {category === "Activity Log" && <Share2 className="w-3 h-3 mr-1" />}
            {category}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {isLoading ? (
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Loading shared profile...</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className="animate-pulse h-6 w-32 bg-gray-200 rounded-md"></div>
          </CardContent>
        </Card>
      ) : !isValid ? (
        <Card className="w-full max-w-md border-red-200 bg-red-50">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 bg-red-100 p-3 rounded-full w-16 h-16 flex items-center justify-center">
              <AlertTriangle size={32} className="text-red-500" />
            </div>
            <CardTitle className="text-red-700">
              {isExpired ? "Link Expired" : "Invalid Share Link"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-red-600 mb-6">
              {isExpired
                ? "This link has expired. Employee profile links are valid for 2 days only."
                : "This employee profile share link is invalid or has been revoked."}
            </p>
            <Button onClick={() => navigate("/")} variant="outline" className="w-full">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="w-full max-w-md border-green-200 bg-green-50">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 bg-green-100 p-3 rounded-full w-16 h-16 flex items-center justify-center">
                <Shield size={32} className="text-green-500" />
              </div>
              <CardTitle className="text-green-700">Secure Employee Profile</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-green-600 mb-2">
                You're viewing a securely shared employee profile.
              </p>

              {renderSharedDataCategories()}

              <div className="flex items-center justify-center mt-4 mb-6 text-sm bg-white p-2 rounded-md border border-green-200">
                <Info size={16} className="text-green-500 mr-2" />
                <span>This link will expire in {getExpiryTimeRemaining(searchParams.get("expires"))}</span>
              </div>
              <Button
                onClick={() => setIsDrawerOpen(true)}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                View Employee Profile
              </Button>
            </CardContent>
          </Card>

          <EmployeeProfileDrawer
            open={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            shareMode={true}
            shareId={shareId}
            sharedDataOptions={sharedDataOptions || undefined}
            candidate={candidate}
          />
        </>
      )}
    </div>
  );
};

// Helper function to calculate remaining time
const getExpiryTimeRemaining = (expiryTimestamp: string | null): string => {
  if (!expiryTimestamp) return "unknown time";

  const expiry = parseInt(expiryTimestamp, 10);
  const now = Date.now();
  const remainingMs = expiry - now;

  if (remainingMs <= 0) return "0 hours";

  const hours = Math.floor(remainingMs / (1000 * 60 * 60));

  if (hours < 24) {
    return `${hours} hour${hours !== 1 ? "s" : ""}`;
  } else {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days} day${days !== 1 ? "s" : ""} and ${remainingHours} hour${remainingHours !== 1 ? "s" : ""}`;
  }
};

export default SharedProfile;