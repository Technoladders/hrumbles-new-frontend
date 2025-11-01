import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DialogFooter } from '@/components/ui/dialog';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Briefcase, DollarSign, ArrowLeft } from 'lucide-react';
import { SectorType } from '@/types/goal';
import { cn } from '@/lib/utils';

interface Step1Props {
  onNext: (department: string, metric: string) => void;
  onClose: () => void;
}

const SelectionCard = ({ label, icon, onClick, isSelected, disabled = false }: { label: string; icon: React.ReactNode; onClick: () => void; isSelected: boolean; disabled?: boolean }) => (
  <motion.button
    layout
    onClick={onClick}
    disabled={disabled}
    className={cn(
      `group flex items-center justify-start border rounded-xl text-left transition-all duration-300 w-full p-4`,
      isSelected ? "border-primary bg-primary-foreground ring-2 ring-primary" : "hover:border-primary hover:bg-primary-foreground",
      disabled ? "opacity-50 cursor-not-allowed bg-gray-50" : ""
    )}
  >
    <div className={cn(`p-3 rounded-lg`, isSelected ? "bg-primary text-white" : "bg-gray-100 text-primary")}>{icon}</div>
    <div className='ml-4'>
      <h3 className="font-semibold text-lg">{label}</h3>
      {disabled && <p className="text-xs text-gray-500">Coming soon</p>}
    </div>
  </motion.button>
);

const Step1_SelectDepartmentAndMetric: React.FC<Step1Props> = ({ onNext, onClose }) => {
  const [selectedDepartment, setSelectedDepartment] = useState<SectorType | ''>('');
  const [selectedMetric, setSelectedMetric] = useState<'performance' | 'revenue' | ''>('');

  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: async () => (await supabase.from('hr_departments').select('id, name')).data || [] });

  const handleDepartmentSelect = (dept: SectorType) => {
    setSelectedDepartment(dept);
    setSelectedMetric(''); // Reset metric on department change
  };

  return (
    <LayoutGroup>
      <div className="space-y-8">
        {!selectedDepartment ? (
          <div>
            <Label className="font-semibold text-lg">1. Select Department</Label>
            <AnimatePresence>
              <motion.div layout className="space-y-3 mt-4">
                {departments.map((d) => (
                  <SelectionCard
                    key={d.id}
                    label={d.name}
                    icon={<Briefcase size={20} />}
                    isSelected={false}
                    disabled={d.name !== 'Human Resource'}
                    onClick={() => handleDepartmentSelect(d.name as SectorType)}
                  />
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        ) : (
          <div>
            <motion.div layoutId="department-selection" className="flex items-center justify-between pb-4 border-b">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-primary text-white"><Briefcase size={20} /></div>
                <h3 className="font-semibold text-lg ml-4">{selectedDepartment}</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedDepartment('')}>
                <ArrowLeft size={16} className="mr-2"/> Change Department
              </Button>
            </motion.div>

            <AnimatePresence>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mt-6"
              >
                <Label className="font-semibold text-lg">2. Select Performance Metric</Label>
                <div className="space-y-3 mt-4">
                  <SelectionCard label="Performance by Recruiter" icon={<Briefcase size={20} />} isSelected={selectedMetric === 'performance'} onClick={() => setSelectedMetric('performance')} />
                  <SelectionCard label="Revenue by Recruiter" icon={<DollarSign size={20} />} isSelected={false} onClick={() => {}} disabled />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>

      <DialogFooter className="pt-8">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onNext(selectedDepartment, selectedMetric)} disabled={!selectedDepartment || (selectedDepartment === 'Human Resource' && !selectedMetric)}>Next</Button>
      </DialogFooter>
    </LayoutGroup>
  );
};

export default Step1_SelectDepartmentAndMetric;