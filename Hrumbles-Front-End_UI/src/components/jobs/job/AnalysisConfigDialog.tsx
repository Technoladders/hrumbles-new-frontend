import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AnalysisConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  currentConfig?: any;
  onSave: () => void;
}

const DEFAULT_WEIGHTS = {
  "Technical Skills": 45,
  "Work Experience": 30,
  "Projects": 15,
  "Education": 10,
};

export const AnalysisConfigDialog = ({ open, onOpenChange, jobId, currentConfig, onSave }: AnalysisConfigDialogProps) => {
  const [weights, setWeights] = useState<Record<string, number>>(DEFAULT_WEIGHTS);
  const [sections, setSections] = useState({
    "Soft Skills": false,
    "Achievements": false
  });

  useEffect(() => {
    if (currentConfig) {
      if (currentConfig.weights) setWeights(currentConfig.weights);
      if (currentConfig.sections) setSections(currentConfig.sections);
    }
  }, [currentConfig]);

  const totalScore = Object.values(weights).reduce((a, b) => a + b, 0);

  const handleWeightChange = (key: string, value: number[]) => {
    setWeights(prev => ({ ...prev, [key]: value[0] }));
  };

  const handleSave = async () => {
    if (totalScore !== 100) {
      toast.error(`Total weight must equal 100%. Current: ${totalScore}%`);
      return;
    }

    try {
      const { error } = await supabase
        .from('hr_jobs')
        .update({ 
          analysis_config: { weights, sections } 
        })
        .eq('id', jobId);

      if (error) throw error;
      
      toast.success("Analysis configuration saved successfully");
      onSave();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>AI Analysis Configuration</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-gray-500 uppercase">Scoring Weights ({totalScore}/100%)</h3>
            {Object.entries(weights).map(([key, value]) => (
              <div key={key} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Label>{key}</Label>
                  <span className={totalScore !== 100 ? "text-red-500 font-bold" : "text-green-600"}>{value}%</span>
                </div>
                <Slider
                  value={[value]}
                  max={100}
                  step={5}
                  onValueChange={(val) => handleWeightChange(key, val)}
                  className={totalScore > 100 ? "opacity-50" : ""}
                />
              </div>
            ))}
          </div>

          <div className="space-y-4 border-t pt-4">
            <h3 className="font-medium text-sm text-gray-500 uppercase">Optional Sections</h3>
            <div className="flex items-center justify-between">
              <Label htmlFor="soft-skills">Analyze Soft Skills</Label>
              <Switch 
                id="soft-skills" 
                checked={sections["Soft Skills"]}
                onCheckedChange={(c) => setSections(p => ({...p, "Soft Skills": c}))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="achievements">Analyze Achievements/Awards</Label>
              <Switch 
                id="achievements" 
                checked={sections["Achievements"]}
                onCheckedChange={(c) => setSections(p => ({...p, "Achievements": c}))}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={totalScore !== 100}>Save Configuration</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};