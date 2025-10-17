import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowLeft, Check, Star, X, FileText, BookOpen, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const CANDIDATES_PER_PAGE = 5;

// --- 1. DEFINE THE NEW, DETAILED DATA STRUCTURE ---
// This interface matches the rich data extracted by your AI.
export interface ParsedCandidateProfile {
  fileName: string;
  candidate_name?: string;
  location?: string;
  summary?: string;
  education_summary?: string;
  validation_score?: number;
  matched_skills?: string[];
  unmatched_skills?: string[];
}

// A small helper component for each row of data in the card
const ComparisonRow = ({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) => {
  if (!children) return null;
  return (
    <div className="border-t border-slate-700/50 pt-3">
      <p className="text-xs text-slate-400 mb-1 flex items-center">{icon}{label}</p>
      {children}
    </div>
  );
};


// The main component for the comparison view
export const CandidateComparisonView = ({ 
  candidates, 
  onExit,
  selectedIndices,
  onSelectionChange
}: { 
  candidates: ParsedCandidateProfile[]; 
  onExit: () => void;
  selectedIndices: Set<number>;
  onSelectionChange: (index: number) => void;
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [direction, setDirection] = useState(0);

  const totalPages = Math.ceil(candidates.length / CANDIDATES_PER_PAGE);

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setCurrentPage(prev => Math.max(0, Math.min(prev + newDirection, totalPages - 1)));
  };

  const startIndex = currentPage * CANDIDATES_PER_PAGE;
  const endIndex = startIndex + CANDIDATES_PER_PAGE;
  const visibleCandidates = candidates.slice(startIndex, endIndex);

  // Animation variants remain the same
  const variants = { /* ... your variants ... */ };

  return (
    <div className="bg-slate-900 p-6 rounded-lg shadow-2xl animate-fade-in relative overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Review & Select Candidates</h2>
          <p className="text-slate-400">Comparing {startIndex + 1}-{Math.min(endIndex, candidates.length)} of {candidates.length} new candidates</p>
        </div>
        <Button onClick={onExit} variant="ghost" className="text-white hover:bg-slate-800">
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
      </div>

      {/* Comparison Grid with Animation */}
      <div className="relative flex-grow">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={currentPage}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ x: { type: 'spring', stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
            className="absolute grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full h-full"
          >
            {visibleCandidates.map((candidate, pageIndex) => {
              const actualIndex = startIndex + pageIndex;
              const isSelected = selectedIndices.has(actualIndex);
              
              return (
              <div key={actualIndex} className={`bg-slate-800/50 border rounded-lg p-4 flex flex-col space-y-3 transition-all duration-300 hover:-translate-y-1 ${isSelected ? 'border-purple-500 shadow-purple-500/20 shadow-lg' : 'border-slate-700'}`}>
                {/* --- 2. CARD HEADER UPDATED WITH REAL DATA --- */}
                <div className="text-center pb-3 border-b border-slate-700">
                    <h3 className="font-bold text-lg text-white truncate" title={candidate.candidate_name}>{candidate.candidate_name || 'Unnamed'}</h3>
                    <Badge className="mt-1 bg-blue-500/20 text-blue-300 border-blue-500/30">
                        Score: {candidate.validation_score || 'N/A'}%
                    </Badge>
                </div>

                {/* --- 3. ACTIONS ARE NOW FUNCTIONAL --- */}
                <div className="flex justify-center space-x-2 pt-2">
                    <Button 
                      size="sm"
                      variant={isSelected ? "default" : "outline"}
                      onClick={() => onSelectionChange(actualIndex)}
                      className={`w-full ${isSelected ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20'}`}
                    >
                      <Check size={16} className="mr-2"/> {isSelected ? 'Selected' : 'Select'}
                    </Button>
                    {/* Keep other buttons for future features */}
                    <Button size="icon" variant="outline" className="bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20"><Star size={16} /></Button>
                </div>

                {/* --- 4. CARD BODY UPDATED WITH RICH, REAL DATA --- */}
                <div className="flex-grow overflow-y-auto space-y-3 pr-1">
                    <ComparisonRow icon={<MapPin size={12} className="mr-2" />} label="Location">
                        <p className="text-sm font-medium text-white">{candidate.location}</p>
                    </ComparisonRow>

                    <ComparisonRow icon={<FileText size={12} className="mr-2" />} label="Summary">
                        <p className="text-xs text-slate-300">{candidate.summary}</p>
                    </ComparisonRow>

                    <ComparisonRow icon={<BookOpen size={12} className="mr-2" />} label="Education">
                        <p className="text-sm font-medium text-white">{candidate.education_summary}</p>
                    </ComparisonRow>

                    <ComparisonRow icon={<Check size={12} className="mr-2" />} label="Matched Skills">
                       <div className="flex flex-wrap gap-1 mt-1">
                          {candidate.matched_skills?.map(skill => <Badge key={skill} className="bg-green-100 text-green-800">{skill}</Badge>)}
                        </div>
                    </ComparisonRow>

                    <ComparisonRow icon={<Star size={12} className="mr-2" />} label="Other Skills">
                       <div className="flex flex-wrap gap-1 mt-1">
                          {candidate.unmatched_skills?.map(skill => <Badge key={skill} variant="secondary">{skill}</Badge>)}
                        </div>
                    </ComparisonRow>
                </div>
              </div>
            )})}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center mt-6 pt-4 border-t border-slate-800 space-x-4">
            <Button onClick={() => paginate(-1)} disabled={currentPage === 0} variant="ghost" className="text-white hover:bg-slate-700">
                <ChevronLeft size={20} />
            </Button>
            <span className="text-slate-400">Page {currentPage + 1} of {totalPages}</span>
            <Button onClick={() => paginate(1)} disabled={currentPage >= totalPages - 1} variant="ghost" className="text-white hover:bg-slate-700">
                <ChevronRight size={20} />
            </Button>
        </div>
      )}
    </div>
  );
};