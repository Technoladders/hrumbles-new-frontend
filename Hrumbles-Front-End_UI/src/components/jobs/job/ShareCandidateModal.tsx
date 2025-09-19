import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Candidate } from '@/lib/types';

// --- Service function to call the generic Edge Function ---
async function sendEmailToCandidate(email: string, subject: string, htmlBody: string) {
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  if (authError || !session) throw new Error('Authentication session not found.');
  
  const payload = { candidateEmail: email, subject, htmlBody };

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-candidate-notification-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }
}

// --- NEW: Centralized HTML Email Builder ---
const buildFullHtmlEmail = (subject: string, innerContent: string): string => {
  return `
    <!DOCTYPE html><html><head><meta charset="UTF-8"><title>${subject}</title></head>
    <body style="margin: 0; padding: 0; background-color: #f9f9f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 600px; margin: 20px auto; padding: 20px; background-color: #ffffff; border-radius: 8px;">
        <img src="https://app.hrumbles.ai/hrumbles-fav-blue-cropped.svg" alt="hrumbles.ai Logo" width="40" style="display: block; margin: 0 auto 25px auto;">
        
        <div style="padding: 10px; text-align: left; line-height: 1.6; color: #333;">
          ${innerContent}
        </div>

        <p style="text-align: center; color: #999; font-size: 12px; margin-top: 30px;">
          hrumbles.ai © ${new Date().getFullYear()}
        </p>
      </div>
    </body></html>`;
};


// --- REFACTORED: Dynamic Email Template Generation ---
const generateEmailTemplate = (type: 'shortlist' | 'rejection', jobTitle: string, ownerName: string) => {
  const signature = `<p style="margin-top: 30px; line-height: 1.6;">Best regards,<br><strong>${ownerName || 'The Talent Acquisition Team'}</strong></p>`;
  let subject = "";
  let bodyTemplate = ""; // Now using pure HTML with placeholders

  switch (type) {
    case 'shortlist':
      subject = `An Update on Your Application for ${jobTitle}`;
      bodyTemplate = `<p>Hello {{candidateName}},</p>
                      <p>Great news! We were impressed with your profile for the <strong>${jobTitle}</strong> position and have shortlisted you for the next steps in our hiring process.</p>
                      <p>A recruiter from our team will be in touch with you shortly to discuss your availability and share more details.</p>`;
      break;

    case 'rejection':
      subject = `Update on Your Application for ${jobTitle}`;
      bodyTemplate = `<p>Hello {{candidateName}},</p>
                      <p>Thank you for your interest in the <strong>${jobTitle}</strong> position. After careful consideration, we have decided not to move forward with your application at this time.</p>
                      <p>Based on the initial AI-powered review, our team noted the following: <em>"{{rejectionReason}}"</em></p>
                      <p>We wish you the best of luck in your job search and encourage you to apply for other roles with us in the future.</p>`;
      break;
  }
  
  // Convert HTML to simple text with newlines for Textarea editing
  const bodyForTextarea = bodyTemplate.replace(/<\/p>/g, "\n\n").replace(/<[^>]+>/g, "");
  
  return { subject, bodyTemplate, bodyForTextarea };
};

interface ShareCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    candidates: Candidate[];
    jobTitle: string;
    emailType: 'shortlist' | 'rejection';
    ownerName: string;
  } | null;
}

export const ShareCandidateModal = ({ isOpen, onClose, data }: ShareCandidateModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState(""); // This will hold the user-editable text


  console.log('ShareCandidateModal received data:', data);

  useEffect(() => {
    if (data) {
      const template = generateEmailTemplate(data.emailType, data.jobTitle, data.ownerName);
      setSubject(template.subject);
      
      let initialBody = template.bodyForTextarea;
      // Pre-fill for single candidate view
      if (data.candidates.length === 1) {
        const candidate = data.candidates[0];
        initialBody = initialBody
          .replace(/{{candidateName}}/g, candidate.name)
          .replace(/{{rejectionReason}}/g, candidate.rejection_reason || "The position was highly competitive.");
      }
      setBody(initialBody);
    }
  }, [data]);

  const handleSendBatchEmail = async () => {
    if (!data || data.candidates.length === 0) return;
    setIsLoading(true);
    const toastId = toast.loading(`Sending emails to ${data.candidates.length} candidate(s)...`);

    const sendPromises = data.candidates.map(candidate => {
      // Personalize the user-edited body text
      let personalizedBody = body
        .replace(/{{candidateName}}/g, candidate.name)
        .replace(/{{rejectionReason}}/g, candidate.rejection_reason || "The position was highly competitive.");
      
      // Convert the plain text back into HTML paragraphs for sending
      const innerContentHtml = `<p>${personalizedBody.replace(/\n/g, '</p><p>')}</p>`;
      const signature = `<p style="margin-top: 30px; line-height: 1.6;">Best regards,<br><strong>${data.ownerName || 'The Talent Acquisition Team'}</strong></p>`;

      const finalHtml = buildFullHtmlEmail(subject, `${innerContentHtml}${signature}`);
      
      return sendEmailToCandidate(candidate.email || '', subject, finalHtml);
    });

    const results = await Promise.allSettled(sendPromises);
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.length - successful;

    toast.dismiss(toastId);
    if (failed > 0) {
      toast.warning(`Completed: ${successful} emails sent, ${failed} failed.`);
    } else {
      toast.success(`Successfully sent emails to all ${successful} candidates!`);
    }

    setIsLoading(false);
    onClose();
  };

  if (!data) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[725px]">
        <DialogHeader>
          <DialogTitle>Send Email to {data.candidates.length > 1 ? `${data.candidates.length} Candidates` : data.candidates[0].name}</DialogTitle>
          <DialogDescription>
  Review the content below. Placeholders like {`'{{candidateName}}'`} will be personalized for each candidate.
</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="body">Body</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[280px]"
            />
           <p className="text-xs text-muted-foreground">
  Placeholders like {`'{{candidateName}}'`} and {`'{{rejectionReason}}'`} will be replaced for each candidate upon sending.
</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSendBatchEmail} disabled={isLoading}>
            {isLoading ? `Sending...` : `Send to ${data.candidates.length} Candidate(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};