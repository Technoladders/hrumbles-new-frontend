// components/ProfileCompletionWidget.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  X,
  TrendingUp,
} from "lucide-react";
import { calculateProfileCompletion } from "@/utils/profileCompletion";

interface ProfileCompletionWidgetProps {
  employeeId: string;
  variant?: "default" | "compact" | "banner";
  showDismiss?: boolean;
}

const ProfileCompletionWidget: React.FC<ProfileCompletionWidgetProps> = ({
  employeeId,
  variant = "default",
  showDismiss = false,
}) => {
  const navigate = useNavigate();
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [incompleteSections, setIncompleteSections] = useState<string[]>([]);
  const [isDismissed, setIsDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompletion();

    // Check if widget was dismissed
    const dismissed = localStorage.getItem(
      `profileWidgetDismissed_${employeeId}`
    );
    if (dismissed === "true") {
      setIsDismissed(true);
    }
  }, [employeeId]);

  const loadCompletion = async () => {
    try {
      const data = await calculateProfileCompletion(employeeId);
      setCompletionPercentage(data.completionPercentage);
      setIncompleteSections(data.incompleteSections);
    } catch (error) {
      console.error("Error loading profile completion:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(`profileWidgetDismissed_${employeeId}`, "true");
  };

  const handleComplete = () => {
    navigate("/employee/profile/edit");
  };

  // Don't show if profile is complete or dismissed
  if (
    loading ||
    completionPercentage >= 80 ||
    (isDismissed && showDismiss)
  ) {
    return null;
  }

  // Compact variant for sidebar
  if (variant === "compact") {
    return (
      <Card className="border-l-4 border-yellow-500">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-700">Profile Status</p>
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
              {completionPercentage}%
            </Badge>
          </div>
          <Progress value={completionPercentage} className="h-2 mb-2" />
          <Button
            onClick={handleComplete}
            size="sm"
            variant="outline"
            className="w-full text-xs"
          >
            Complete Profile
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Banner variant for top of page
  if (variant === "banner") {
    return (
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-500 p-4 rounded-lg shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-gray-900">
                  Complete Your Profile
                </p>
                <Badge className="bg-yellow-500 text-white">
                  {completionPercentage}% Complete
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                {completionPercentage < 80
                  ? `Just ${80 - completionPercentage}% more to unlock all features!`
                  : "You're all set!"}
              </p>
              <div className="w-full max-w-md">
                <Progress value={completionPercentage} className="h-2" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleComplete}
              size="sm"
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Complete Now
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
            {showDismiss && (
              <Button
                onClick={handleDismiss}
                size="sm"
                variant="ghost"
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default variant - full card
  return (
    <Card className="border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            Complete Your Profile
          </CardTitle>
          {showDismiss && (
            <Button
              onClick={handleDismiss}
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Progress
              </span>
              <span className="text-2xl font-bold text-gray-900">
                {completionPercentage}%
              </span>
            </div>
            <Progress value={completionPercentage} className="h-3" />
            <p className="text-xs text-gray-500 mt-1">
              {80 - completionPercentage > 0
                ? `${80 - completionPercentage}% more to unlock all features`
                : "Profile complete!"}
            </p>
          </div>

          {incompleteSections.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Incomplete Sections:
              </p>
              <div className="flex flex-wrap gap-2">
                {incompleteSections.slice(0, 3).map((section, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="bg-white text-gray-700"
                  >
                    {section}
                  </Badge>
                ))}
                {incompleteSections.length > 3 && (
                  <Badge variant="outline" className="bg-white text-gray-700">
                    +{incompleteSections.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          <Button
            onClick={handleComplete}
            className="w-full bg-yellow-600 hover:bg-yellow-700"
          >
            Complete Profile
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>

          <p className="text-xs text-center text-gray-500">
            Complete at least 80% to access all features
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileCompletionWidget;
