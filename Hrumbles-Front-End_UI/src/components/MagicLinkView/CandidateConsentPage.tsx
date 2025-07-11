import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

type ConsentStatus = 'loading' | 'valid' | 'invalid' | 'submitted' | 'error';

interface ConsentDetails {
  organizationName: string;
}

const CandidateConsentPage = () => {
  const { consentId } = useParams<{ consentId: string }>();
  const { toast } = useToast();
  const [status, setStatus] = useState<ConsentStatus>('loading');
  const [consentDetails, setConsentDetails] = useState<ConsentDetails | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchConsentDetails = async () => {
      if (!consentId) {
        setStatus('invalid');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('candidate_consents')
          .select('*, organization:hr_organizations(name)')
          .eq('consent_id', consentId)
          .eq('status', 'pending')
          .single();

        if (error || !data) {
          setStatus('invalid');
          console.error('Error fetching consent or consent not found:', error);
          return;
        }

        // Check for expiration server-side might be redundant if query handles it, but good for client-side check
        if (new Date(data.expires_at) < new Date()) {
             setStatus('invalid');
             return;
        }

        setConsentDetails({ organizationName: (data.organization as any).name });
        setStatus('valid');
      } catch (e) {
        setStatus('error');
        console.error(e);
      }
    };

    fetchConsentDetails();
  }, [consentId]);

  const handleDecision = async (decision: 'granted' | 'denied') => {
    setIsSubmitting(true);
    try {
        // Use an edge function for this for better security and to encapsulate logic
        const { error } = await supabase.functions.invoke('record-consent-decision', {
            body: { consentId, decision }
        });

        if (error) throw error;
      
        setStatus('submitted');
        toast({
            title: 'Thank You!',
            description: 'Your decision has been recorded.',
            variant: 'success',
        });

    } catch (error: any) {
        setStatus('error');
        toast({
            title: 'Submission Failed',
            description: error.message || 'Could not record your decision. Please try again.',
            variant: 'destructive',
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />;
      case 'invalid':
        return (
          <div className="text-center text-red-600">
            <XCircle className="h-12 w-12 mx-auto mb-4" />
            <CardTitle>Invalid or Expired Link</CardTitle>
            <p className="mt-2 text-gray-600">This consent link is either invalid or has expired. Please contact the recruiter for a new link.</p>
          </div>
        );
      case 'submitted':
        return (
          <div className="text-center text-green-600">
            <CheckCircle className="h-12 w-12 mx-auto mb-4" />
            <CardTitle>Thank You!</CardTitle>
            <p className="mt-2 text-gray-600">Your response has been successfully recorded. You can now close this window.</p>
          </div>
        );
      case 'error':
        return (
             <div className="text-center text-red-600">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
                <CardTitle>An Error Occurred</CardTitle>
                <p className="mt-2 text-gray-600">We were unable to process your request. Please try again later or contact support.</p>
             </div>
        );
      case 'valid':
        return (
          <>
            <CardHeader>
              <CardTitle className="text-center text-2xl">Consent for Background Verification</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-700 space-y-4">
              <p>
                <strong>{consentDetails?.organizationName}</strong> has requested your permission to conduct background verification checks as part of your job application process.
              </p>
              <p>This includes, but may not be limited to, verifying details related to:</p>
              <ul className="list-disc list-inside bg-gray-50 p-4 rounded-md">
                <li>UAN (Universal Account Number) for employment history</li>
                <li>PAN (Permanent Account Number) for identity verification</li>
                <li>PF (Provident Fund) and ESIC details</li>
              </ul>
              <p>By clicking "Grant Consent", you authorize {consentDetails?.organizationName} and its authorized partners to access this information for the sole purpose of employment verification.</p>
            </CardContent>
            <CardFooter className="flex justify-center gap-4">
              <Button onClick={() => handleDecision('granted')} disabled={isSubmitting} size="lg" className="bg-green-600 hover:bg-green-700">
                 {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Grant Consent
              </Button>
              <Button onClick={() => handleDecision('denied')} disabled={isSubmitting} size="lg" variant="destructive">
                Deny Consent
              </Button>
            </CardFooter>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-lg">
        {renderContent()}
      </Card>
    </div>
  );
};

export default CandidateConsentPage;