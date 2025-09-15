// src/pages/jobs/ai/cards/CandidateExperienceCard.tsx

import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Candidate, CareerExperience } from "@/lib/types";
import { StatusBadge, compareCompanyNames, compareDurations, UanRecord } from '../experienceComparisonUtils'; 
import { EditExperienceModal } from "../EditExperienceModal";
import { LinkExperienceModal } from "../LinkExperienceModal";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Edit, Link2 } from "lucide-react";
import { c } from "node_modules/framer-motion/dist/types.d-Bq-Qm38R";

interface CandidateExperienceCardProps {
  candidate: Candidate;
  uanHistory: UanRecord[] | null;
}


// --- NEW HELPER FUNCTION TO DETERMINE THE SINGLE OVERALL STATUS ---
const determineOverallStatus = (compStatus: any, durStatus: any): string => {
  // Rule 1: If the company is a definite mismatch or missing, that's the most critical status.
  if (compStatus.status === 'Mismatch' || compStatus.status === 'Company Missing') {
    return compStatus.status;
  }
  // Rule 2: If the company is a partial match, prioritize showing that.
  if (compStatus.status === 'Partial Match (Company)') {
    return compStatus.status;
  }
  // Rule 3: If the company is a green match (Exact, Alias, High Similarity) but the duration is not, show the duration status.
  if (durStatus.status !== 'Exact Match') {
    return durStatus.status;
  }
  // Rule 4: If both are perfect matches, show Exact Match.
  return 'Exact Match';
};


