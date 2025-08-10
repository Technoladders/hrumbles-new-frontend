import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSelector } from "react-redux";
import { JobFormData } from "./hooks/useAiJobFormState";

interface Props {
  onAnalysisComplete: (data: Partial<JobFormData>) => void;
  onBack: () => void;
}

export const JdAnalysisView = ({ onAnalysisComplete, onBack }: Props) => {
  const [jdText, setJdText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const user = useSelector((state: any) => state.auth.user);
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  const handleAnalyse = async () => {
    if (!jdText.trim()) return toast.error("Job description cannot be empty.");
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-job-description', {
        body: { jobDescriptionText: jdText, organization_id, user_id: user.id },
      });

      if (error) throw new Error(error.message);

      toast.success("Analysis Complete!", { description: "The form has been pre-filled for you." });
      onAnalysisComplete(data);
    } catch (err: any) {
      toast.error("Analysis Failed", { description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 py-4">
      <Textarea
        placeholder="Paste the entire job description here..."
        className="min-h-[300px] text-sm"
        value={jdText}
        onChange={(e) => setJdText(e.target.value)}
        disabled={isLoading}
      />
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={isLoading}>Back</Button>
        <Button onClick={handleAnalyse} disabled={isLoading || !jdText.trim()}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analyse & Continue"}
        </Button>
      </div>
    </div>
  );
};