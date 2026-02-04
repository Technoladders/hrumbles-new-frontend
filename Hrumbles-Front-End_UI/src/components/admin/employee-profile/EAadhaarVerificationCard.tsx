import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Fingerprint, ShieldCheck, AlertCircle, CheckCircle2, XCircle, User, Calendar, MapPin, Search, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

// --- TYPES ---
interface EmployeeProps {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender?: string;
  address?: {
    zip_code?: string;
    state?: string;
  };
}

interface EAadhaarRecord {
  id: string;
  transaction_id: string;
  verification_status: string;
  api_response_code: string;
  verified_name: string;
  verified_dob: string;
  verified_gender: string;
  verified_uid_last_4: string;
  verified_photo_base64?: string;
  verified_pincode: string;
  verified_state: string;
  verified_vtc: string; 
  created_at: string;
}

interface Props {
  employee: EmployeeProps;
  organizationId: string;
  latestVerification: EAadhaarRecord | null;
  onRefresh: () => void;
}

const normalize = (str: string) => str?.toLowerCase().trim().replace(/\s+/g, ' ') || "";

const EAadhaarVerificationCard: React.FC<Props> = ({ 
  employee, 
  organizationId, 
  latestVerification, 
  onRefresh 
}) => {
  const [loadingFetch, setLoadingFetch] = useState(false);
  const [loadingInit, setLoadingInit] = useState(false);
  const [txnId, setTxnId] = useState(""); 

  // 1. INITIATE FLOW
  const handleInitSession = async () => {
    setLoadingInit(true);
    try {
        // Use current page as redirect (Gridlines appends params here, but we'll use manual fetch for simplicity)
        const redirectUri = window.location.href; 

        const { data, error } = await supabase.functions.invoke('init-digilocker-session', {
            body: {
                employeeId: employee.id,
                organizationId,
                redirectUri,
                userId: (await supabase.auth.getUser()).data.user?.id
            }
        });

        if (error) throw error;
        if (data.status === 'error') throw new Error(data.message);

        // Auto-fill the Transaction ID
        setTxnId(data.transaction_id);
        
        // Open DigiLocker in new tab
        window.open(data.authorization_url, '_blank');

        toast.success("Redirecting to DigiLocker...", {
            description: "Please complete authentication in the new tab, then click 'Fetch Data' here."
        });

    } catch (err: any) {
        console.error(err);
        toast.error(err.message || "Failed to initialize session");
    } finally {
        setLoadingInit(false);
    }
  };

  // 2. FETCH FLOW
  const handleFetch = async () => {
    if (!txnId) {
      toast.error("Transaction ID missing.", { description: "Please click 'Connect DigiLocker' first." });
      return;
    }
    
    setLoadingFetch(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-eaadhaar', {
        body: {
          employeeId: employee.id,
          organizationId,
          transactionId: txnId,
          userId: (await supabase.auth.getUser()).data.user?.id
        }
      });

      if (error) throw error;
      if (data.status === 'error') throw new Error(data.message);

      toast.success("E-Aadhaar fetched successfully!");
      onRefresh();
      setTxnId(""); 
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Fetch failed.");
    } finally {
      setLoadingFetch(false);
    }
  };

  const renderRow = (label: string, sysVal: string, verVal: string, icon: React.ReactNode) => {
    const isMatch = normalize(sysVal) === normalize(verVal);
    const isPartial = !isMatch && (normalize(verVal).includes(normalize(sysVal)) || normalize(sysVal).includes(normalize(verVal)));
    
    let status = <XCircle className="h-4 w-4 text-red-500" />;
    let bg = "bg-red-50/50";
    
    if (isMatch) {
        status = <CheckCircle2 className="h-4 w-4 text-green-500" />;
        bg = "bg-green-50/50";
    } else if (isPartial) {
        status = <AlertCircle className="h-4 w-4 text-yellow-500" />;
        bg = "bg-yellow-50/50";
    }

    if(!verVal) {
       status = <AlertCircle className="h-4 w-4 text-gray-300" />;
       bg = "";
    }

    return (
      <TableRow className={bg}>
        <TableCell className="flex items-center gap-2 text-gray-600 font-medium">
            {icon} {label}
        </TableCell>
        <TableCell>{sysVal || '-'}</TableCell>
        <TableCell className="font-semibold text-gray-800">{verVal || '-'}</TableCell>
        <TableCell>{status}</TableCell>
      </TableRow>
    );
  };

  const isSuccess = latestVerification?.verification_status === 'success';

  return (
    <Card className="border-l-4 border-l-purple-600 shadow-sm mt-6">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-white pb-4 border-b">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg text-purple-700">
              <Fingerprint className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-lg">DigiLocker E-Aadhaar Verification</CardTitle>
              <CardDescription>Fetch verified Aadhaar data via DigiLocker session</CardDescription>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-1">
             {latestVerification ? (
                <Badge variant={isSuccess ? "default" : "destructive"} className={isSuccess ? "bg-green-600" : ""}>
                    {isSuccess ? "Verified" : latestVerification.verification_status}
                </Badge>
             ) : (
                <Badge variant="outline" className="bg-gray-100 text-gray-500">Not Linked</Badge>
             )}
             {latestVerification && (
                <span className="text-[10px] text-gray-400">
                    {format(new Date(latestVerification.created_at), "dd MMM yyyy")}
                </span>
             )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        
        {/* STEP 1: INITIALIZE */}
        {!isSuccess && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-blue-800">
                    <strong>Step 1:</strong> Initiate session to authenticate with DigiLocker.
                </div>
                <Button 
                    onClick={handleInitSession} 
                    disabled={loadingInit || loadingFetch}
                    variant="outline"
                    className="border-blue-600 text-blue-700 hover:bg-blue-100 whitespace-nowrap"
                >
                    {loadingInit ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ExternalLink className="h-4 w-4 mr-2" />}
                    Connect DigiLocker
                </Button>
            </div>
        )}

        {/* STEP 2: FETCH (Only visible if we have a Txn ID or manually entering one) */}
        <div className="flex flex-col sm:flex-row gap-3 items-end sm:items-center bg-gray-50 p-4 rounded-lg border mb-6">
           <div className="flex-1 w-full">
              <label className="text-xs font-semibold text-gray-500 mb-1 block">
                Transaction ID {txnId && <span className="text-green-600">(Auto-filled)</span>}
              </label>
              <Input 
                 placeholder="ID appears here after connection..." 
                 value={txnId} 
                 onChange={(e) => setTxnId(e.target.value)} 
                 className="bg-white font-mono"
                 disabled={loadingInit} 
              />
           </div>
           <Button 
             onClick={handleFetch} 
             disabled={loadingFetch || !txnId} 
             className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto"
           >
             {loadingFetch ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
             Fetch Data
           </Button>
        </div>

        {/* RESULTS AREA */}
        {isSuccess && latestVerification && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
                
                {/* 1. PHOTO CARD */}
                <div className="col-span-1 flex flex-col items-center justify-center p-4 border rounded-lg bg-gray-50/50">
                    <div className="relative h-40 w-40 rounded-full border-4 border-white shadow-md overflow-hidden mb-3">
                        {latestVerification.verified_photo_base64 ? (
                            <img 
                                src={`data:image/jpeg;base64,${latestVerification.verified_photo_base64}`} 
                                alt="Aadhaar Photo" 
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="h-full w-full bg-gray-200 flex items-center justify-center text-gray-400">
                                <User className="h-12 w-12" />
                            </div>
                        )}
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Photo Verified
                    </Badge>
                    <p className="text-xs text-gray-400 mt-2 font-mono">
                        UID: XXXX-XXXX-{latestVerification.verified_uid_last_4}
                    </p>
                </div>

                {/* 2. COMPARISON TABLE */}
                <div className="col-span-1 lg:col-span-2 border rounded-lg overflow-hidden">
                    <div className="bg-gray-100 px-4 py-2 text-xs font-bold text-gray-600 uppercase">
                        Demographic Comparison
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Field</TableHead>
                                <TableHead>HRMS Data</TableHead>
                                <TableHead>DigiLocker Data</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {renderRow(
                                "Name", 
                                `${employee.first_name} ${employee.last_name}`, 
                                latestVerification.verified_name,
                                <User className="h-3 w-3" />
                            )}
                            {renderRow(
                                "DOB", 
                                employee.date_of_birth ? format(new Date(employee.date_of_birth), 'dd-MM-yyyy') : '', 
                                latestVerification.verified_dob, 
                                <Calendar className="h-3 w-3" />
                            )}
                            {renderRow(
                                "Gender", 
                                employee.gender || '', 
                                latestVerification.verified_gender,
                                <User className="h-3 w-3" />
                            )}
                            {renderRow(
                                "Pincode", 
                                employee.address?.zip_code || '', 
                                latestVerification.verified_pincode,
                                <MapPin className="h-3 w-3" />
                            )}
                            {renderRow(
                                "State", 
                                employee.address?.state || '', 
                                latestVerification.verified_state,
                                <MapPin className="h-3 w-3" />
                            )}
                        </TableBody>
                    </Table>
                    <div className="p-2 bg-gray-50 text-xs text-gray-500 border-t">
                        <strong>Official Address:</strong> {latestVerification.verified_vtc}, {latestVerification.verified_state} - {latestVerification.verified_pincode}
                    </div>
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EAadhaarVerificationCard;