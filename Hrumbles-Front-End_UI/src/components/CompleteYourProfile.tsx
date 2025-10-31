import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom"; // 1. IMPORT useLocation
import { useSelector } from "react-redux";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  User,
  Phone,
  MapPin,
  FileText,
  GraduationCap,
  Briefcase,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2, // Import Loader2 for a consistent loading spinner
} from "lucide-react";
import {
  calculateProfileCompletion,
  getProfileSectionDetails,
  ProfileSection,
} from "@/utils/profileCompletion";

const CompleteYourProfile = () => {
  const navigate = useNavigate();
  const location = useLocation(); // 2. INITIALIZE the hook

  const user = useSelector((state: any) => state.auth.user);
  const employeeId = user?.id;

  const [loading, setLoading] = useState(true);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [sections, setSections] = useState<ProfileSection[]>([]);
  const [canProceed, setCanProceed] = useState(false);


  useEffect(() => {
    if (!employeeId) {
      // No user found, redirect to login
      navigate("/login");
      return;
    }

    loadProfileData();
  }, [employeeId, location]);

  const loadProfileData = async () => {
    if (!employeeId) return;

    try {
      setLoading(true);

      // Get completion data
      const completionData = await calculateProfileCompletion(employeeId);
      setCompletionPercentage(completionData.completionPercentage);
      setCanProceed(completionData.completionPercentage >= 40); // Changed to 40%

      // Get section details
      const sectionDetails = await getProfileSectionDetails(employeeId);
      setSections(sectionDetails);
    } catch (error) {
      console.error("Error loading profile data:", error);
    } finally {
      setLoading(false);
    }
  };

const handleEditProfile = async () => {
  try {
    // Recalculate profile completion
    await calculateProfileCompletion(user.id);
    
    // Navigate to edit profile
    navigate(`/employee/${user.id}`);
  } catch (error) {
    console.error("Error updating profile completion:", error);
  }
};

  const handleContinue = () => {
    // Get the original path they were trying to access
    const from = location.state?.from || "/dashboard";
    navigate(from);
  };

  const getSectionIcon = (sectionName: string) => {
    switch (sectionName) {
      case "Basic Information":
        return <User className="w-5 h-5" />;
      case "Contact Information":
        return <Phone className="w-5 h-5" />;
      case "Address":
        return <MapPin className="w-5 h-5" />;
      case "Emergency Contacts":
        return <AlertCircle className="w-5 h-5" />;
      case "Documents":
        return <FileText className="w-5 h-5" />;
      case "Education":
        return <GraduationCap className="w-5 h-5" />;
      case "Experience":
        return <Briefcase className="w-5 h-5" />;
      case "Bank Details":
        return <CreditCard className="w-5 h-5" />;
      default:
        return <User className="w-5 h-5" />;
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 mb-4">
            <User className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Complete Your Profile
          </h1>
          <p className="text-gray-600 text-lg">
            Help us know you better by completing your profile
          </p>
        </div>

        {/* Progress Card */}
        <Card className="mb-6 border-2 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Overall Progress</p>
                <p className="text-3xl font-bold text-gray-900">
                  {completionPercentage}%
                </p>
              </div>
              <div className="text-right">
                {completionPercentage >= 80 ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="w-6 h-6" />
                    <span className="font-semibold">Profile Complete!</span>
                  </div>
                ) : completionPercentage >= 40 ? (
                  <div className="flex items-center gap-2 text-yellow-600">
                    <Clock className="w-6 h-6" />
                    <span className="font-semibold">Almost There!</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="w-6 h-6" />
                    <span className="font-semibold">Action Required</span>
                  </div>
                )}
              </div>
            </div>

            <div className="relative">
              <Progress
                value={completionPercentage}
                className="h-3 mb-2"
              />
              <div className={`absolute top-0 left-0 h-3 rounded-full transition-all duration-300 ${getProgressColor(completionPercentage)}`} 
                   style={{ width: `${completionPercentage}%` }} />
            </div>

            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>0%</span>
              <span className="text-red-600 font-medium">40% (Minimum)</span>
              <span className="text-green-600 font-medium">80% (Full Access)</span>
              <span>100%</span>
            </div>
          </CardContent>
        </Card>

        {/* Alert Messages */}
        {completionPercentage < 40 && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Profile Incomplete:</strong> You need at least 40% profile
              completion to access your dashboard. Please complete the sections
              below.
            </AlertDescription>
          </Alert>
        )}

        {completionPercentage >= 40 && completionPercentage < 80 && (
          <Alert className="mb-6 border-yellow-200 bg-yellow-50">
            <Clock className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>Partial Access:</strong> You can access your dashboard, but
              completing 80% of your profile will unlock all features and
              functionalities.
            </AlertDescription>
          </Alert>
        )}

        {completionPercentage >= 80 && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Excellent!</strong> Your profile is complete. You have full
              access to all features.
            </AlertDescription>
          </Alert>
        )}

        {/* Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {sections.map((section, index) => (
            <Card
              key={index}
              className={`transition-all hover:shadow-lg cursor-pointer border-2 ${
                section.isComplete
                  ? "border-green-200 bg-green-50"
                  : "border-gray-200 hover:border-purple-300"
              }`}
              onClick={handleEditProfile}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        section.isComplete
                          ? "bg-green-500 text-white"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {getSectionIcon(section.name)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {section.name}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {section.completedFields} of {section.totalFields} completed
                      </p>
                    </div>
                  </div>
                  {section.isComplete ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <Clock className="w-5 h-5 text-gray-400" />
                  )}
                </div>

                <div className="relative w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      section.isComplete ? "bg-green-500" : "bg-purple-500"
                    }`}
                    style={{
                      width: `${(section.completedFields / section.totalFields) * 100}%`,
                    }}
                  />
                </div>

                <div className="mt-3">
                  <p className="text-xs text-gray-600">
                    {section.isComplete
                      ? "✓ Section completed"
                      : `Complete: ${section.fields.join(", ")}`}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <Button
            onClick={handleEditProfile}
            size="lg"
            className="bg-purple-600 hover:bg-purple-700 text-white px-8"
          >
            <User className="w-5 h-5 mr-2" />
            Complete Profile
          </Button>

          {canProceed && (
            <Button
              onClick={handleContinue}
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white px-8"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Continue to Dashboard
            </Button>
          )}
        </div>

        {/* Info Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Need help? Contact your HR department for assistance.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CompleteYourProfile;