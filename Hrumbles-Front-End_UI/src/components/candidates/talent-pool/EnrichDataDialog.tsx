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

// --- START: New and Improved Multi-Format Parsing Logic ---
const parsePastedText = (text: string) => {
  const data: any = {};
  
  const junkKeywords = ["Save", "LinkedIn", "Enriched", "View phone number", "Call candidate", "WhatsApp", "Verified phone & email"];
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line && !junkKeywords.some(keyword => line.includes(keyword)) && !line.match(/^[\w\.-]+@[\w\.-]+$/));

  if (lines.length === 0) return {};

  // A helper function to find a header and get the data from the same line OR the next line
  const extractDataAfterHeader = (headerRegex: RegExp) => {
    const headerIndex = lines.findIndex(l => headerRegex.test(l.toLowerCase()));
    if (headerIndex === -1) return null;

    // Check for data on the same line as the header
    const sameLineText = lines[headerIndex].replace(headerRegex, '').trim();
    if (sameLineText.length > 2) {
      return sameLineText;
    }
    
    // If not found, check the next line
    if (lines[headerIndex + 1]) {
      return lines[headerIndex + 1].trim();
    }
    
    return null;
  };

  // --- Universal: Total Experience ---
  const expLine = lines.find(l => l.match(/\d+y(\s\d+m)?/));
  if (expLine) {
    data.total_experience = expLine.match(/\d+y(\s\d+m)?/)?.[0];
  }

  // --- Universal: Salary (strong anchor) ---
  const salaryLine = lines.find(l => l.includes('₹'));
  if (salaryLine) {
    const expectedMatch = salaryLine.match(/\(expects:\s*(.*?)\)/i);
    if (expectedMatch) data.expected_salary = expectedMatch[1].trim();
    
    const currentSalaryMatch = salaryLine.match(/^(.*?)(?:\(expects:|$)/i);
    if (currentSalaryMatch) {
      const currentSalary = currentSalaryMatch[1].trim();
      if (currentSalary.includes('₹')) data.current_salary = currentSalary;
    }
  }

  // --- Improved: Location (often appears before salary) ---
  const salaryLineIndex = lines.findIndex(l => l.includes('₹'));
  if (salaryLineIndex > 0) {
    const potentialLocation = lines[salaryLineIndex - 1];
    // Check if the line above salary is not the experience line
    if (!potentialLocation.match(/\d+y(\s\d+m)?/)) {
      data.current_location = potentialLocation;
    }
  }

  // --- Improved: Notice Period (Handles "2 Months", "15 Days", etc.) ---
  const noticePeriodLine = lines.find(l => l.toLowerCase().match(/(days|month|serving|available to join)/i));
  if (noticePeriodLine) data.notice_period = noticePeriodLine;

  // --- Improved: Role, Designation & Company (Handles multi-line "Current") ---
  const roleHeaderIndex = lines.findIndex(l => l.toLowerCase().startsWith('current'));
  if (roleHeaderIndex !== -1) {
    let combinedRoleLine = lines[roleHeaderIndex].replace(/current/i, '').trim();
    // If "Current" was on its own line, the actual data is on the next line
    if (combinedRoleLine.length === 0 && lines[roleHeaderIndex + 1]) {
      combinedRoleLine = lines[roleHeaderIndex + 1].trim();
    }
    
    const sinceMatch = combinedRoleLine.match(/\s+since\s+\w{3}\s+'\d{2}/i);
    const roleAndCompany = sinceMatch ? combinedRoleLine.substring(0, sinceMatch.index).trim() : combinedRoleLine;
    
    if (roleAndCompany.includes(' at ')) {
      const parts = roleAndCompany.split(' at ');
      data.current_designation = parts[0].trim();
      data.current_company = parts.slice(1).join(' at ').trim();
    } else {
      data.current_designation = roleAndCompany; // Fallback
    }
  }

  // --- Using Helper for remaining fields ---
  data.highest_education = extractDataAfterHeader(/highest degree/i);
  data.industry = extractDataAfterHeader(/industry:/i);
  
  const locationsText = extractDataAfterHeader(/pref\. locations?/i);
  if (locationsText) {
      data.preferred_locations = locationsText.split(',').map(s => s.trim()).filter(Boolean);
  }

  // Clean up null values before returning
  Object.keys(data).forEach(key => {
    if (data[key] === null) delete data[key];
  });

  return data;
};
// --- END: New and Improved Multi-Format Parsing Logic ---


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
        current_designation: candidate.current_designation || "",
        highest_education: candidate.highest_education || "",
        industry: candidate.industry || "",
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
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 flex-shrink-0" >
          <DialogTitle>Enrich Candidate Data</DialogTitle>
          <DialogDescription>
            Paste details from any source to auto-fill the form, then review and save.
          </DialogDescription>
        </DialogHeader>

<div className="flex-grow overflow-y-auto px-6">
        <div className="space-y-4 pt-4">
          <Label htmlFor="paste-area">1. Paste Candidate Details Here</Label>
          <Textarea
            id="paste-area"
            placeholder="Paste unstructured text here..."
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
               <div className="space-y-2">
                <Label htmlFor="notice_period">Notice Period</Label>
                <Input id="notice_period" name="notice_period" value={formData.notice_period || ''} onChange={handleFormChange} />
              </div>
              <div className="md:col-span-3 space-y-2">
                <Label htmlFor="current_location">Current Location</Label>
                <Input id="current_location" name="current_location" value={formData.current_location || ''} onChange={handleFormChange} />
              </div>
              <div className="md:col-span-3 space-y-2">
                <Label htmlFor="highest_education">Highest Education</Label>
                <Input id="highest_education" name="highest_education" value={formData.highest_education || ''} onChange={handleFormChange} />
              </div>
              <div className="md:col-span-3 space-y-2">
                <Label htmlFor="industry">Industry (comma-separated)</Label>
                <Input id="industry" name="industry" value={formData.industry || ''} onChange={handleFormChange} />
              </div>
              <div className="md:col-span-3 space-y-2">
                <Label htmlFor="preferred_locations">Preferred Locations (comma-separated)</Label>
                <Input id="preferred_locations" name="preferred_locations" value={formData.preferred_locations || ''} onChange={handleFormChange} />
              </div>
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