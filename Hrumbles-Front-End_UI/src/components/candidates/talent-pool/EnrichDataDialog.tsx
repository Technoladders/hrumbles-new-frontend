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

// --- START: Heavily Revised Multi-Format Parsing Logic ---
const parsePastedText = (text: string) => {
  const data: any = {};
  
  const junkKeywords = ["Save", "LinkedIn", "Enriched", "View phone number", "Call candidate", "WhatsApp", "Verified phone & email"];
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line && !junkKeywords.some(keyword => line.includes(keyword)) && !line.match(/^[\w\.-]+@[\w\.-]+$/));

  if (lines.length === 0) return {};

  // --- Universal: Total Experience ---
  const expLine = lines.find(l => l.match(/\d+y(\s\d+m)?/));
  if (expLine) {
    data.total_experience = expLine.match(/\d+y(\s\d+m)?/)?.[0];
  }

  // --- Universal: Current Location ---
  const expLineIndex = lines.findIndex(l => l.match(/\d+y(\s\d+m)?/));
  if (expLineIndex !== -1 && lines[expLineIndex + 1]) {
      const potentialLocation = lines[expLineIndex + 1];
      if (!potentialLocation.toLowerCase().startsWith('current') && !potentialLocation.toLowerCase().startsWith('previous')) {
        data.current_location = potentialLocation;
      }
  }

  // --- Naukri Format Specific: Salary, Notice Period, Pref. Locations ---
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
  const noticePeriodLine = lines.find(l => l.toLowerCase().includes('days') || l.toLowerCase().includes('serving till') || l.toLowerCase().includes('available to join'));
  if (noticePeriodLine) data.notice_period = noticePeriodLine;

  const prefHeaderIndex = lines.findIndex(l => l.toLowerCase().startsWith('pref. location'));
  if (prefHeaderIndex !== -1) {
    let locationsText = lines.slice(prefHeaderIndex).join(' ').replace(/pref\. locations?/i, '').trim();
    data.preferred_locations = locationsText.split(',').map(s => s.trim()).filter(Boolean);
  }

  // --- Multi-Format: Role, Designation & Company ---
  const roleHeaderIndex = lines.findIndex(l => l.toLowerCase().startsWith('current') || l.toLowerCase().startsWith('past'));
  if (roleHeaderIndex !== -1) {
      // Combine the header line and the next line to handle both single-line and multi-line formats
      const combinedRoleLine = lines.slice(roleHeaderIndex, roleHeaderIndex + 2).join(' ').replace(/current:|past:/i, '').trim();
      
      // Find where the date starts (e.g., "Feb 2021...") and slice it off
      const dateMatch = combinedRoleLine.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/);
      const roleAndCompany = dateMatch ? combinedRoleLine.substring(0, dateMatch.index).trim() : combinedRoleLine.trim();

      // Try splitting by " at " (for naukri)
      if (roleAndCompany.includes(' at ')) {
          const parts = roleAndCompany.split(' at ');
          data.current_designation = parts[0].trim();
          data.current_company = parts.slice(1).join(' at ').trim();
      } else { // Handle foundit format (e.g., "Software Engineer BestPeers...")
          const titleKeywords = ['Software Engineer Intern', 'Software Engineer', 'Consultant', 'Developer', 'Analyst', 'Intern', 'Manager', 'Lead', 'Architect'];
          let matchedTitle = '';
          for (const title of titleKeywords) {
              if (roleAndCompany.toLowerCase().startsWith(title.toLowerCase()) && title.length > matchedTitle.length) {
                  matchedTitle = title;
              }
          }
          if (matchedTitle) {
              data.current_designation = matchedTitle;
              data.current_company = roleAndCompany.substring(matchedTitle.length).trim();
          } else {
              // Fallback if no keyword is found
              data.current_designation = roleAndCompany;
          }
      }
  }

  // --- Multi-Format: Highest Education ---
  const eduHeaderIndex = lines.findIndex(l => l.toLowerCase().startsWith('education:') || l.toLowerCase().startsWith('highest degree'));
  if (eduHeaderIndex !== -1) {
      const headerLine = lines[eduHeaderIndex];
      const educationText = headerLine.replace(/education:|highest degree/i, '').trim();
      if (educationText.length > 5) { // Data is on the same line
          data.highest_education = educationText;
      } else if (lines[eduHeaderIndex + 1]) { // Data is on the next line
          data.highest_education = lines[eduHeaderIndex + 1].trim();
      }
  }

  // --- Foundit Format: Industry ---
  const industryHeaderIndex = lines.findIndex(l => l.toLowerCase().startsWith('industry:'));
  if (industryHeaderIndex !== -1) {
      const headerLine = lines[industryHeaderIndex];
      const industryText = headerLine.replace(/industry:/i, '').trim();
       if (industryText.length > 2) { // Data is on the same line
          data.industry = industryText;
      } else if (lines[industryHeaderIndex + 1]) { // Data is on the next line
          data.industry = lines[industryHeaderIndex + 1].trim();
      }
  }

  return data;
};
// --- END: Heavily Revised Multi-Format Parsing Logic ---


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
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Enrich Candidate Data</DialogTitle>
          <DialogDescription>
            Paste details from any source to auto-fill the form, then review and save.
          </DialogDescription>
        </DialogHeader>

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