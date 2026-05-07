import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import { Candidate } from "@/lib/types";
import { GripVertical, FileSpreadsheet } from "lucide-react";

interface CSVExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidates: Candidate[];
  jobTitle?: string;
}

interface ColumnConfig {
  key: string;
  label: string;
  selected: boolean;
  getValue: (candidate: any) => string;
}

const CSVExportDialog = ({ open, onOpenChange, candidates, jobTitle }: CSVExportDialogProps) => {
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { key: 'name', label: 'Candidate Name', selected: true, getValue: (c) => c.name || '' },
    { key: 'email', label: 'Email', selected: true, getValue: (c) => c.email || '' },
    { key: 'phone', label: 'Phone', selected: true, getValue: (c) => c.phone || '' },
    { key: 'experience', label: 'Total Experience', selected: true, getValue: (c) => c.experience || '' },
    { key: 'currentSalary', label: 'Current CTC (LPA)', selected: true, getValue: (c) => {
      const salary = c.currentSalary || c.current_salary;
      return salary ? (parseFloat(salary) / 100000).toFixed(2) : '';
    }},
    { key: 'expectedSalary', label: 'Expected CTC (LPA)', selected: true, getValue: (c) => {
      const salary = c.expectedSalary || c.expected_salary;
      return salary ? (parseFloat(salary) / 100000).toFixed(2) : '';
    }},
    { key: 'noticePeriod', label: 'Notice Period', selected: true, getValue: (c) => c.notice_period || c.metadata?.noticePeriod || '' },
    { key: 'location', label: 'Location', selected: true, getValue: (c) => c.location || c.metadata?.currentLocation || '' },
    { key: 'status', label: 'Status', selected: true, getValue: (c) => c.main_status?.name || c.status || '' },
    { key: 'subStatus', label: 'Sub Status', selected: true, getValue: (c) => c.sub_status?.name || '' },
    { 
      key: 'skills', 
      label: 'Skills', 
      selected: true, 
      getValue: (c) => {
        // Candidate's own skills - always strings
        const candidateSkills = c.skills;
        if (candidateSkills && Array.isArray(candidateSkills)) {
          // Filter only string skills (candidate's skills are strings)
          const stringSkills = candidateSkills.filter((s: any) => typeof s === 'string');
          if (stringSkills.length > 0) {
            return stringSkills.join(', ');
          }
        }
        return '';
      }
    },
    { 
      key: 'skillRatings', 
      label: 'Job Skills Matrix (Name - Rating/5 - Experience)', 
      selected: false, 
      getValue: (c) => {
        // Job skills matrix with ratings - objects with name, rating, experienceYears, experienceMonths
        const ratings = c.skill_ratings || c.skillRatings;
        if (ratings && Array.isArray(ratings) && ratings.length > 0) {
          return ratings.map((s: any) => {
            // Check if it's an object with name property (skill matrix)
            if (s && typeof s === 'object' && s.name) {
              const name = s.name || '';
              const rating = s.rating || '';
              const years = s.experienceYears || 0;
              const months = s.experienceMonths || 0;
              const exp = (years > 0 || months > 0) ? ` (${years}y ${months}m)` : '';
              return `${name} - ${rating}/5${exp}`;
            }
            // If it's a string, just return it
            if (typeof s === 'string') return s;
            return '';
          }).filter(Boolean).join(' | ');
        }
        return '';
      }
    },
    { key: 'appliedDate', label: 'Applied Date', selected: true, getValue: (c) => c.appliedDate || c.applied_date || '' },
    { key: 'owner', label: 'Owner', selected: true, getValue: (c) => {
      // Get owner name from various possible sources
      if (c.hr_employees?.first_name) {
        return `${c.hr_employees.first_name} ${c.hr_employees.last_name || ''}`.trim();
      }
      return c.owner || c.appliedFrom || '';
    }},
    { 
      key: 'aiScore', 
      label: 'AI Score', 
      selected: false, 
      getValue: (c) => {
        // AI Score comes from candidateAnalysisData which is merged into candidate object
        // Check multiple possible locations for the score
        const score = c.overall_score || c.overallScore || c.aiScore;
        if (score !== null && score !== undefined) {
          return score.toString();
        }
        return '';
      }
    },
    { key: 'linkedin', label: 'LinkedIn', selected: false, getValue: (c) => c.linkedin_url || c.linkedin || c.metadata?.linkedInId || '' },
    { key: 'interviewDate', label: 'Interview Date', selected: false, getValue: (c) => c.interview_date || '' },
    { key: 'joiningDate', label: 'Joining Date', selected: false, getValue: (c) => c.joining_date || '' },
    { 
      key: 'rejectionReason', 
      label: 'Rejection Reason', 
      selected: false, 
      getValue: (c) => c.reject_reason || c.rejection_reason || '' 
    },
  ]);

  const [reorderIndex, setReorderIndex] = useState<number | null>(null);

  const handleColumnToggle = (index: number) => {
    setColumns(prev => 
      prev.map((col, i) => 
        i === index ? { ...col, selected: !col.selected } : col
      )
    );
  };

  const handleSelectAll = () => {
    setColumns(prev => prev.map(col => ({ ...col, selected: true })));
  };

  const handleDeselectAll = () => {
    setColumns(prev => prev.map(col => ({ ...col, selected: false })));
  };

  const handleDragStart = (index: number) => {
    setReorderIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (reorderIndex === null || reorderIndex === index) return;

    setColumns(prev => {
      const newColumns = [...prev];
      const [removed] = newColumns.splice(reorderIndex, 1);
      newColumns.splice(index, 0, removed);
      return newColumns;
    });
    setReorderIndex(index);
  };

  const handleDragEnd = () => {
    setReorderIndex(null);
  };

  const selectedColumns = useMemo(() => 
    columns.filter(col => col.selected), 
    [columns]
  );

  const handleExport = () => {
    if (selectedColumns.length === 0) {
      toast.error("Please select at least one column to export");
      return;
    }

    if (candidates.length === 0) {
      toast.error("No candidates to export");
      return;
    }

    try {
      // Prepare data for export
      const exportData = candidates.map(candidate => {
        const row: Record<string, string> = {};
        selectedColumns.forEach(col => {
          row[col.label] = col.getValue(candidate);
        });
        return row;
      });

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Auto-adjust column widths
      const maxWidth = 50;
      const colWidths = selectedColumns.map(col => {
        const maxLen = Math.max(
          col.label.length,
          ...candidates.map(c => Math.min((col.getValue(c) || '').toString().length, maxWidth))
        );
        return { wch: Math.min(maxLen + 2, maxWidth) };
      });
      ws['!cols'] = colWidths;

      // Generate filename: job_name_candidates_count_YYYYMMDD
      const sanitizedJobTitle = (jobTitle || 'job').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').substring(0, 50);
      const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const filename = `${sanitizedJobTitle}_candidates_${candidates.length}_${timestamp}.csv`;

      // Download file as CSV
      const csvContent = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Successfully exported ${candidates.length} candidates`);
      onOpenChange(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Failed to export candidates");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Export Candidates to CSV
          </DialogTitle>
          <DialogDescription>
            Select columns and arrange their order for export. Drag to reorder. {candidates.length} candidate{candidates.length !== 1 ? 's' : ''} will be exported.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Columns to Export:</span>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSelectAll}
                className="text-xs h-7"
              >
                Select All
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDeselectAll}
                className="text-xs h-7"
              >
                Deselect All
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[350px] pr-4">
            <div className="space-y-2">
              {columns.map((column, index) => (
                <div
                  key={column.key}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                    reorderIndex === index 
                      ? 'border-primary bg-primary/5 shadow-sm' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <Checkbox
                    id={`col-${column.key}`}
                    checked={column.selected}
                    onCheckedChange={() => handleColumnToggle(index)}
                  />
                  <Label
                    htmlFor={`col-${column.key}`}
                    className="flex-1 cursor-pointer text-sm font-normal select-none"
                  >
                    {column.label}
                  </Label>
                  <span className="text-xs text-gray-400 font-mono">#{index + 1}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-500">
            {selectedColumns.length} column{selectedColumns.length !== 1 ? 's' : ''} selected
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} size="sm">
              Cancel
            </Button>
            <Button onClick={handleExport} className="gap-2" size="sm">
              <FileSpreadsheet className="h-4 w-4" />
              Export CSV ({candidates.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CSVExportDialog;