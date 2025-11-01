import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from '@/components/ui/badge';
import { X, Check, Star, MapPin, FileText, BookOpen, BrainCircuit, Grip, Users, Eye, Plus, Bot, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

// --- NEW: Updated Interface to match the detailed structure ---
export interface ParsedCandidateProfile {
  fileName: string;
  candidate_name: string;
  location?: string;
  summary?: string;
  education_summary?: string;
  experience_years?: string;
  overall_match_score?: number;
  matched_skills?: { requirement: string; matched: string; details: string }[];
  missing_or_weak_areas?: string[];
  top_skills?: string[];
  resume_url?: string;
  // Add other fields from the Edge Function if you want to display them
}

// Props for the main component
interface CandidateComparisonViewProps {
  candidates: ParsedCandidateProfile[];
  selectedIndices: Set<number>;
  onSelectionChange: (actualIndex: number) => void;
  onSelectAll: () => void;
  onExit: () => void;
  onAddSingleCandidate: (candidate: ParsedCandidateProfile) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  totalCandidates: number;
}

// Card Section Helper
const CardSection = ({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) => {
    const hasContent = children && (!Array.isArray(children) || children.length > 0) && (typeof children !== 'string' || children.trim() !== '');
    return (
        <div className="border-t border-gray-200 pt-3">
            <p className="text-xs text-gray-400 font-medium flex items-center">{icon}<span className="ml-2">{title}</span></p>
            <div className="mt-1">
                {hasContent ? children : <p className="text-sm font-medium text-gray-500">Not specified</p>}
            </div>
        </div>
    );
};

export const CandidateComparisonView: React.FC<CandidateComparisonViewProps> = ({
  candidates,
  selectedIndices,
  onSelectionChange,
  onSelectAll,
  onExit,
  onAddSingleCandidate,
  currentPage,
  totalPages,
  onPageChange,
  totalCandidates,
}) => {
  const startIndex = (currentPage - 1) * 5;
  console.log("Rendering CandidateComparisonView with candidates:", candidates);

  // This function makes the "View Resume" button work
  const handleViewResume = (candidate: ParsedCandidateProfile) => {
    if (candidate.resume_url) {
      window.open(candidate.resume_url, '_blank', 'noopener,noreferrer');
    } else {
      toast.error("Original resume file URL not available for this candidate.");
    }
  };

  return (
    <div className="mt-12 bg-gray-50 p-6 h-full flex flex-col text-gray-800 rounded-lg">
      <div className="flex justify-between items-center mb-6 flex-shrink-0">
        <div>
          <h2 className="text-xl font-bold">Review & Select Candidates</h2>
          <p className="text-sm text-gray-500">Comparing {startIndex + 1}-{startIndex + candidates.length} of {totalCandidates} new candidates</p>
        </div>
        <div className="flex items-center gap-4">
            <Button onClick={onSelectAll} variant="outline"><Users className="mr-2 h-4 w-4" />Select All ({selectedIndices.size}/{totalCandidates})</Button>
            <Button onClick={onExit} variant="ghost"><X className="mr-2 h-4 w-4" />Cancel</Button>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto pr-2 -mr-2">
      <motion.div
  key={currentPage}
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.3 }}
  className="grid gap-5 h-full" // Removed responsive grid classes
  // This style attribute is the key to the fix
  style={{ gridTemplateColumns: `repeat(${candidates.length}, minmax(300px, 1fr))` }}
>
          {candidates.map((candidate, pageIndex) => {
            const actualIndex = startIndex + pageIndex;
            const isSelected = selectedIndices.has(actualIndex);
            
            return (
              <motion.div
                key={actualIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: pageIndex * 0.05 }}
                className={`flex flex-col border rounded-lg bg-white transition-all duration-300 ${isSelected ? 'border-purple-500 shadow-lg' : 'border-gray-200 hover:shadow-md'}`}
              >
                <div className="p-4 flex justify-between items-start">
                    <div className="flex items-center">
                        <Checkbox 
                            checked={isSelected}
                            onCheckedChange={() => onSelectionChange(actualIndex)}
                            className="h-5 w-5 mr-3"
                        />
                        <h3 className="font-bold text-lg" title={candidate.candidate_name}>{candidate.candidate_name || 'Unnamed'}</h3>
                    </div>
                    <Button size="icon" variant="ghost" className="text-gray-400 hover:text-amber-500 -mt-2 -mr-2"><Star size={18} /></Button>
                </div>

                <div className="px-4 pb-4 flex justify-between items-center border-b border-gray-200">
                  <div>
                    <p className="text-xs text-gray-500">Recommended Score</p>
                    <p className="text-4xl font-bold text-purple-600">{candidate.overall_match_score || 'N/A'}<span className="text-2xl">%</span></p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button onClick={() => handleViewResume(candidate)} variant="ghost" size="icon" className="h-9 w-9 text-gray-500 hover:text-purple-600" title="View Resume">
                        <Eye size={18} />
                    </Button>
                    <Button onClick={() => toast.info("Deep Analysis feature coming soon!")} variant="ghost" size="icon" className="h-9 w-9 text-gray-500 hover:text-purple-600" title="Deep Analysis">
                        <Bot size={18} />
                    </Button>
                    <Button onClick={() => onAddSingleCandidate(candidate)} variant="ghost" size="icon" className="h-9 w-9 text-gray-500 hover:text-purple-600" title="Add to Pool">
                        <Plus size={18} />
                    </Button>
                  </div>
                </div>

                <div className="flex-grow overflow-y-auto p-4 space-y-4">
                  <CardSection icon={<MapPin size={14} className="text-gray-400"/>} title="Location"><p className="text-sm font-medium">{candidate.location}</p></CardSection>
                  <CardSection icon={<FileText size={14} className="text-gray-400"/>} title="Profile Summary"><p className="text-xs">{candidate.summary}</p></CardSection>
                  <CardSection icon={<Grip size={14} className="text-gray-400"/>} title="Experience"><p className="text-sm font-medium">{candidate.experience_years}</p></CardSection>
                  <CardSection icon={<BookOpen size={14} className="text-gray-400"/>} title="Education"><p className="text-sm font-medium">{candidate.education_summary}</p></CardSection>
                  <CardSection icon={<Check size={14} className="text-gray-400"/>} title="Matched Skills">
                    <div className="flex flex-wrap gap-1.5">
                      {candidate.matched_skills?.map(skill => (
                        <Badge key={skill.requirement} className="bg-green-100 text-green-800 font-medium" title={skill.details}>
                          {skill.requirement}
                        </Badge>
                      ))}
                    </div>
                  </CardSection>
                  <CardSection icon={<X size={14} className="text-gray-400"/>} title="Missing Skills for this Role">
                    <div className="flex flex-wrap gap-1.5">
                      {candidate.missing_or_weak_areas?.map(skill => <Badge key={skill} variant="destructive" className="bg-red-100 text-red-800">{skill}</Badge>)}
                    </div>
                  </CardSection>
                  <CardSection icon={<BrainCircuit size={14} className="text-gray-400"/>} title="Additional Skills">
                    <div className="flex flex-wrap gap-1.5">
                      {candidate.top_skills?.map(skill => <Badge key={skill} variant="secondary">{skill}</Badge>)}
                    </div>
                  </CardSection>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center mt-4 pt-4 border-t border-gray-200 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm font-medium mx-4">Page {currentPage} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      )}
    </div>
  );
};