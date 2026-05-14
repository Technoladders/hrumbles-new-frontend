import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { GripVertical, Info, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface ColumnItem {
  key: string;
  label: string;
  selected: boolean;
}

export const ALL_COLUMNS: ColumnItem[] = [
  { key: "name", label: "Candidate Name", selected: true },
  { key: "email", label: "Email", selected: true },
  { key: "phone", label: "Phone", selected: true },
  { key: "experience", label: "Total Experience", selected: true },
  { key: "currentSalary", label: "Current CTC", selected: true },
  { key: "expectedSalary", label: "Expected CTC", selected: true },
  { key: "noticePeriod", label: "Notice Period", selected: true },
  { key: "location", label: "Location", selected: true },
  { key: "status", label: "Status", selected: true },
  { key: "subStatus", label: "Sub Status", selected: true },
  { key: "skills", label: "Skills", selected: true },
  { key: "skillRatings", label: "Job Skills Matrix", selected: false },
  { key: "appliedDate", label: "Applied Date", selected: true },
  { key: "owner", label: "Owner", selected: true },
  { key: "aiScore", label: "AI Score", selected: false },
  { key: "linkedin", label: "LinkedIn", selected: false },
  { key: "interviewDate", label: "Interview Date", selected: false },
  { key: "joiningDate", label: "Joining Date", selected: false },
  { key: "rejectionReason", label: "Rejection Reason", selected: false },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialColumns: ColumnItem[];
  initialTemplateName?: string;
  initialIsDefault?: boolean; // ADD THIS
  onSave: (name: string, columns: ColumnItem[], isDefault?: boolean) => void; // UPDATED
}

const TemplateEditorDialog = ({ open, onOpenChange, initialColumns, initialTemplateName = "", initialIsDefault = false, onSave }: Props) => {
  const [templateName, setTemplateName] = useState(initialTemplateName);
  const [columns, setColumns] = useState<ColumnItem[]>(initialColumns);
  const [reorderIndex, setReorderIndex] = useState<number | null>(null);
  const [setAsDefault, setSetAsDefault] = useState(initialIsDefault);

  const handleToggle = (index: number) => {
    setColumns(prev => prev.map((col, i) => (i === index ? { ...col, selected: !col.selected } : col)));
  };

  const handleDragStart = (index: number) => setReorderIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (reorderIndex === null || reorderIndex === index) return;
    setColumns(prev => {
      const newCols = [...prev];
      const [moved] = newCols.splice(reorderIndex, 1);
      newCols.splice(index, 0, moved);
      return newCols;
    });
    setReorderIndex(index);
  };
  const handleDragEnd = () => setReorderIndex(null);

const handleSave = () => {
  if (!templateName.trim()) {
    toast.error("Template name is required");
    return;
  }
  onSave(templateName.trim(), columns, setAsDefault);
  onOpenChange(false);
};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{initialTemplateName ? "Edit Template" : "New Template"}</DialogTitle>
          <DialogDescription>Select columns and drag to reorder.</DialogDescription>
          {/* Add this info box */}
<div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
  <Info size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
  <div className="text-xs text-blue-700">
    <p className="font-medium mb-1">How templates work:</p>
    <ul className="list-disc list-inside space-y-0.5 text-blue-600">
      <li>Checked columns will appear in the export</li>
      <li>Drag columns to set their order in the exported file</li>
      <li>Set a template as <strong>default</strong> to skip selection during export</li>
      <li>If no default is set, you'll be asked to choose a template at export time</li>
    </ul>
  </div>
</div>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Template Name</Label>
            <Input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="e.g. Standard Export" />
          </div>
          <ScrollArea className="h-[350px] pr-2">
            {columns.map((col, idx) => (
              <div key={col.key}
                className={`flex items-center gap-3 p-2.5 rounded-lg border mb-2 ${reorderIndex === idx ? "border-primary bg-primary/5" : "border-gray-200"}`}
                draggable onDragStart={() => handleDragStart(idx)} onDragOver={(e) => handleDragOver(e, idx)} onDragEnd={handleDragEnd}
              >
                <div className="cursor-grab text-gray-400"><GripVertical size={14} /></div>
                <Checkbox checked={col.selected} onCheckedChange={() => handleToggle(idx)} />
                <Label className="flex-1 text-sm">{col.label}</Label>
                <span className="text-xs text-gray-400">#{idx + 1}</span>
              </div>
            ))}
          </ScrollArea>
        </div>
        {/* Add a "Set as default" checkbox in the editor if creating new template */}
<div className="flex items-center gap-2">
  <Checkbox 
    id="set-default" 
    checked={setAsDefault} 
    onCheckedChange={(checked) => setSetAsDefault(!!checked)} 
  />
  <Label htmlFor="set-default" className="text-sm text-gray-600">
    Set as default template 
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle size={12} className="inline ml-1 text-gray-400 cursor-help" />
        </TooltipTrigger>
        <TooltipContent className="text-xs max-w-[200px]">
          Default templates are applied automatically when exporting candidates from jobs for this client.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </Label>
</div>
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Template</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateEditorDialog;