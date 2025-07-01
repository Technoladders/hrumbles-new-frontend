// hooks/usePanVerification.ts
import { useState, useCallback } from "react";
import axios from "axios";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Candidate } from "@/components/MagicLinkView/types"; // Assuming this path is correct

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4001';

interface PanVerificationResponse {
  msg: {
    LastUpdate: string;
    Name: string;
    NameOnTheCard: string;
    PanHolderStatusType: string;
    PanNumber: string;
    STATUS: string;
    StatusDescription: string;
    panHolderStatusType: string;
    source_id: number;
  } | string;
  status: number;
  error?: string;
}

const encryptPanForVerification = async (transId: string, docType: string, docNumber: string): Promise<string> => {
  try {
    const response = await axios.post<any>(
      `${API_BASE_URL}/api/encrypt-pan-verification`,
      { transId, docType, docNumber },
      { headers: { 'Content-Type': 'application/json' } }
    );
    if (response.data.error) throw new Error(response.data.error);
    if (!response.data.requestData) throw new Error('Missing requestData in PAN encryption response');
    return response.data.requestData;
  } catch (error: any) {
    console.error('PAN Verification Encryption error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error || error.message || 'Failed to encrypt PAN data');
  }
};

const getPanVerificationData = async (requestData: string): Promise<string> => {
  try {
    const response = await axios.post<any>(
      `${API_BASE_URL}/api/get-pan-verification-data`,
      { requestData },
      { headers: { 'Content-Type': 'application/json' } }
    );
    if (response.data.error) throw new Error(response.data.error);
    if (!response.data.responseData) throw new Error('Missing responseData in PAN verification data response');
    return response.data.responseData;
  } catch (error: any) {
    console.error('PAN Verification Data retrieval error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error || error.message || 'Failed to get PAN verification data');
  }
};

const decryptPanVerification = async (responseData: string): Promise<PanVerificationResponse> => {
  try {
    const response = await axios.post<any>(
      `${API_BASE_URL}/api/decrypt-pan-verification`,
      { responseData },
      { headers: { 'Content-Type': 'application/json' } }
    );
    console.log("🔓 Decrypted PAN Response:", response.data);
    if (response.data.error) {
      console.error('API Error in decryptPanVerification:', response.data.error);
      throw new Error(response.data.error);
    }
    if (response.data.status === undefined || response.data.msg === undefined) {
      const errorMsg = typeof response.data.msg === 'string'
        ? response.data.msg
        : 'Incomplete data or unexpected status in PAN decryption response.';
      console.error('Validation Error in decryptPanVerification:', errorMsg);
      throw new Error(errorMsg);
    }
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || error.message || 'Failed to decrypt PAN verification data';
    console.error('PAN Decryption Error:', {
      message: errorMessage,
      responseData: error.response?.data,
      originalError: error.message,
    });
    throw new Error(errorMessage);
  }
};

export const usePanVerification = () => {
  const { toast } = useToast();
  const [panData, setPanData] = useState<PanVerificationResponse | null>(null);
  const [isPanLoading, setIsPanLoading] = useState(false);
  const [panError, setPanError] = useState<string | null>(null);
  const [isPanVerified, setIsPanVerified] = useState<boolean>(false);

  const verifyPan = useCallback(async (panNumber: string, candidate: Candidate | null, organizationId: string | null) => {
    if (!candidate?.id || !organizationId || !panNumber) {
      toast({ title: 'Error', description: 'Missing candidate ID, organization ID, or PAN number for verification.', variant: 'destructive' });
      return;
    }
    setIsPanLoading(true);
    setPanError(null);
    setPanData(null);
    setIsPanVerified(false);

    try {
      const transId = `${candidate.id}-PAN-${Date.now()}`;
      const requestData = await encryptPanForVerification(transId, 'PAN', panNumber);
      const responseData = await getPanVerificationData(requestData);
      const decryptedResponse = await decryptPanVerification(responseData);

      if (decryptedResponse.status === 1 && typeof decryptedResponse.msg !== 'string') {
        setPanData(decryptedResponse);
        setIsPanVerified(true);
        const { error: saveError } = await supabase
          .from('document_verifications') // Assuming a table to store document verifications
          .insert({
            candidate_id: candidate.id,
            organization_id: organizationId,
            document_type: 'pan',
            document_value: panNumber,
            status: 'verified',
            verification_data: decryptedResponse,
            trans_id: transId, // Store the transaction ID
          });
        if (saveError) {
          console.error('Error saving PAN verification to DB:', saveError);
          toast({ title: 'Error', description: 'Failed to save PAN verification.', variant: 'destructive' });
        } else {
          toast({ title: 'Success', description: 'PAN successfully verified and saved.', variant: 'success' });
        }
      } else {
        const errorMessage = typeof decryptedResponse.msg === 'string'
          ? decryptedResponse.msg
          : decryptedResponse.error || 'PAN verification failed.';
        setPanError(errorMessage);
        toast({ title: 'Verification Failed', description: `PAN: ${errorMessage}`, variant: 'destructive' });
      }
    } catch (error: any) {
      console.error('PAN Verification Error:', error);
      setPanError(error.message || 'Failed to verify PAN.');
      toast({ title: 'Error', description: `Failed to verify PAN: ${error.message}`, variant: 'destructive' });
    } finally {
      setIsPanLoading(false);
    }
  }, [toast]);

  return { panData, isPanLoading, panError, isPanVerified, verifyPan, setPanData, setIsPanVerified };
};