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
import { Trash2, Edit, Link2, AlertCircle } from "lucide-react";

interface CandidateExperienceCardProps {
  candidate: Candidate;
  uanHistory: UanRecord[] | null;
}

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString || dateString.toLowerCase() === 'present') return 'Present';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${date.getDate()}-${months[date.getMonth()]}-${date.getFullYear()}`;
  } catch {
    return dateString || 'N/A';
  }
};

const getRowClassByStatus = (companyStatus: string): string => {
  switch (companyStatus) {
    case 'High Similarity':
    case 'Exact Match':
    case 'Alias Match':
      return 'bg-green-50/60 border-l-2 border-green-400';
    case 'Company Missing':
    case 'Mismatch':
      return 'bg-red-50/60 border-l-2 border-red-400';
    case 'Partial Match (Company)':
      return 'bg-yellow-50/60 border-l-2 border-yellow-400';
    case 'Not Claimed by Candidate':
      return 'bg-orange-50/60 border-l-2 border-orange-400';
    default:
      return 'hover:bg-gray-50';
  }
};

const CandidateExperienceCard: React.FC<CandidateExperienceCardProps> = ({ candidate, uanHistory }) => {
  const queryClient = useQueryClient();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CareerExperience | null>(null);
  const [linkingItem, setLinkingItem] = useState<CareerExperience | null>(null);
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

  const findExperienceIndex = (expToFind: CareerExperience) =>
    currentExperiences.findIndex(exp => exp.company === expToFind.company && exp.start_date === expToFind.start_date);

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

  const handleEdit = (exp: CareerExperience) => { setEditingItem(exp); setIsEditModalOpen(true); };
  const handleLink = (exp: CareerExperience) => { setLinkingItem(exp); setIsLinkModalOpen(true); };

  const handleSaveExperience = async (updatedExp: CareerExperience) => {
    if (!editingItem) return;
    const idx = findExperienceIndex(editingItem);
    if (idx === -1) { toast.error("Could not find the experience to update."); return; }
    const updatedList = [...currentExperiences];
    updatedList[idx] = updatedExp;
    setCurrentExperiences(updatedList);
    setIsEditModalOpen(false);
    await persistChanges(updatedList, "Experience updated.", "Failed to save experience.");
    setEditingItem(null);
  };

  const handleDelete = async (expToDelete: CareerExperience) => {
    if (!window.confirm(`Delete "${expToDelete.company}"?`)) return;
    const idx = findExperienceIndex(expToDelete);
    if (idx === -1) { toast.error("Could not find the experience to delete."); return; }
    const updatedList = currentExperiences.filter((_, i) => i !== idx);
    setCurrentExperiences(updatedList);
    await persistChanges(updatedList, "Experience deleted.", "Failed to delete experience.");
  };

  const handleManualLink = async (uanRecord: UanRecord) => {
    if (!linkingItem) return;
    const idx = findExperienceIndex(linkingItem);
    if (idx === -1) { toast.error("Could not find the experience to link."); return; }
    const updatedList = [...currentExperiences];
    updatedList[idx].company = uanRecord['Establishment Name'] || uanRecord.establishment_name || 'Unknown';
    setCurrentExperiences(updatedList);
    setIsLinkModalOpen(false);
    await persistChanges(updatedList, "Experience successfully linked.", "Failed to link experience.");
    setLinkingItem(null);
  };

  if (!uanHistory) {
    return (
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-gray-700">Claimed Experience</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-xs text-gray-500 mb-3">Run 'Fetch Employment History' to compare against UAN records.</p>
          <Table>
            <TableHeader>
              <TableRow className="h-8">
                <TableHead className="text-xs py-1 w-8">#</TableHead>
                <TableHead className="text-xs py-1">Company</TableHead>
                <TableHead className="text-xs py-1">Role</TableHead>
                <TableHead className="text-xs py-1">Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentExperiences.length > 0 ? (
                currentExperiences.map((exp, index) => (
                  <TableRow key={index} className="h-8">
                    <TableCell className="text-xs py-1 text-gray-500">{index + 1}</TableCell>
                    <TableCell className="text-xs py-1 font-medium">{exp.company}</TableCell>
                    <TableCell className="text-xs py-1 text-gray-600">{exp.designation}</TableCell>
                    <TableCell className="text-xs py-1 text-gray-500">{formatDate(exp.start_date)} – {formatDate(exp.end_date)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={4} className="text-center text-xs text-gray-400 py-4">No experience data provided.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  const allCandidateRows = [...(verifiedExperiences?.aligned || []), ...(verifiedExperiences?.candidateMissing || [])];

  return (
    <>
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-gray-700">Experience Verification</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <Table>
            <TableHeader>
              <TableRow className="h-7">
                <TableHead className="text-[11px] py-1 w-7 font-semibold text-gray-500">#</TableHead>
                <TableHead className="text-[11px] py-1 font-semibold text-gray-500">Company & Role</TableHead>
                <TableHead className="text-[11px] py-1 font-semibold text-gray-500">Status</TableHead>
                <TableHead className="text-[11px] py-1 font-semibold text-gray-500 w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allCandidateRows.map((exp: any, index: number) => {
                const rowClass = getRowClassByStatus(exp.comparison.company.status);
                return (
                  <TableRow key={index} className={`${rowClass} h-auto`}>
                    <TableCell className="text-xs py-2 text-gray-400 font-medium align-top">{index + 1}</TableCell>
                    <TableCell className="py-2 align-top">
                      <p className="text-xs font-semibold text-gray-800 leading-tight">{exp.company}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{exp.designation}</p>
                      <p className="text-[10px] text-gray-400">{formatDate(exp.start_date)} – {formatDate(exp.end_date)}</p>
                    </TableCell>
                    <TableCell className="py-2 align-top">
                      <div className="flex flex-wrap gap-1">
                        <TooltipProvider delayDuration={100}>
                          <Tooltip>
                            <TooltipTrigger><StatusBadge status={exp.comparison.company.status} /></TooltipTrigger>
                            <TooltipContent><p className="text-xs">{exp.comparison.company.reason || exp.comparison.company.status}</p></TooltipContent>
                          </Tooltip>
                          {exp.comparison.company.status !== 'Company Missing' && (
                            <Tooltip>
                              <TooltipTrigger><StatusBadge status={exp.comparison.duration.status} /></TooltipTrigger>
                              <TooltipContent><p className="text-xs">{exp.comparison.duration.reason || exp.comparison.duration.status}</p></TooltipContent>
                            </Tooltip>
                          )}
                        </TooltipProvider>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 align-top">
                      <div className="flex gap-0.5">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEdit(exp)}>
                          <Edit className="h-3 w-3 text-gray-400" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDelete(exp)}>
                          <Trash2 className="h-3 w-3 text-red-400" />
                        </Button>
                        {exp.comparison.company.status === 'Company Missing' && verifiedExperiences?.uanExtra && verifiedExperiences.uanExtra.length > 0 && (
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleLink(exp)}>
                            <Link2 className="h-3 w-3 text-blue-400" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {/* UAN Extra rows */}
              {verifiedExperiences?.uanExtra && verifiedExperiences.uanExtra.length > 0 &&
                verifiedExperiences.uanExtra.map((uan, index) => {
                  const companyName = uan['Establishment Name'] || uan.establishment_name;
                  const startDate = uan.Doj || uan.date_of_joining;
                  const endDate = uan.DateOfExitEpf || uan.date_of_exit || 'Present';
                  const rowNum = allCandidateRows.length + index + 1;

                  return (
                    <TableRow key={`uan-extra-${index}`} className="bg-orange-50/60 border-l-2 border-orange-400 h-auto">
                      <TableCell className="text-xs py-2 text-gray-400 font-medium align-top">{rowNum}</TableCell>
                      <TableCell className="py-2 align-top">
                        <TooltipProvider delayDuration={100}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 text-orange-500 flex-shrink-0" />
                                <span className="text-xs font-semibold text-orange-800 leading-tight">{companyName}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              <p className="font-semibold text-orange-600 mb-1 text-xs">Auto-detected from UAN Records</p>
                              <p className="text-xs">Found in official UAN records but not listed in candidate's claimed experience.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <p className="text-[10px] text-gray-400 mt-0.5 ml-4">{formatDate(startDate)} – {formatDate(endDate)}</p>
                      </TableCell>
                      <TableCell className="py-2 align-top">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-orange-100 border border-orange-200 text-orange-800 text-[10px] font-medium">
                          Not in Resume
                        </span>
                      </TableCell>
                      <TableCell className="py-2 align-top">
                        <span className="text-[10px] text-gray-300 italic">—</span>
                      </TableCell>
                    </TableRow>
                  );
                })
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <EditExperienceModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} experience={editingItem} onSave={handleSaveExperience} />
      <LinkExperienceModal isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)} missingExperience={linkingItem} uanExtraRecords={verifiedExperiences?.uanExtra || []} onLink={handleManualLink} />
    </>
  );
};

export default CandidateExperienceCard;