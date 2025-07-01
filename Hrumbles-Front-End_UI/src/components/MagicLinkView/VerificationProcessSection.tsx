import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Candidate, DocumentState } from "@/components/MagicLinkView/types";
import { supabase } from "@/integrations/supabase/client";

// Define the structure of the API response data for clarity
interface FullHistoryEmploymentEntry {
  DateOfExitEpf: string;
  Doj: string;
  EstablishmentName: string;
  MemberId: string;
  fatherOrHusbandName: string;
  name: string;
  uan: string;
  Overlapping?: string;
}

interface TruthScreenFullHistoryResponse {
  msg: FullHistoryEmploymentEntry[] | string;
  status: number;
  transId: string;
  tsTransId: string;
  error?: string;
}

// Props interface remains the same
interface VerificationProcessSectionProps {
  candidate: Candidate | null;
  organizationId: string | null;
  isUanLoading: boolean;
  uanData: any | null;
  lookupMethod: 'mobile' | 'pan';
  setLookupMethod: (value: 'mobile' | 'pan') => void;
  lookupValue: string;
  setLookupValue: (value: string) => void;
  onUanLookup: () => void;
  documents: {
    uan: DocumentState;
    pan: DocumentState;
    pf: DocumentState;
    esic: DocumentState;
  };
  shareMode: boolean;
  onDocumentChange: (type: keyof typeof documents, value: string) => void;
  onToggleEditing: (type: keyof typeof documents) => void;
  onToggleUANResults: () => void;
  onVerifyDocument: (type: keyof typeof documents, candidateId: string, workHistory: any, candidate: any, organizationId: string) => Promise<void>;
  onSaveDocuments: () => Promise<void>;
  isSavingDocuments: boolean;
  isUanQueued: boolean;
}

