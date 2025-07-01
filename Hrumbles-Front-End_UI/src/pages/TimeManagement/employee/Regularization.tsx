import { useState, useEffect } from "react";
import { useSelector } from 'react-redux';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RegularizationForm } from "@/components/TimeManagement/regularization/RegularizationForm";
import { RegularizationTable } from "@/components/TimeManagement/regularization/RegularizationTable";
import { RegularizationDetails } from "@/components/TimeManagement/regularization/RegularizationDetails";
import { RegularizationRequest } from "@/types/time-tracker-types";
import { fetchRegularizationRequests } from "@/api/regularization";
import { toast } from "sonner";

const EmployeeRegularization = () => {
  const [activeTab, setActiveTab] = useState("request");
  const [regularizationRequests, setRegularizationRequests] = useState<RegularizationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<RegularizationRequest | null>(null);
  const [showRequestDetails, setShowRequestDetails] = useState(false);

  const user = useSelector((state: any) => state.auth.user);
  const employeeId = user?.id;

  useEffect(() => {
    if (employeeId) {
      console.log('EmployeeRegularization useEffect: Loading requests', { employeeId });
      loadEmployeeRequests(employeeId);
    }
  }, [employeeId]);

  const loadEmployeeRequests = async (employeeId: string) => {
    setLoading(true);
    try {
      const data = await fetchRegularizationRequests(employeeId);
      setRegularizationRequests(data);
    } catch (error) {
      console.error("Error loading regularization requests:", error);
      toast.error("Failed to load regularization requests");
    } finally {
      setLoading(false);
    }
  };

  const handleRegularizationSuccess = () => {
    setActiveTab("history");
    if (employeeId) {
      loadEmployeeRequests(employeeId);
    }
  };

  const handleViewDetails = (request: RegularizationRequest) => {
    setSelectedRequest(request);
    setShowRequestDetails(true);
  };

  return (
    <div className="content-area">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Timesheet Regularization
        </h1>
        <p className="text-muted-foreground">
          Request corrections for missed clock-ins or clock-outs
        </p>
      </div>

      <Tabs defaultValue="request" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="request">New Request</TabsTrigger>
          <TabsTrigger value="history">Request History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="request">
          <div className="max-w-2xl">
            {employeeId ? (
              <RegularizationForm 
                employeeId={employeeId} 
                onSuccess={handleRegularizationSuccess}
              />
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    Please log in to submit a regularization request
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Regularization Request History</CardTitle>
              <CardDescription>
                View the status of your regularization requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RegularizationTable
                requests={regularizationRequests}
                onViewDetails={handleViewDetails}
                loading={loading}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <RegularizationDetails
        request={selectedRequest}
        open={showRequestDetails}
        onOpenChange={setShowRequestDetails}
      />
    </div>
  );
};

export default EmployeeRegularization;