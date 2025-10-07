import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

// --- START: Heavily Updated Parsing Logic ---
const parsePastedText = (text: string) => {
  const data: any = {};
  
  const junkKeywords = ["Save", "View phone number", "Call candidate", "WhatsApp", "Verified phone & email"];
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line && !junkKeywords.some(keyword => line.includes(keyword)) && !line.match(/^[\w\.-]+@[\w\.-]+$/));

  if (lines.length === 0) return {};

  // --- Total Experience ---
  const expLine = lines.find(l => l.match(/\d+y(\s\d+m)?/));
  if (expLine) {
    data.total_experience = expLine.match(/\d+y(\s\d+m)?/)?.[0];
  }

  // --- Salary Parser ---
  const salaryLine = lines.find(l => l.includes('₹'));
  if (salaryLine) {
    const expectedMatch = salaryLine.match(/\(expects:\s*(.*?)\)/i);
    if (expectedMatch) {
        data.expected_salary = expectedMatch[1].trim();
    }
    const currentSalaryMatch = salaryLine.match(/^(.*?)(?:\(expects:|$)/i);
    if (currentSalaryMatch) {
        const currentSalary = currentSalaryMatch[1].trim();
        if (currentSalary.includes('₹')) {
            data.current_salary = currentSalary;
        }
    }
  }

  // --- Current Location ---
  const salaryLineIndex = lines.findIndex(l => l.includes('₹'));
  if (salaryLineIndex !== -1 && lines[salaryLineIndex + 1]) {
    const potentialLocation = lines[salaryLineIndex + 1];
    if (!potentialLocation.toLowerCase().startsWith('current') && !potentialLocation.toLowerCase().startsWith('previous')) {
       data.current_location = potentialLocation;
    }
  }

  // --- START: Improved Role, Designation & Company Parser ---
  // Handles cases where "Current" is on a separate line from the role description.
  const roleHeaderIndex = lines.findIndex(l => l.toLowerCase().startsWith('current') || l.toLowerCase().startsWith('previous'));
  let roleLine = '';

  if (roleHeaderIndex !== -1) {
    // Check if the role info is on the same line or the next one
    if (lines[roleHeaderIndex].includes(' at ')) {
      roleLine = lines[roleHeaderIndex];
    } else if (lines[roleHeaderIndex + 1] && lines[roleHeaderIndex + 1].includes(' at ')) {
      roleLine = lines[roleHeaderIndex + 1];
    }
  }

  if (roleLine) {
    // Extract Designation (text before "at")
    const designationMatch = roleLine.match(/^(.*?)\s+at\s/i);
    if (designationMatch && designationMatch[1]) {
      data.current_designation = designationMatch[1].replace(/current|previous/i, '').trim();
    }

    // Extract Company (text between "at" and "since/till" or end of line)
    const companyMatch = roleLine.match(/at\s(.*?)(?:\s+since|\s+till|$)/i);
    if (companyMatch && companyMatch[1]) {
      data.current_company = companyMatch[1].trim();
    }
  }
  // --- END: Improved Role, Designation & Company Parser ---
  
  // --- Notice Period ---
  const noticePeriodLine = lines.find(l => 
    l.toLowerCase().includes('days') || 
    l.toLowerCase().includes('serving till') ||
    l.toLowerCase().includes('available to join')
  );
  if (noticePeriodLine) {
    data.notice_period = noticePeriodLine;
  }

  // --- Highest Degree ---
  const degreeHeaderIndex = lines.findIndex(l => l.toLowerCase() === 'highest degree');
  if (degreeHeaderIndex !== -1 && lines[degreeHeaderIndex + 1]) {
    data.highest_education = lines[degreeHeaderIndex + 1];
  }

  // --- Preferred Locations ---
  const prefHeaderIndex = lines.findIndex(l => l.toLowerCase().startsWith('pref. location'));
  if (prefHeaderIndex !== -1) {
    let locationsText = lines[prefHeaderIndex].replace(/pref\. locations?/i, '');
    for (let i = prefHeaderIndex + 1; i < lines.length; i++) {
        if (lines[i].match(/^[a-zA-Z\s,]+$/)) {
            locationsText += ` ${lines[i]}`;
        } else {
            break;
        }
    }
    data.preferred_locations = locationsText.split(',').map(s => s.trim()).filter(Boolean);
  }
  
  return data;
};
// --- END: Heavily Updated Parsing Logic ---


