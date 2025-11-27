import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { GoalWithDetails } from '@/types/goal';
import EditGoalDetailsTab from './EditGoalDetailsTab';
import ManageAssignmentsTab from './ManageAssignmentsTab';
import { FileText, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditGoalFlowProps {
  goal: GoalWithDetails;
  onClose: () => void;
}

// Tab Configuration
const TABS = [
  { id: 'details', label: 'Goal Details', icon: FileText },
  { id: 'assignments', label: 'Manage Assignments', icon: Users },
] as const;

const EditGoalFlow: React.FC<EditGoalFlowProps> = ({ goal, onClose }) => {
  const [activeTab, setActiveTab] = useState<typeof TABS[number]['id']>('details');
  const [key, setKey] = useState(Date.now()); // Forces re-render on updates

  const handleRefresh = () => {
    setKey(Date.now());
  };

  return (
    <DialogContent className="sm:max-w-4xl p-0 overflow-hidden flex flex-col max-h-[90vh]" key={key}>
      
      {/* 1. Header Section */}
      <DialogHeader className="p-6 pb-4 bg-white/50 backdrop-blur-sm z-20">
        <DialogTitle className="text-xl">Edit Goal: {goal.name}</DialogTitle>
        <DialogDescription>Modify the goal's core details or manage employee assignments.</DialogDescription>
        
        {/* 2. SMOOTH PILL TABS */}
        <div className="pt-6">
          <div className="flex p-1 bg-gray-100/80 rounded-full w-full sm:w-fit border border-gray-200/50">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "relative flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 text-sm font-medium rounded-full transition-colors duration-200 z-10 outline-none focus-visible:ring-2 ring-primary/20",
                    isActive ? "text-white" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  {/* The Sliding Purple Pill Background */}
                  {isActive && (
                    <motion.div
                      layoutId="active-pill"
                      className="absolute inset-0 bg-violet-600 rounded-full -z-10 shadow-sm"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  
                  {/* Icon and Label */}
                  <Icon size={16} className="relative z-10" />
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </DialogHeader>

      {/* 3. Content Area with Fade Animation */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
        <div className="max-w-3xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'details' ? (
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                   <EditGoalDetailsTab goal={goal} onClose={onClose} />
                </div>
              ) : (
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                   <ManageAssignmentsTab goal={goal} onAssignmentUpdate={handleRefresh} />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </DialogContent>
  );
};

export default EditGoalFlow;