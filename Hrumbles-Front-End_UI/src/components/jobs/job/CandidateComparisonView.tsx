import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowLeft, Check, Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Candidate } from '@/lib/types'; // Assuming this type is correct

const CANDIDATES_PER_PAGE = 5;

// A small helper component for each row of data in the card
const ComparisonRow = ({ label, value }: { label: string; value: string | string[] | undefined | null }) => {
  if (!value) return null;
  
  const displayValue = Array.isArray(value) ? value.join(', ') : value;

  return (
    <div className="border-t border-slate-200/50 py-3">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-sm font-medium text-white">{displayValue}</p>
    </div>
  );
};


// The main component for the comparison view
export const CandidateComparisonView = ({ candidates, onExit }: { candidates: Candidate[]; onExit: () => void; }) => {
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

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  };

  return (
    <div className="bg-slate-900 p-6 rounded-lg shadow-2xl animate-fade-in relative overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Bulk Upload Review</h2>
          <p className="text-slate-400">Comparing {startIndex + 1}-{Math.min(endIndex, candidates.length)} of {candidates.length} new candidates</p>
        </div>
        <Button onClick={onExit} variant="outline" className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Job Details
        </Button>
      </div>

      {/* Comparison Grid with Animation */}
      <div className="relative h-[600px]">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={currentPage}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'spring', stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="absolute grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full"
          >
            {visibleCandidates.map((candidate) => (
              <div key={candidate.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex flex-col space-y-3 transition-transform duration-300 hover:-translate-y-2 hover:shadow-purple-500/20 hover:shadow-2xl">
                {/* Candidate Card Header */}
                <div className="text-center pb-3 border-b border-slate-700">
                    <h3 className="font-bold text-lg text-white">{candidate.name}</h3>
                    <Badge className="mt-1 bg-purple-500/20 text-purple-300 border-purple-500/30">
                        Match: {candidate.matchScore || 'N/A'}%
                    </Badge>
                </div>
                {/* Actions */}
                <div className="flex justify-center space-x-2 pt-2">
                    <Button size="sm" variant="outline" className="bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20"><Check size={16} /></Button>
                    <Button size="sm" variant="outline" className="bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20"><Star size={16} /></Button>
                    <Button size="sm" variant="outline" className="bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"><X size={16} /></Button>
                </div>

                {/* Candidate Details */}
                <div className="flex-grow overflow-y-auto">
                    <ComparisonRow label="Experience" value={`${candidate.experience || 'N/A'} years`} />
                    <ComparisonRow label="Key Skills" value={candidate.skills} />
                    {/* Add more rows as needed from your 'Candidate' type */}
                </div>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center mt-4 space-x-4">
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