const EnrichDataDialog = ({ isOpen, onClose, candidate }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({});
  const [pastedText, setPastedText] = useState("");

  useEffect(() => {
    if (candidate) {
      setFormData({
        total_experience: candidate.total_experience || "",
        current_salary: candidate.current_salary || "",
        expected_salary: candidate.expected_salary || "",
        notice_period: candidate.notice_period || "",
        current_location: candidate.current_location || "",
        current_company: candidate.current_company || "",
        current_designation: candidate.current_designation || "", // Added designation
        highest_education: candidate.highest_education || "",
        preferred_locations: Array.isArray(candidate.preferred_locations) ? candidate.preferred_locations.join(", ") : "",
      });
    }
  }, [candidate, isOpen]);

  const { mutate: updateCandidate, isPending } = useMutation({
    mutationFn: async (updatedData) => {
      const { data, error } = await supabase
        .from("hr_talent_pool")
        .update(updatedData)
        .eq("id", candidate.id)
        .select();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      toast.success("Candidate data enriched successfully!");
      queryClient.invalidateQueries({ queryKey: ["talentPoolCandidate", candidate.id] });
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleManualSubmit = () => {
    const dataToUpdate = { ...formData };
    if (typeof dataToUpdate.preferred_locations === 'string') {
        dataToUpdate.preferred_locations = dataToUpdate.preferred_locations.split(',').map(s => s.trim()).filter(Boolean);
    }
    updateCandidate(dataToUpdate);
  };

  const handleParseAndFill = () => {
    const parsedData = parsePastedText(pastedText);
    const enrichedData = {
      ...formData, 
      ...parsedData,
      preferred_locations: Array.isArray(parsedData.preferred_locations) ? parsedData.preferred_locations.join(", ") : (formData.preferred_locations || ""),
    };
    setFormData(enrichedData);
    toast.info("Form has been pre-filled. Please review and save.");
  };

  const isFormEmpty = Object.values(formData).every(value => value === "");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl"> {/* Increased width for more fields */}
        <DialogHeader>
          <DialogTitle>Enrich Candidate Data</DialogTitle>
          <DialogDescription>
            Paste details to auto-fill the form, then review and save the updates for {candidate?.candidate_name}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <Label htmlFor="paste-area">1. Paste Candidate Details Here</Label>
          <Textarea
            id="paste-area"
            placeholder="Paste the unstructured text here..."
            rows={8}
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
          />
          <Button onClick={handleParseAndFill} disabled={!pastedText}>
            Parse and Fill Form Below
          </Button>
        </div>

        <div className="space-y-2 pt-4">
            <Label>2. Review and Save Changes</Label>
            {/* Using 3 columns on larger screens for better layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4 border-t mt-2">
              <div className="space-y-2">
                <Label htmlFor="current_designation">Current Designation</Label>
                <Input id="current_designation" name="current_designation" value={formData.current_designation || ''} onChange={handleFormChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="current_company">Current Company</Label>
                <Input id="current_company" name="current_company" value={formData.current_company || ''} onChange={handleFormChange} />
              </div>
               <div className="space-y-2">
                <Label htmlFor="total_experience">Total Experience</Label>
                <Input id="total_experience" name="total_experience" value={formData.total_experience || ''} onChange={handleFormChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="current_salary">Current Salary</Label>
                <Input id="current_salary" name="current_salary" value={formData.current_salary || ''} onChange={handleFormChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expected_salary">Expected Salary</Label>
                <Input id="expected_salary" name="expected_salary" value={formData.expected_salary || ''} onChange={handleFormChange} />
              </div>
               <div className="md:col-span-2 space-y-2">
                <Label htmlFor="notice_period">Notice Period</Label>
                <Input id="notice_period" name="notice_period" value={formData.notice_period || ''} onChange={handleFormChange} />
              </div>
              <div className="md:col-span-1 space-y-2">
                <Label htmlFor="current_location">Current Location</Label>
                <Input id="current_location" name="current_location" value={formData.current_location || ''} onChange={handleFormChange} />
              </div>
              <div className="md:col-span-3 space-y-2">
                <Label htmlFor="highest_education">Highest Education</Label>
                <Input id="highest_education" name="highest_education" value={formData.highest_education || ''} onChange={handleFormChange} />
              </div>
              <div className="md:col-span-3 space-y-2">
                <Label htmlFor="preferred_locations">Preferred Locations (comma-separated)</Label>
                <Input id="preferred_locations" name="preferred_locations" value={formData.preferred_locations || ''} onChange={handleFormChange} />
              </div>
            </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleManualSubmit} disabled={isPending || isFormEmpty}>
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EnrichDataDialog;