export const VerificationProcessSection: React.FC<VerificationProcessSectionProps> = ({
  candidate,
  organizationId,
  isUanLoading,
  uanData,
  lookupMethod,
  setLookupMethod,
  lookupValue,
  setLookupValue,
  onUanLookup,
  documents,
  shareMode,
  onDocumentChange,
  onToggleEditing,
  onVerifyDocument,
  isUanQueued,
}) => {
  const { toast } = useToast();
  const [activeUanTab, setActiveUanTab] = useState<string>('basic');
  const [fullHistoryData, setFullHistoryData] = useState<TruthScreenFullHistoryResponse | null>(null);
  const [isFullHistoryLoading, setIsFullHistoryLoading] = useState(false);
  const [fullHistoryError, setFullHistoryError] = useState<string | null>(null);
  const [showUanFetch, setShowUanFetch] = useState<boolean>(false);

  const candidateUanFromMetadata = candidate?.metadata?.uan;
  const hasUanInMetadata = !!candidateUanFromMetadata;
  const isUanBasicVerifiedAndDataAvailable = !!uanData && uanData.status === 1 && !!uanData.msg?.uan_details?.length;

  // This powerful useEffect handles both the initial data load AND listens for real-time updates.
  useEffect(() => {
    if (!candidate?.id) return;

    // 1. Fetch the latest completed UAN history record on component load.
    const fetchInitialData = async () => {
      const { data, error } = await supabase
        .from('uanlookups')
        .select('response_data')
        .eq('candidate_id', candidate.id)
        .eq('lookup_type', 'uan_full_history')
        .in('status', [0, 1]) // Only fetch final statuses (Success or No Record)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which is not an error
        console.error("Error fetching initial UAN history:", error);
      } else if (data) {
        setFullHistoryData(data.response_data);
      }
    };

    fetchInitialData();

    // 2. Subscribe to real-time updates for the uanlookups table for this specific candidate.
    const channel = supabase.channel(`uan-lookups:${candidate.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to both INSERT and UPDATE
          schema: 'public',
          table: 'uanlookups',
          filter: `candidate_id=eq.${candidate.id}`,
        },
        (payload) => {
          console.log('Real-time UAN history update received!', payload);
          const newRecord = payload.new as { response_data: TruthScreenFullHistoryResponse };
          if (newRecord?.response_data) {
            setFullHistoryData(newRecord.response_data);
            setIsFullHistoryLoading(false); // Stop the loading spinner
            toast({
              title: 'UAN Verification Updated',
              description: 'The employee history has been successfully retrieved.',
              variant: 'success'
            });
          }
        }
      )
      .subscribe();

    // 3. Cleanup: Unsubscribe from the channel when the component is unmounted.
    return () => {
      supabase.removeChannel(channel);
    };
  }, [candidate?.id, toast]);

  // This function now just starts the process. The result will arrive via the real-time listener.
  const initiateFullEmployeeHistoryCheck = useCallback(async () => {
    if (!candidate?.id || !organizationId || !candidateUanFromMetadata) {
      toast({ title: 'Error', description: 'Missing required data for full history check.', variant: 'destructive' });
      return;
    }
    
    setIsFullHistoryLoading(true);
    setFullHistoryError(null);

    try {
      const { data, error } = await supabase.functions.invoke('uan-full-history', {
        body: {
          transID: `${candidate.id}-${Date.now()}`,
          docType: '337',
          uan: candidateUanFromMetadata,
          candidateId: candidate.id,
          organizationId: organizationId,
        },
      });

      if (error) throw error;

      if (data.status === 'pending') {
        toast({ title: 'Verification In Progress', description: data.message, variant: 'default' });
      } else if (data.status === 'completed') {
        setFullHistoryData(data.data);
        toast({ title: 'Verification Complete', description: 'History retrieved instantly.', variant: 'success' });
        setIsFullHistoryLoading(false); // Stop loading as it was instant
      }

    } catch (error: any) {
      console.error('Full Employee History Initiation Error:', error);
      const errorMessage = error.message || 'An unknown error occurred.';
      setFullHistoryError(errorMessage);
      toast({ title: 'Error', description: `Failed to start verification: ${errorMessage}`, variant: 'destructive' });
      setIsFullHistoryLoading(false);
    }
  }, [candidate, organizationId, candidateUanFromMetadata, toast]);

  const renderVerificationStatus = (doc: DocumentState) => {
    // This function remains the same as before
    if (shareMode) return null;
    if (doc.isVerifying) return (
      <div className="flex items-center text-yellow-600"><Loader2 className="mr-1 h-4 w-4 animate-spin" /><span className="text-xs">Verifying...</span></div>
    );
    if (doc.isVerified) return (
      <div className="flex items-center text-green-600"><CheckCircle2 className="mr-1 h-4 w-4" /><span className="text-xs">Verified on {doc.verificationDate}</span></div>
    );
    if (doc.error) return (
      <div className="flex items-center text-red-600"><XCircle className="mr-1 h-4 w-4" /><span className="text-xs">{doc.error}</span></div>
    );
    return null;
  };

  const renderDocumentRow = (type: keyof typeof documents, label: string) => {
    const doc = documents[type];
    const isUan = type === 'uan';
    const displayValue = isUan && !doc.value && hasUanInMetadata ? candidateUanFromMetadata : doc.value;
    // Determine if the UAN has a final, verified result.
    const isUanVerified = fullHistoryData?.status === 1;

    return (
      <div className="border rounded-lg mb-4 bg-white shadow-sm hover:shadow-md transition-shadow w-full">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="flex-1">
              <div className="flex items-center">
                <p className="text-sm font-medium">{label}</p>
                {(isUan ? isUanVerified : doc.isVerified) && !shareMode && (
                  <Badge className="ml-2 bg-green-100 text-green-800 hover:bg-green-100">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
                  </Badge>
                )}
              </div>
              {doc.isEditing && !shareMode ? (
                <Input value={doc.value} onChange={(e) => onDocumentChange(type, e.target.value)} className="mt-1 h-8 text-sm w-full sm:w-1/2" />
              ) : (
                <p className="text-xs text-muted-foreground">{displayValue || "Not Provided"}</p>
              )}
              {renderVerificationStatus(doc)}
            </div>
            {!shareMode && (
              <div className="flex space-x-2">
                <Button onClick={() => onToggleEditing(type)} variant="outline" size="sm" disabled={doc.isVerifying || (isUan ? isUanVerified : doc.isVerified)} className={cn(doc.isEditing && "bg-indigo-100 text-indigo-800 hover:bg-indigo-200")}>
                  {doc.isEditing ? "Cancel" : "Edit"}
                </Button>
                {isUan ? (
                  <Button onClick={() => { if (hasUanInMetadata) { initiateFullEmployeeHistoryCheck() } else { setShowUanFetch(true) } }} variant="secondary" size="sm" disabled={isFullHistoryLoading || isUanLoading}>
                    {isFullHistoryLoading ? (<Loader2 className="h-3 w-3 animate-spin mr-1" />) : isUanVerified ? (<>Verified <CheckCircle2 className="ml-1 h-3 w-3" /></>) : hasUanInMetadata ? (<>Verify UAN 🔍</>) : (<>Fetch UAN 🔍</>)}
                  </Button>
                ) : (
                  <Button onClick={() => onVerifyDocument(type, candidate?.id || '', null, candidate, organizationId || '')} variant="secondary" size="sm" disabled={doc.isVerifying} className={cn(doc.isVerified && "bg-green-100 text-green-800 hover:bg-green-200")}>
                    {doc.isVerifying ? (<Loader2 className="h-3 w-3 animate-spin mr-1" />) : doc.isVerified ? (<>Verified <CheckCircle2 className="ml-1 h-3 w-3" /></>) : (<>Verify 🔍</>)}
                  </Button>
                )}
              </div>
            )}
          </div>
          {isUan && showUanFetch && !hasUanInMetadata && !shareMode && (
            <div className="mt-4">
              <div className="flex flex-col sm:flex-row gap-2 items-end">
                <div className="w-full sm:w-1/4">
                  <label className="text-xs font-medium text-gray-600">Method</label>
                  <Select value={lookupMethod} onValueChange={(val: 'mobile' | 'pan') => setLookupMethod(val)}>
                    <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mobile">Mobile</SelectItem>
                      <SelectItem value="pan">PAN</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-grow">
                  <label className="text-xs font-medium text-gray-600">{lookupMethod === 'mobile' ? 'Mobile Number' : 'PAN Number'}</label>
                  <Input type="text" placeholder={`Enter ${lookupMethod === 'mobile' ? 'Mobile Number' : 'PAN Number'}`} value={lookupValue} onChange={(e) => setLookupValue(e.target.value)} disabled={isUanLoading} />
                </div>
                <Button onClick={onUanLookup} disabled={isUanLoading || !lookupValue}>
    {isUanLoading ? (
      <>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        {isUanQueued ? 'Auto-verifying...' : 'Fetching UAN...'}
      </>
    ) : 'Get UAN'}
  </Button>
              </div>
             {isUanLoading && <p className="text-sm text-gray-500 mt-4">Fetching UAN...</p>}
              {uanData && uanData.status === 9 && (
                <div className="mt-4 text-red-600 text-sm">
                  {lookupMethod === 'mobile' ? (
                    <>Mobile no. {lookupValue} has no UAN record. Try another number or method.</>
                  ) : (
                    <>PAN no. {lookupValue} has no UAN record. Try another number or method.</>
                  )}
                </div>
              )}
              {uanData && uanData.status !== 1 && uanData.status !== 9 && (
                <div className="mt-4 text-red-600 text-sm">
                  Error: {uanData.msg || uanData.error || 'UAN lookup failed.'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!candidate) {
    return <div className="text-sm text-gray-500">Loading candidate data...</div>;
  }

  return (
    <Card className="bg-white w-full p-4">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="text-lg font-semibold">Verification Process</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-6">
          <h3 className="text-md font-medium mb-3">Verification Documents</h3>
          {renderDocumentRow("uan", "UAN Number")}
          {(isUanBasicVerifiedAndDataAvailable || hasUanInMetadata) && (
            <Card className="border border-gray-200 bg-white shadow-sm p-4">
              <Tabs value={activeUanTab} onValueChange={setActiveUanTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  {isUanBasicVerifiedAndDataAvailable && <TabsTrigger value="basic">Basic Employee Info</TabsTrigger>}
                  <TabsTrigger value="full-history">Full Employee History</TabsTrigger>
                </TabsList>
                {isUanBasicVerifiedAndDataAvailable && (
                  <TabsContent value="basic">
                    <div>
                      <h4 className="font-semibold text-lg mb-2">Basic Information</h4>
                    </div>
                    {uanData?.msg?.uan_details?.[0] ? (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-1 gap-2 text-sm text-green-600">
                          <p><strong>Name:</strong> {uanData.msg.uan_details[0].name}</p>
                          <p><strong>Gender:</strong> {uanData.msg.uan_details[0].gender}</p>
                          <p><strong>Date of Birth:</strong> {uanData.msg.uan_details[0].date_of_birth}</p>
                        </div>
                        <div className="mt-4">
                          <h4 className="font-semibold text-lg mb-2">Current Employment Information</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-1 gap-2 text-sm text-green-600">
                          <p><strong>Company:</strong> {uanData.msg.employment_details[0].establishment_name}</p>
                          <p><strong>Date of Joining:</strong> {uanData.msg.employment_details[0].date_of_joining}</p>
                          <p><strong>Establishment ID:</strong> {uanData.msg.employment_details[0].establishment_id}</p>
                          <p><strong>Member ID:</strong> {uanData.msg.employment_details[0].member_id}</p>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-purple-300">
                        No basic UAN details available from previous lookup.
                      </p>
                    )}
                  </TabsContent>
                )}
                <TabsContent value="full-history">
                  {/* <div className="flex justify-end mb-4">
                    <Button onClick={initiateFullEmployeeHistoryCheck} disabled={isFullHistoryLoading} size="sm">
                      {isFullHistoryLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Verifying...</> : 'Verify Full History'}
                    </Button>
                  </div> */}
                  {isFullHistoryLoading && <p className="text-sm text-gray-600">Verification in progress. The results will appear here automatically when ready.</p>}
                  {fullHistoryError && <p className="text-sm text-red-600">Error: {fullHistoryError}</p>}
                  
                  {fullHistoryData && Array.isArray(fullHistoryData.msg) && fullHistoryData.msg.length > 0 ? (
                    <div className="space-y-4">
                      <h4 className="font-semibold text-md mb-2">Employment Details</h4>
                      {fullHistoryData.msg.map((entry: FullHistoryEmploymentEntry, index: number) => (
  <div key={index} className="pb-2 border-b last:border-b-0 text-green-700">
    <p className="text-sm font-medium">
      {entry['Establishment Name'] || 'Not Available'}
    </p>
    <p className="text-xs text-green-600">Join Date: {entry.Doj}</p>
    <p className="text-xs text-green-600">
      Exit Date: {entry.DateOfExitEpf || 'Currently Employed'}
    </p>
    <p className="text-xs text-green-600">Member ID: {entry.MemberId}</p>
    <p className="text-xs text-green-600">UAN: {entry.uan}</p>
    {entry.Overlapping && (
      <p className="text-xs text-green-600 font-semibold">
        Overlapping: {entry.Overlapping}
      </p>
    )}
  </div>
))}
                    </div>
                  ) : fullHistoryData && typeof fullHistoryData.msg === 'string' ? (
                    <p className="text-sm text-gray-600">{fullHistoryData.msg}</p>
                  ) : !isFullHistoryLoading && !fullHistoryData ? (
                    <p className="text-sm text-gray-600">Click "Verify Full History" to retrieve detailed employment records.</p>
                  ) : null}
                </TabsContent>
              </Tabs>
            </Card>
          )}
          {renderDocumentRow("pan", "PAN Number")}
          {renderDocumentRow("pf", "PF Number")}
          {renderDocumentRow("esic", "ESIC Number")}
        </div>
      </CardContent>
    </Card>
  );
};