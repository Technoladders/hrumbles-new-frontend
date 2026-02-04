import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Landmark, ShieldCheck, AlertCircle, CheckCircle2, XCircle, CreditCard, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

// Types based on your DB schema
interface BankDetails {
  id: string;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  bank_name: string;
  branch_name: string;
  city: string;
}

interface VerificationRecord {
  id: string;
  verification_status: string;
  api_response_code: string;
  verified_name: string;
  verified_bank_name: string;
  verified_branch: string;
  verified_city: string;
  verified_utr: string;
  created_at: string;
}

interface Props {
  employeeId: string;
  organizationId: string;
  bankDetails: BankDetails | null;
  latestVerification: VerificationRecord | null;
  onRefresh: () => void; // Function to refetch parent data
}

const normalize = (str: string) => str?.toLowerCase().replace(/[^a-z0-9]/g, "") || "";

const BankVerificationCard: React.FC<Props> = ({ 
  employeeId, 
  organizationId, 
  bankDetails, 
  latestVerification, 
  onRefresh 
}) => {
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!bankDetails) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-bank-account-', {
        body: {
          employeeId,
          organizationId,
          userId: (await supabase.auth.getUser()).data.user?.id
        }
      });

      if (error) throw error;
      if (data.status === 'error') throw new Error(data.message);

      toast.success(data.message || "Penny drop verification successful");
      onRefresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  // Helper to render comparison rows
  const renderComparisonRow = (label: string, systemValue: string, verifiedValue: string, isSensitive = false) => {
    const isMatch = normalize(systemValue) === normalize(verifiedValue);
    // Allow partial match for names/banks (e.g. HDFC vs HDFC Bank)
    const isPartial = !isMatch && (normalize(verifiedValue).includes(normalize(systemValue)) || normalize(systemValue).includes(normalize(verifiedValue)));
    
    let statusIcon = <XCircle className="h-4 w-4 text-red-500" />;
    let rowClass = "bg-red-50/50";

    if (isMatch) {
      statusIcon = <CheckCircle2 className="h-4 w-4 text-green-500" />;
      rowClass = "bg-green-50/50";
    } else if (isPartial) {
      statusIcon = <AlertCircle className="h-4 w-4 text-yellow-500" />;
      rowClass = "bg-yellow-50/50";
    }

    if (!verifiedValue) {
        statusIcon = <AlertCircle className="h-4 w-4 text-gray-400" />;
        rowClass = "";
    }

    return (
      <TableRow className={rowClass}>
        <TableCell className="font-medium text-gray-600">{label}</TableCell>
        <TableCell className="font-semibold text-gray-800">
           {isSensitive ? `xxxx${systemValue.slice(-4)}` : systemValue}
        </TableCell>
        <TableCell className="text-gray-800">
           {verifiedValue || <span className="text-gray-400 italic">N/A</span>}
        </TableCell>
        <TableCell>{statusIcon}</TableCell>
      </TableRow>
    );
  };

  if (!bankDetails) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center text-gray-500">
          <Landmark className="h-10 w-10 mb-2 opacity-50" />
          <p>No bank details found for this employee.</p>
        </CardContent>
      </Card>
    );
  }

  const isVerified = latestVerification?.verification_status === 'success';
  const isInvalid = latestVerification?.verification_status === 'invalid';

  return (
    <Card className="border-l-4 border-l-blue-500 shadow-sm mt-6">
      <CardHeader className="bg-gradient-to-r from-gray-50 to-white pb-4 border-b">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-700">
              <Landmark className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-lg">Bank Account Verification</CardTitle>
              <CardDescription>Penny drop verification via IMPS</CardDescription>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            {latestVerification ? (
              <Badge variant={isVerified ? "default" : "destructive"} className={isVerified ? "bg-green-600" : ""}>
                {isVerified ? "Account Active" : "Verification Failed"}
              </Badge>
            ) : (
               <Badge variant="outline" className="bg-gray-100">Unverified</Badge>
            )}
            
            {latestVerification && (
                <span className="text-xs text-gray-400">
                    Last check: {format(new Date(latestVerification.created_at), 'dd MMM yyyy, HH:mm')}
                </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {/* Verification Trigger Area */}
        <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg border">
            <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-gray-500" />
                <div>
                    <p className="text-sm font-bold text-gray-800">{bankDetails.bank_name}</p>
                    <p className="text-xs text-gray-500 font-mono">
                        {bankDetails.account_number.replace(/.(?=.{4})/g, 'x')} • {bankDetails.ifsc_code}
                    </p>
                </div>
            </div>
            
            <Button 
                onClick={handleVerify} 
                disabled={loading} 
                size="sm"
                className={isVerified ? "bg-gray-800 text-white" : "bg-blue-600 hover:bg-blue-700"}
            >
                {loading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying...</>
                ) : (
                    <>{latestVerification ? <RefreshCw className="h-4 w-4 mr-2"/> : <ShieldCheck className="h-4 w-4 mr-2"/>} {latestVerification ? 'Re-Verify' : 'Verify Now'}</>
                )}
            </Button>
        </div>

        {/* Results Section */}
        {latestVerification && (
            <div className="space-y-4">
                
                {/* Status Message */}
                {isInvalid && (
                    <div className="p-3 bg-red-100 text-red-800 rounded-md flex items-center gap-2 text-sm border border-red-200">
                        <AlertCircle className="h-4 w-4" />
                        <strong>Failed:</strong> Response Code {latestVerification.api_response_code} - Invalid Account or IFSC.
                    </div>
                )}

                {isVerified && (
                    <div className="rounded-md border overflow-hidden">
                        <div className="bg-gray-50 px-4 py-2 border-b text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Comparison Results
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[25%]">Field</TableHead>
                                    <TableHead className="w-[35%]">System Data</TableHead>
                                    <TableHead className="w-[35%]">Verified Bank Data</TableHead>
                                    <TableHead className="w-[5%]">Match</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {renderComparisonRow(
                                    "Account Name", 
                                    bankDetails.account_holder_name, 
                                    latestVerification.verified_name
                                )}
                                {renderComparisonRow(
                                    "Bank Name", 
                                    bankDetails.bank_name, 
                                    latestVerification.verified_bank_name
                                )}
                                {renderComparisonRow(
                                    "Branch", 
                                    bankDetails.branch_name, 
                                    latestVerification.verified_branch
                                )}
                                {renderComparisonRow(
                                    "City", 
                                    bankDetails.city, 
                                    latestVerification.verified_city
                                )}
                            </TableBody>
                        </Table>
                        
                        <div className="bg-gray-50 px-4 py-2 border-t text-xs text-gray-500 flex justify-between">
                             <span>UTR: {latestVerification.verified_utr}</span>
                             <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="h-3 w-3"/> Penny drop successful</span>
                        </div>
                    </div>
                )}
            </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BankVerificationCard;