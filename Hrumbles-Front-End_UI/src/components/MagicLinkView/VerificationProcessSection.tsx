import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, History, FileDown } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Candidate, DocumentState } from "@/components/MagicLinkView/types";
import { supabase } from "@/integrations/supabase/client";

import { generateUanHistoryPdf } from '@/lib/uanPdfGenerator';

// Define the structure of the API response data for clarity
interface FullHistoryEmploymentEntry {
  'Establishment Name': string; // Note the key name has spaces
  Doj: string;
  DateOfExitEpf: string;
  MemberId: string;
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
   userId: string | null; 
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
  onVerifyDocument: (type: keyof typeof documents, candidateId: string, workHistory: any, candidate: any, organizationId: string) => Promise<void>;
  onSaveDocuments: () => Promise<void>;
  isSavingDocuments: boolean;
  isUanQueued: boolean;
}

export const VerificationProcessSection: React.FC<VerificationProcessSectionProps> = ({
  candidate,
  organizationId,
   userId, 
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
  const [fullHistoryData, setFullHistoryData] = useState<TruthScreenFullHistoryResponse | null>(null);
  const [isFullHistoryLoading, setIsFullHistoryLoading] = useState(false);
  const [isFullHistoryQueued, setIsFullHistoryQueued] = useState(false); // NEW: State to track queued full history jobs
  const [fullHistoryError, setFullHistoryError] = useState<string | null>(null);
  const [showUanFetch, setShowUanFetch] = useState<boolean>(false);

  const candidateUanFromMetadata = candidate?.metadata?.uan;
  const hasUanInMetadata = !!candidateUanFromMetadata;
  const isUanBasicVerifiedAndDataAvailable = !!uanData && uanData.status === 1 && !!uanData.msg?.uan_details?.length;
  
  // Derived state to know if the final verification is complete
  const isFullHistoryVerified = fullHistoryData?.status === 1 && Array.isArray(fullHistoryData.msg);

  console.log("uanData", fullHistoryData)

  // This powerful useEffect handles initial data, queue checks, AND real-time updates.
  useEffect(() => {
    if (!candidate?.id) return;

    // A combined loading state for the full history section
    const isProcessing = isFullHistoryLoading || isFullHistoryQueued;

    // 1. Check if a full history job is already in the queue on component load.
    const checkQueue = async () => {
      // Don't check the queue if we already have the final data.
      if (isFullHistoryVerified) return;

      const { data: queueData, error: queueError } = await supabase
        .from('uan_polling_queue') // Using your new table name
        .select('id')
        .eq('candidate_id', candidate.id)
        .eq('status', 'pending')
        .limit(1)
        .single();

      if (queueError && queueError.code !== 'PGRST116') {
        console.error("Error checking UAN full history queue:", queueError);
      } else if (queueData) {
        setIsFullHistoryQueued(true); // A job is pending!
        setIsFullHistoryLoading(true); // Show a loading state
      }
    };
    
    // 2. Fetch the latest completed UAN history record.
    const fetchInitialData = async () => {
      const { data, error } = await supabase
        .from('uanlookups')
        .select('response_data')
        .eq('candidate_id', candidate.id)
        .eq('lookup_type', 'uan_full_history')
        .in('status', [0, 1]) // Final statuses
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching initial UAN history:", error);
      } else if (data) {
        setFullHistoryData(data.response_data);
      }
    };

    const runInit = async () => {
        await checkQueue();
        if (!isProcessing) { // Only fetch initial data if not already processing
            await fetchInitialData();
        }
    };

    runInit();

    // 3. Subscribe to real-time updates for the uanlookups table for this candidate.
    const channel = supabase.channel(`uan-lookups:${candidate.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'uanlookups', filter: `candidate_id=eq.${candidate.id}` },
        (payload) => {
          const newRecord = payload.new as { response_data: any, lookup_type: string };
          // We only care about full history updates here
          if (newRecord?.lookup_type === 'uan_full_history' && newRecord?.response_data) {
            console.log('Real-time UAN full history update received!', payload);
            setFullHistoryData(newRecord.response_data);
            setIsFullHistoryLoading(false); // Stop loading spinner
            setIsFullHistoryQueued(false);   // Job is no longer queued
            toast({
              title: 'UAN Verification Updated',
              description: 'The employee history has been successfully retrieved.',
              variant: 'success'
            });
          }
        }
      ).subscribe();

    // 4. Cleanup
    return () => { supabase.removeChannel(channel); };
  }, [candidate?.id, toast, isFullHistoryVerified]); // Re-run if candidate changes or verification completes

  // This function now just starts the process. The result will arrive via the real-time listener.
  const initiateFullEmployeeHistoryCheck = useCallback(async () => {
    if (!candidate?.id || !organizationId || !userId || !candidateUanFromMetadata) {
      toast({ title: 'Error', description: 'User, UAN, or Organization is missing.', variant: 'destructive' });
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
          userId: userId,
        },
      });

      if (error) throw error;

      if (data.status === 'pending') {
        setIsFullHistoryQueued(true); // NEW: Set queue state
        toast({ title: 'Verification In Progress', description: data.message, variant: 'default' });
      } else if (data.status === 'completed') {
        setFullHistoryData(data.data);
        toast({ title: 'Verification Complete', description: 'History retrieved instantly.', variant: 'success' });
        setIsFullHistoryLoading(false);
      }

    } catch (error: any) {
      console.error('Full Employee History Initiation Error:', error);
      const errorMessage = error.message || 'An unknown error occurred.';
      setFullHistoryError(errorMessage);
      toast({ title: 'Error', description: `Failed to start verification: ${errorMessage}`, variant: 'destructive' });
      setIsFullHistoryLoading(false);
    }
  }, [candidate, organizationId, userId, candidateUanFromMetadata, toast]);

  const renderVerificationStatus = (doc: DocumentState) => {
    // This function remains the same
    if (shareMode) return null;
    if (doc.isVerifying) return <div className="flex items-center text-yellow-600"><Loader2 className="mr-1 h-4 w-4 animate-spin" /><span className="text-xs">Verifying...</span></div>;
    if (doc.isVerified) return <div className="flex items-center text-green-600"><CheckCircle2 className="mr-1 h-4 w-4" /><span className="text-xs">Verified on {doc.verificationDate}</span></div>;
    if (doc.error) return <div className="flex items-center text-red-600"><XCircle className="mr-1 h-4 w-4" /><span className="text-xs">{doc.error}</span></div>;
    return null;
  };

   // NEW: Handler function to safely call the PDF generator
  const handleDownloadPdf = () => {
    if (!candidate || !fullHistoryData || !Array.isArray(fullHistoryData.msg)) {
      toast({
        title: "Cannot Generate PDF",
        description: "The required verification data is not available.",
        variant: "destructive",
      });
      return;
    }
    generateUanHistoryPdf(candidate, fullHistoryData);
  };
  
  const renderDocumentRow = (type: keyof typeof documents, label: string) => {
    const doc = documents[type];
    const isUan = type === 'uan';
    const displayValue = isUan && !doc.value && hasUanInMetadata ? candidateUanFromMetadata : doc.value;
    
    // We now use the dedicated `isFullHistoryVerified` state for the badge
    const isVerified = isUan ? isFullHistoryVerified : doc.isVerified;

    return (
      <div className="border rounded-lg mb-4 bg-white shadow-sm hover:shadow-md transition-shadow w-full">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="flex-1">
              <div className="flex items-center">
                <p className="text-sm font-medium">{label}</p>
                {isVerified && !shareMode && (
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
                <Button onClick={() => onToggleEditing(type)} variant="outline" size="sm" disabled={doc.isVerifying || isVerified} className={cn(doc.isEditing && "bg-indigo-100 text-indigo-800 hover:bg-indigo-200")}>
                  {doc.isEditing ? "Cancel" : "Edit"}
                </Button>
                {isUan ? (
                  // This button is NOW ONLY for fetching the UAN itself.
                  <Button onClick={() => setShowUanFetch(true)} variant="secondary" size="sm" disabled={isUanLoading || hasUanInMetadata}>
                    {isUanLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <></>}
                    {hasUanInMetadata ? 'UAN Found' : 'Fetch UAN 🔍'}
                  </Button>
                ) : (
                  <Button onClick={() => onVerifyDocument(type, candidate?.id || '', null, candidate, organizationId || '')} variant="secondary" size="sm" disabled={doc.isVerifying || doc.isVerified}>
                    {doc.isVerifying ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : doc.isVerified ? 'Verified' : 'Verify 🔍'}
                  </Button>
                )}
              </div>
            )}
          </div>
          {isUan && showUanFetch && !hasUanInMetadata && !shareMode && (
            <div className="mt-4 border-t pt-4">
              <div className="flex flex-col sm:flex-row gap-2 items-end">
                <div className="w-full sm:w-1/4">
                  <label className="text-xs font-medium text-gray-600">Method</label>
                  <Select value={lookupMethod} onValueChange={(val: 'mobile' | 'pan') => setLookupMethod(val)}>
                    <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                    <SelectContent><SelectItem value="mobile">Mobile</SelectItem><SelectItem value="pan">PAN</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="flex-grow">
                  <label className="text-xs font-medium text-gray-600">{lookupMethod === 'mobile' ? 'Mobile Number' : 'PAN Number'}</label>
                  <Input type="text" placeholder={`Enter ${lookupMethod === 'mobile' ? 'Mobile Number' : 'PAN Number'}`} value={lookupValue} onChange={(e) => setLookupValue(e.target.value)} disabled={isUanLoading} />
                </div>
                <Button onClick={onUanLookup} disabled={isUanLoading || !lookupValue}>
                  {isUanLoading ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" /> {isUanQueued ? 'Auto-fetching...' : 'Fetching...'}</>) : 'Get UAN'}
                </Button>
              </div>
              {isUanQueued && <p className="text-sm text-gray-500 mt-2">Auto-fetching is enabled. The UAN will appear here automatically when found.</p>}
              {uanData && uanData.status === 9 && <div className="mt-4 text-red-600 text-sm">{lookupMethod === 'mobile' ? `Mobile no. ${lookupValue} has no UAN record.` : `PAN no. ${lookupValue} has no UAN record.`} Try another method.</div>}
              {uanData && uanData.status !== 1 && uanData.status !== 9 && <div className="mt-4 text-red-600 text-sm">Error: {uanData.msg || uanData.error || 'UAN lookup failed.'}</div>}
            </div>
          )}
        </div>
      </div>
    );
  };
  
  if (!candidate) return <div className="text-sm text-gray-500">Loading candidate data...</div>;

  const isFullHistoryProcessing = isFullHistoryLoading || isFullHistoryQueued;

  return (
    <Card className="bg-white w-full p-4">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="text-lg font-semibold">Verification Process</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-6">
          <h3 className="text-md font-medium mb-3">Verification Documents</h3>
          
          {renderDocumentRow("uan", "UAN Number")}

          {/* --- NEW LOGIC: UAN Details and Full History Section --- */}
          {/* This entire section only shows up after UAN is available */}
          {(hasUanInMetadata || isUanBasicVerifiedAndDataAvailable) && (
            <Card className="border border-gray-200 bg-white shadow-sm p-4 mt-[-1rem] mb-4">
              {/* 1. Show Basic Info if available from a mobile/PAN lookup */}
              {isUanBasicVerifiedAndDataAvailable && (
               <div className="mb-4">
  <h4 className="font-semibold text-md mb-2">Basic Employee Info (from UAN Lookup)</h4>
  <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-800 space-y-1">
    <p><strong>Name:</strong> {uanData.msg.uan_details[0].name}</p>
    <p><strong>Date of Birth:</strong> {uanData.msg.uan_details[0].date_of_birth}</p>
    <p><strong>Gender:</strong> {uanData.msg.uan_details[0].gender}</p>

    {/* Current Employment Section */}
    <div className="pt-3">
      <h5 className="font-semibold text-md mb-1">Current Employment</h5>
      <p><strong>Company:</strong> {uanData.msg.employment_details[0].establishment_name}</p>
      <p><strong>Date of Joining:</strong> {uanData.msg.employment_details[0].date_of_joining}</p>
      <p><strong>Establishment ID:</strong> {uanData.msg.employment_details[0].establishment_id}</p>
      <p><strong>Member ID:</strong> {uanData.msg.employment_details[0].member_id}</p>
    </div>
  </div>
</div>

              )}

              {/* 2. Full History Verification Area */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="font-semibold text-md">Full Employee History</h4>
                   {isFullHistoryVerified ? (
                      <Button onClick={handleDownloadPdf} size="sm" variant="outline">
                        <FileDown className="h-4 w-4 mr-2"/>
                        Download Report
                      </Button>
                    ) : (
                      <Button onClick={initiateFullEmployeeHistoryCheck} disabled={isFullHistoryProcessing} size="sm">
                        {isFullHistoryProcessing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Verifying...</> : <><History className="h-4 w-4 mr-2"/>Verify Full History</>}
                      </Button>
                    )}

                </div>

                {isFullHistoryProcessing && (
                  <div className="text-sm text-gray-600 text-center p-4 bg-gray-50 rounded-md">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Auto-verification in progress... Results will appear here automatically when ready.
                  </div>
                )}
                
                {fullHistoryError && <p className="text-sm text-red-600">Error: {fullHistoryError}</p>}
                
                {isFullHistoryVerified ? (
  <div className="space-y-4">
    {/* Show Name at the top */}
    <p className="text-sm font-semibold text-amber-600">
      {fullHistoryData.msg.length > 0
        ? fullHistoryData.msg[0].name || 'Name Not Available'
        : 'Name Not Available'}
    </p>

    {/* Employment Entries */}
    {fullHistoryData.msg.map((entry: FullHistoryEmploymentEntry, index: number) => (
      <div key={index} className="pb-2 border-b last:border-b-0 text-gray-800">
        {/* Establishment Name */}
        <p className="text-sm font-medium text-indigo-700">
          {entry['Establishment Name'] || 'Not Available'}
        </p>

        {/* Employment Details */}
        <div className="grid grid-cols-2 gap-x-4 text-xs text-muted-foreground mt-1">
          <p><strong>Join Date:</strong> {entry.Doj}</p>
          <p><strong>Exit Date:</strong> {entry.DateOfExitEpf || 'Current'}</p>
          <p><strong>Member ID:</strong> {entry.MemberId}</p>
          <p><strong>UAN:</strong> {entry.uan}</p>
        </div>

        {/* Overlapping Badge */}
        {entry.Overlapping && (
          <Badge variant="destructive" className="mt-1">
            Overlapping Employment
          </Badge>
        )}
      </div>
    ))}
  </div>
) : fullHistoryData && typeof fullHistoryData.msg === 'string' ? (
  <p className="text-sm text-gray-600">{fullHistoryData.msg}</p>
) : !isFullHistoryProcessing && !fullHistoryData ? (
  <p className="text-sm text-gray-600">Click "Verify Full History" to retrieve detailed employment records.</p>
) : null}
              </div>
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