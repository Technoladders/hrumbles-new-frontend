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
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";


// --- START: New and Improved Multi-Format Parsing Logic ---
const parsePastedText = (text: string) => {
  const data: any = {};
  
  const junkKeywords = ["Save", "Enriched", "View phone number", "Call candidate", "WhatsApp", "Verified phone & email"];
  // Filter out lines that are just junk keywords
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line && !junkKeywords.some(keyword => line.includes(keyword)));

  if (lines.length === 0) return {};

  const extractDataAfterHeader = (headerRegex: RegExp) => {
    const headerIndex = lines.findIndex(l => headerRegex.test(l.toLowerCase()));
    if (headerIndex === -1) return null;
    const sameLineText = lines[headerIndex].replace(headerRegex, '').trim();
    if (sameLineText.length > 2) return sameLineText;
    if (lines[headerIndex + 1]) return lines[headerIndex + 1].trim();
    return null;
  };

  // --- 1. Personal Details Extraction ---
  
  // Email (looks for standard email format)
  const emailMatch = text.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/);
  if (emailMatch) data.email = emailMatch[0];

  // Phone (looks for common phone patterns, ignoring small numbers like years)
  // This regex looks for 10-15 digits, possibly starting with +
  const phoneMatch = text.match(/(\+?\d{1,4}[\s-]?)?(\(?\d{3}\)?[\s-]?)?[\d\s-]{7,15}/);
  if (phoneMatch && phoneMatch[0].replace(/\D/g, '').length >= 10) {
      // Basic check to ensure it's not a date/timestamp
      data.phone = phoneMatch[0].trim();
  }

  // LinkedIn
  const linkedinLine = lines.find(l => l.includes('linkedin.com/in/'));
  if (linkedinLine) {
      // Extract just the URL if the line has other text
      const urlMatch = linkedinLine.match(/(https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?)/);
      data.linkedin_url = urlMatch ? urlMatch[0] : linkedinLine;
  }

  // GitHub
  const githubLine = lines.find(l => l.includes('github.com/'));
  if (githubLine) {
       const urlMatch = githubLine.match(/(https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9_-]+\/?)/);
       data.github_url = urlMatch ? urlMatch[0] : githubLine;
  }

  // --- 2. Professional Details Extraction ---

  const expLine = lines.find(l => l.match(/\d+y(\s\d+m)?/));
  if (expLine) {
    data.total_experience = expLine.match(/\d+y(\s\d+m)?/)?.[0];
  }

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

  const salaryLineIndex = lines.findIndex(l => l.includes('₹'));
  if (salaryLineIndex > 0) {
    const potentialLocation = lines[salaryLineIndex - 1];
    if (!potentialLocation.match(/\d+y(\s\d+m)?/)) {
      data.current_location = potentialLocation;
    }
  }

  const noticePeriodLine = lines.find(l => l.toLowerCase().match(/(days|month|serving|available to join)/i));
  if (noticePeriodLine) data.notice_period = noticePeriodLine;

const roleHeaderIndex = lines.findIndex(l => l.match(/^(current|previous)/i));
  if (roleHeaderIndex !== -1) {
    let combinedRoleLine = lines[roleHeaderIndex].replace(/^(current|previous)/i, '').trim();
    if (combinedRoleLine.length === 0 && lines[roleHeaderIndex + 1]) {
      combinedRoleLine = lines[roleHeaderIndex + 1].trim();
    }
    
    // Updated to match 'since', 'till', 'to' or hyphens followed by dates
    const sinceMatch = combinedRoleLine.match(/\s+(since|till|to|-)\s+.*$/i);
    const roleAndCompany = sinceMatch ? combinedRoleLine.substring(0, sinceMatch.index).trim() : combinedRoleLine;
    
    if (roleAndCompany.includes(' at ')) {
      const parts = roleAndCompany.split(' at ');
      data.current_designation = parts[0].trim();
      data.current_company = parts.slice(1).join(' at ').trim();
    } else {
      data.current_designation = roleAndCompany;
    }
  }

  data.highest_education = extractDataAfterHeader(/highest degree/i);
  data.industry = extractDataAfterHeader(/industry:/i);
  
  const locationsText = extractDataAfterHeader(/pref\. locations?/i);
  if (locationsText) {
      data.preferred_locations = locationsText.split(',').map(s => s.trim()).filter(Boolean);
  }

  Object.keys(data).forEach(key => {
    if (data[key] === null) delete data[key];
  });

  return data;
};
// --- END Parsing Logic ---


const EnrichDataDialog = ({ isOpen, onClose, candidate }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({});
  const [pastedText, setPastedText] = useState("");

  useEffect(() => {
    if (candidate) {
      setFormData({
        // --- ADDED: Personal Details ---
        candidate_name: candidate.candidate_name || "",
        email: candidate.email || "",
        phone: candidate.phone || "",
        linkedin_url: candidate.linkedin_url || "",
        github_url: candidate.github_url || "",
        // --- Existing Fields ---
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

  // Only check essential fields to prevent accidental empty saves
  const isFormEmpty = !formData.candidate_name && !formData.email; 

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
                placeholder="Paste unstructured text here (Resume text, LinkedIn, Naukri, etc)..."
                rows={6}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
              />
              <Button onClick={handleParseAndFill} disabled={!pastedText} className="w-full sm:w-auto">
                Parse and Fill Form Below
              </Button>
            </div> 

            <div className="space-y-2 pt-6">
                <Label className="text-lg font-semibold">2. Review and Save Changes</Label>
                                              
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4 border-t mt-2">
                      
                  {/* --- NEW SECTION: Personal Details --- */}
                  <div className="md:col-span-3 flex items-center gap-2 pb-1 border-b border-gray-100">
                    <span className="text-sm font-semibold text-purple-600 uppercase tracking-wider">Personal Details</span>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="candidate_name">Full Name <span className="text-red-500">*</span></Label>
                    <Input id="candidate_name" name="candidate_name" value={formData.candidate_name || ''} onChange={handleFormChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                    <Input id="email" name="email" value={formData.email || ''} onChange={handleFormChange} />
                  </div>
                    <div className="space-y-2">          
                    <Label htmlFor="phone" className="mb-1 block">
                      Phone
                    </Label>
                    <PhoneInput
                      id="phone"
                      placeholder="Enter phone number"
                      value={formData.phone}
                      onChange={(value) => setFormData((prev) => ({ ...prev, phone: value }))}
                      defaultCountry="IN"
                      international
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 flex items-center gap-2 bg-white"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-1.5">
                    <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                    <Input id="linkedin_url" name="linkedin_url" placeholder="https://linkedin.com/in/..." value={formData.linkedin_url || ''} onChange={handleFormChange} />
                  </div>
                  <div className="space-y-2 md:col-span-1.5">
                    <Label htmlFor="github_url">GitHub URL</Label>
                    <Input id="github_url" name="github_url" placeholder="https://github.com/..." value={formData.github_url || ''} onChange={handleFormChange} />
                  </div>


                  {/* --- EXISTING SECTION: Professional Details --- */}
                  <div className="md:col-span-3 flex items-center gap-2 pt-4 pb-1 border-b border-gray-100">
                    <span className="text-sm font-semibold text-purple-600 uppercase tracking-wider">Professional Snapshot</span>
                  </div>

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

        <DialogFooter className="p-6 pt-2">
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