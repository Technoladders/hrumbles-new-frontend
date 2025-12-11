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

// --- FORMAT DATE UTILITY FUNCTION ---
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString || dateString.toLowerCase() === 'present') {
    return 'Present';
  }
  
  try {
    // Handle various date formats
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return dateString; // Return original if invalid
    }
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    return `${day}-${month}-${year}`;
  } catch (error) {
    return dateString || 'N/A'; // Fallback to original string
  }
};

// --- ROW STYLING HELPER FUNCTION ---
const getRowClassByStatus = (companyStatus: string): string => {
  switch (companyStatus) {
    case 'High Similarity':
    case 'Exact Match':
    case 'Alias Match':
      return 'bg-green-50/70 hover:bg-green-50 border-l-4 border-green-400';
    case 'Company Missing':
    case 'Mismatch':
      return 'bg-red-50/70 hover:bg-red-50 border-l-4 border-red-400';
    case 'Partial Match (Company)':
      return 'bg-yellow-50/70 hover:bg-yellow-50 border-l-4 border-yellow-400';
    case 'Not Claimed by Candidate':
      return 'bg-orange-50/70 hover:bg-orange-50 border-l-4 border-orange-400';
    default:
      return 'hover:bg-gray-50';
  }
};

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

  console.log("uanHistory:", uanHistory)

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
                  <TableRow key={index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{exp.company}</TableCell>
                    <TableCell>{exp.designation}</TableCell>
                    <TableCell>{formatDate(exp.start_date)} – {formatDate(exp.end_date)}</TableCell>
                  </TableRow>
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
              {/* Render candidate's claimed experiences */}
              {[...(verifiedExperiences?.aligned || []), ...(verifiedExperiences?.candidateMissing || [])].map((exp: any, index: number) => {
                const rowClass = getRowClassByStatus(exp.comparison.company.status);
                
                return (
                  <TableRow key={index} className={rowClass}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      {exp.company}
                      <div className="text-xs text-gray-500">
                        {exp.designation} | {formatDate(exp.start_date)} - {formatDate(exp.end_date)}
                      </div>
                    </TableCell>
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
                );
              })}
              
              {/* Render UAN-detected companies not claimed by candidate */}
         {verifiedExperiences && verifiedExperiences.uanExtra.length > 0 && 
  verifiedExperiences.uanExtra.map((uan, index) => {
    const companyName = uan['Establishment Name'] || uan.establishment_name;
    const startDate = uan.Doj || uan.date_of_joining;
    const endDate = uan.DateOfExitEpf || uan.date_of_exit || 'Present';
    const totalRows = [...(verifiedExperiences?.aligned || []), ...(verifiedExperiences?.candidateMissing || [])].length;
    
    return (
  <TableRow 
  className="bg-orange-50/70 hover:bg-orange-50"
>
  <TableCell className="text-gray-700 font-semibold border-l-4 border-orange-400">{totalRows + index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TooltipProvider delayDuration={100}>
                            <Tooltip>
                              <TooltipTrigger>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gradient-to-r from-orange-100 to-amber-100 border border-orange-200/50 text-orange-900 font-medium text-sm shadow-sm">
                                  <svg className="w-3.5 h-3.5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  [{companyName}]
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs">
                                <p className="font-semibold text-orange-600 mb-1">Auto-detected from UAN Records</p>
                                <p className="text-xs">This company was found in official UAN records but not listed in the candidate's claimed experience. This may indicate missing or undisclosed work history.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                     <div className="text-xs text-gray-700 font-medium mt-1.5 ml-1">
  Duration: {formatDate(startDate)} - {formatDate(endDate)}
</div>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider delayDuration={100}>
                          <Tooltip>
                            <TooltipTrigger>
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-200/50 text-amber-900 text-xs font-medium shadow-sm">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                               Not Mentioned in Candidate Resume
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>This experience was not listed by the candidate but appears in UAN records</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-gray-400 italic">No actions available</span>
                      </TableCell>
                    </TableRow>
                  );
                })
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
     <EditExperienceModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} experience={editingItem} onSave={handleSaveExperience}/>
      <LinkExperienceModal isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)} missingExperience={linkingItem} uanExtraRecords={verifiedExperiences?.uanExtra || []} onLink={handleManualLink} />
    </>
  );
};

export default CandidateExperienceCard;