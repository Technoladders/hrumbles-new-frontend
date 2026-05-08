import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import { GripVertical, FileSpreadsheet } from "lucide-react";

interface CSVExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidates: any[];
  jobTitle?: string;
}

interface ColumnConfig {
  key: string;
  label: string;
  selected: boolean;
  getValue: (candidate: any) => string;
}

// Helper to format phone number as plain text (no = sign)
const formatPhoneForCSV = (phone: string | undefined): string => {
  if (!phone) return '';
  // Just return the phone number as-is, no special formatting
  return phone;
};

// Helper to format salary with Indian number formatting (e.g., 5,00,000)
const formatSalaryForCSV = (salary: any): string => {
  if (!salary && salary !== 0) return '';
  const num = typeof salary === 'string' ? parseFloat(salary.replace(/[^0-9.]/g, '')) : salary;
  if (isNaN(num) || num === 0) return '';
  
  // Format with Indian numbering system (e.g., 5,00,000)
  return num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

// Helper to format date
const formatDateForCSV = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

const CSVExportDialog = ({ open, onOpenChange, candidates, jobTitle }: CSVExportDialogProps) => {

console.log('candidates:', candidates);

  const [columns, setColumns] = useState<ColumnConfig[]>([
    { key: 'name', label: 'Candidate Name', selected: true, getValue: (c) => c.name || '' },
    { key: 'email', label: 'Email', selected: true, getValue: (c) => c.email || '' },
    { key: 'phone', label: 'Phone', selected: true, getValue: (c) => formatPhoneForCSV(c.phone) },
    { key: 'experience', label: 'Total Experience', selected: true, getValue: (c) => c.experience || '' },
    { key: 'currentSalary', label: 'Current CTC', selected: true, getValue: (c) => {
      const salary = c.currentSalary || c.current_salary;
      return formatSalaryForCSV(salary);
    }},
    { key: 'expectedSalary', label: 'Expected CTC', selected: true, getValue: (c) => {
      const salary = c.expectedSalary || c.expected_salary;
      return formatSalaryForCSV(salary);
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
    // Use original skills from candidatesData (string array)
    if (c.skills && Array.isArray(c.skills) && c.skills.length > 0) {
      const stringSkills = c.skills.filter((s: any) => typeof s === 'string');
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
        const ratings = c.skill_ratings || c.skillRatings;
        if (ratings && Array.isArray(ratings) && ratings.length > 0) {
          return ratings.map((s: any) => {
            if (s && typeof s === 'object' && s.name) {
              const name = s.name || '';
              const rating = s.rating !== undefined && s.rating !== null ? s.rating : '';
              const years = s.experienceYears || 0;
              const months = s.experienceMonths || 0;
              const exp = (years > 0 || months > 0) ? ` (${years}y ${months}m)` : '';
              return `${name} - ${rating}/5${exp}`;
            }
            if (typeof s === 'string') return s;
            return '';
          }).filter(Boolean).join(' | ');
        }
        return '';
      }
    },
    { key: 'appliedDate', label: 'Applied Date', selected: true, getValue: (c) => formatDateForCSV(c.appliedDate || c.applied_date) },
    { key: 'owner', label: 'Owner', selected: true, getValue: (c) => {
      if (c.hr_employees?.first_name) {
        return `${c.hr_employees.first_name} ${c.hr_employees.last_name || ''}`.trim();
      }
      return c.owner || c.appliedFrom || c.applied_from || '';
    }},
    { 
      key: 'aiScore', 
      label: 'AI Score', 
      selected: false, 
      getValue: (c) => {
        const score = c.overall_score ?? c.overallScore ?? c.aiScore ?? c.ai_score;
        if (score !== null && score !== undefined && score !== 0) {
          return score.toString();
        }
        return '';
      }
    },
    { key: 'linkedin', label: 'LinkedIn', selected: false, getValue: (c) => c.linkedin_url || c.linkedin || c.metadata?.linkedInId || '' },
    { key: 'interviewDate', label: 'Interview Date', selected: false, getValue: (c) => formatDateForCSV(c.interview_date) },
    { key: 'joiningDate', label: 'Joining Date', selected: false, getValue: (c) => formatDateForCSV(c.joining_date) },
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

    if (!candidates || candidates.length === 0) {
      toast.error("No candidates to export");
      return;
    }

    try {
      // Prepare raw data for export (without formula wrapping)
      const exportData = candidates.map(candidate => {
        const row: Record<string, string> = {};
        selectedColumns.forEach(col => {
          let value = col.getValue(candidate);
          
          // Remove any ="" wrapping that might cause issues
          if (value.startsWith('="') && value.endsWith('"')) {
            value = value.slice(2, -1);
          }
          
          row[col.label] = value;
        });
        return row;
      });

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Candidates");

      // Auto-adjust column widths based on content
      const colWidths = selectedColumns.map(col => {
        const headerLen = col.label.length;
        const maxContentLen = Math.max(
          ...candidates.map(c => {
            let val = col.getValue(c) || '';
            // Remove formula wrapping for length calculation
            if (val.startsWith('="') && val.endsWith('"')) {
              val = val.slice(2, -1);
            }
            return Math.min(val.length, 60);
          }),
          0
        );
        const maxLen = Math.max(headerLen, maxContentLen);
        return { wch: Math.min(maxLen + 3, 60) };
      });
      ws['!cols'] = colWidths;

      // Set all cells to text format to prevent Excel from auto-formatting
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cellAddress]) continue;
          // Force text format for all cells
          ws[cellAddress].z = '@';
        }
      }

      // Generate filename using job title
      const sanitizedTitle = (jobTitle || 'candidates')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '_')
        .replace(/-+/g, '_')
        .substring(0, 40);
      
      const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const filename = `${sanitizedTitle}_${candidates.length}_${timestamp}.xlsx`;

      // Export as Excel (XLSX)
      XLSX.writeFile(wb, filename);

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
            Export Candidates
          </DialogTitle>
          <DialogDescription>
            Select columns and arrange their order. Drag to reorder. {candidates?.length || 0} candidate{(candidates?.length || 0) !== 1 ? 's' : ''} will be exported.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Columns to Export:</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll} className="text-xs h-7">Select All</Button>
              <Button variant="outline" size="sm" onClick={handleDeselectAll} className="text-xs h-7">Deselect All</Button>
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
                  <Label htmlFor={`col-${column.key}`} className="flex-1 cursor-pointer text-sm font-normal select-none">
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
            <Button variant="outline" onClick={() => onOpenChange(false)} size="sm">Cancel</Button>
            <Button onClick={handleExport} className="gap-2" size="sm">
              <FileSpreadsheet className="h-4 w-4" />
              Export ({candidates?.length || 0})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CSVExportDialog;