const CandidateExperienceCard: React.FC<CandidateExperienceCardProps> = ({ candidate, uanHistory }) => {
  const queryClient = useQueryClient();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{ experience: CareerExperience; index: number } | null>(null);
  const [linkingItem, setLinkingItem] = useState<{ experience: CareerExperience; index: number } | null>(null);
  const [currentExperiences, setCurrentExperiences] = useState<CareerExperience[]>([]);

  useEffect(() => {
    setCurrentExperiences(candidate.career_experience || []);
  }, [candidate.career_experience]);

 const verifiedExperiences = useMemo(() => {
    if (!uanHistory) return null;
    const experiences = currentExperiences || [];
    const aligned: any[] = [];
    const candidateMissing: any[] = [];
    let uanRecordsCopy = [...uanHistory];

    experiences.forEach((exp) => {
      let bestMatch: { score: number; uanRecord: UanRecord; compStatus: any; durStatus: any; uanIndex: number } | null = null;
      uanRecordsCopy.forEach((uan, uanIndex) => {
        if (!uan) return;
        const uanCompanyName = uan['Establishment Name'] || uan.establishment_name;
        if (!uanCompanyName) return;
        const compStatus = compareCompanyNames(exp.company, uanCompanyName);
        if (compStatus.score >= 70 && (!bestMatch || compStatus.score > bestMatch.score)) {
          const durStatus = compareDurations(exp, uan);
          // --- FIX: Correctly access compStatus.score instead of the undefined 'score' variable ---
          bestMatch = { score: compStatus.score, uanRecord: uan, compStatus, durStatus, uanIndex };
        }
      });

      if (bestMatch) {
        aligned.push({ ...exp, comparison: { company: { ...bestMatch.compStatus, reason: `Similarity: ${bestMatch.score.toFixed(0)}%` }, duration: bestMatch.durStatus }, uanRecord: bestMatch.uanRecord });
        uanRecordsCopy[bestMatch.uanIndex] = null as any;
      } else {
        candidateMissing.push({ ...exp, comparison: { company: { status: 'Company Missing', reason: "Not found in UAN records." }, duration: { status: 'Unverifiable' } } });
      }
    });

    return { aligned, candidateMissing, uanExtra: uanRecordsCopy.filter(Boolean) };
  }, [currentExperiences, uanHistory]);

  const findExperienceIndex = (expToFind: CareerExperience) => currentExperiences.findIndex(exp => exp.company === expToFind.company && exp.start_date === expToFind.start_date);
  

  const persistChanges = async (updatedList: CareerExperience[], successMessage: string, errorMessage: string) => {
    const { error } = await supabase.from('hr_job_candidates').update({ career_experience: updatedList }).eq('id', candidate.id);
    if (error) {
      toast.error(errorMessage, { description: error.message });
      setCurrentExperiences(candidate.career_experience || []);
    } else {
      toast.success(successMessage);
      queryClient.invalidateQueries({ queryKey: ['candidate', candidate.id] });
    }
  };

 const handleEdit = (exp: CareerExperience) => {
    setEditingItem(exp);
    setIsEditModalOpen(true);
  };
  
  const handleLink = (exp: CareerExperience) => {
    setLinkingItem(exp);
    setIsLinkModalOpen(true);
  };

  const handleSaveExperience = async (updatedExp: CareerExperience) => {
    if (!editingItem) return;
    const indexToUpdate = findExperienceIndex(editingItem);
    if (indexToUpdate === -1) {
      toast.error("Could not find the experience to update.");
      return;
    }
    const updatedList = [...currentExperiences];
    updatedList[indexToUpdate] = updatedExp;
    setCurrentExperiences(updatedList);
    setIsEditModalOpen(false);
    await persistChanges(updatedList, "Experience updated.", "Failed to save experience.");
    setEditingItem(null);
  };

  const handleDelete = async (expToDelete: CareerExperience) => {
    if (!window.confirm(`Delete "${expToDelete.company}"?`)) return;
    const indexToDelete = findExperienceIndex(expToDelete);
    if (indexToDelete === -1) {
      toast.error("Could not find the experience to delete.");
      return;
    }
    const updatedList = currentExperiences.filter((_, index) => index !== indexToDelete);
    setCurrentExperiences(updatedList);
    await persistChanges(updatedList, "Experience deleted.", "Failed to delete experience.");
  };
  
  const handleManualLink = async (uanRecord: UanRecord) => {
    if (!linkingItem) return;
    const indexToUpdate = findExperienceIndex(linkingItem);
    if (indexToUpdate === -1) {
      toast.error("Could not find the experience to link.");
      return;
    }
    const updatedList = [...currentExperiences];
    const uanCompanyName = uanRecord['Establishment Name'] || uanRecord.establishment_name || 'Unknown';
    updatedList[indexToUpdate].company = uanCompanyName;
    setCurrentExperiences(updatedList);
    setIsLinkModalOpen(false);
    await persistChanges(updatedList, "Experience successfully linked.", "Failed to link experience.");
    setLinkingItem(null);
  };
  console.log("verifiedExperiences", verifiedExperiences)
  console.log("currentExperiences", currentExperiences)
  

  if (!uanHistory) {
    return (
      <Card>
        <CardHeader><CardTitle>Claimed Experience</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">Run 'Fetch Employment History' from the verification panel to compare against UAN records.</p>
          <Table>
            <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Company</TableHead><TableHead>Role</TableHead><TableHead>Duration</TableHead></TableRow></TableHeader>
            <TableBody>
              {currentExperiences.length > 0 ? (
                currentExperiences.map((exp, index) => (
                  <TableRow key={index}><TableCell>{index + 1}</TableCell><TableCell>{exp.company}</TableCell><TableCell>{exp.designation}</TableCell><TableCell>{exp.start_date} – {exp.end_date}</TableCell></TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={4} className="text-center">No experience data provided.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
       <Card>
        <CardHeader><CardTitle className="text-xl">Experience Verification</CardTitle></CardHeader>
        <CardContent>
          <h3 className="text-md font-semibold mb-2 text-gray-700">Verification Summary</h3>
          <Table>
            <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Company & Role</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {[...(verifiedExperiences?.aligned || []), ...(verifiedExperiences?.candidateMissing || [])].map((exp: any, index: number) => (
                <TableRow key={index}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{exp.company}<div className="text-xs text-gray-500">{exp.designation} | {exp.start_date} - {exp.end_date}</div></TableCell>
                  <TableCell>
                    {/* --- CHANGE: Display multiple badges with tooltips --- */}
                    <div className="flex flex-wrap gap-2">
                      <TooltipProvider delayDuration={100}>
                        {/* Company Status Badge */}
                        <Tooltip>
                          <TooltipTrigger><StatusBadge status={exp.comparison.company.status} /></TooltipTrigger>
                          <TooltipContent><p>{exp.comparison.company.reason || exp.comparison.company.status}</p></TooltipContent>
                        </Tooltip>
                        
                        {/* Duration Status Badge (only if company is not missing) */}
                        {exp.comparison.company.status !== 'Company Missing' && (
                          <Tooltip>
                            <TooltipTrigger><StatusBadge status={exp.comparison.duration.status} /></TooltipTrigger>
                            <TooltipContent><p>{exp.comparison.duration.reason || exp.comparison.duration.status}</p></TooltipContent>
                          </Tooltip>
                        )}
                      </TooltipProvider>
                    </div>
                  </TableCell>
                  <TableCell className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(exp)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(exp)}><Trash2 className="h-4 w-4" /></Button>
                    {exp.comparison.company.status === 'Company Missing' && verifiedExperiences?.uanExtra && verifiedExperiences.uanExtra.length > 0 && (
                      <Button variant="ghost" size="icon" onClick={() => handleLink(exp)}><Link2 className="h-4 w-4 text-blue-500" /></Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {verifiedExperiences && verifiedExperiences.uanExtra.length > 0 && (
            <div className="mt-8">
              <h3 className="text-md font-semibold mb-2 flex items-center gap-2">
                <StatusBadge status="Extra Company Found" /> Additional Companies Found in UAN
              </h3>
              <Table>
                <TableHeader><TableRow><TableHead>Company</TableHead><TableHead>Duration</TableHead></TableRow></TableHeader>
                <TableBody>
                  {verifiedExperiences.uanExtra.map((uan, index) => (
                    <TableRow key={`extra-${index}`}><TableCell>{uan['Establishment Name'] || uan.establishment_name}</TableCell><TableCell>{uan.Doj || uan.date_of_joining} – {uan.DateOfExitEpf || uan.date_of_exit || 'Present'}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
     <EditExperienceModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} experience={editingItem} onSave={handleSaveExperience}/>
      <LinkExperienceModal isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)} missingExperience={linkingItem} uanExtraRecords={verifiedExperiences?.uanExtra || []} onLink={handleManualLink} />
    </>
  );
};

export default CandidateExperienceCard;