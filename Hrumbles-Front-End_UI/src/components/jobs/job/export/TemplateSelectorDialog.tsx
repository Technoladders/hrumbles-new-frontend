import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Info, FileSpreadsheet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: { name: string; columns: any[]; is_default?: boolean }[];
  onSelect: (templateIndex: number) => void;
}

const TemplateSelectorDialog = ({ open, onOpenChange, templates, onSelect }: Props) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const togglePreview = (index: number) => {
    setPreviewIndex(previewIndex === index ? null : index);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Select Export Template
          </DialogTitle>
          <DialogDescription>
            Choose a tracker template for this client.
            <span className="block mt-1 text-amber-600 text-xs">
              💡 Tip: Set a default template in Client Settings to skip this step.
            </span>
          </DialogDescription>
        </DialogHeader>

        {/* Info banner */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 flex items-start gap-2">
          <Info size={14} className="text-indigo-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-indigo-700">
            This client has multiple export templates. Select one below or 
            <strong> set a default template</strong> in the client settings to export directly.
          </p>
        </div>

        <RadioGroup value={selected?.toString()} onValueChange={(val) => setSelected(Number(val))} className="space-y-2">
          {templates.map((t, i) => (
            <div key={i}>
              <div className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                selected === i ? 'border-violet-300 bg-violet-50' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <div className="flex items-center space-x-3 flex-1">
                  <RadioGroupItem value={i.toString()} id={`tpl-${i}`} />
                  <Label htmlFor={`tpl-${i}`} className="flex items-center gap-2 cursor-pointer">
                    <span className="font-medium text-sm">{t.name}</span>
                    {t.is_default && (
                      <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700 border-amber-200">
                        Default
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px] text-gray-500">
                      {t.columns?.filter((c: any) => c.selected).length || 0} columns
                    </Badge>
                  </Label>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={(e) => { e.stopPropagation(); togglePreview(i); }}
                  className="text-gray-400 hover:text-violet-600"
                >
                  {previewIndex === i ? <EyeOff size={14} /> : <Eye size={14} />}
                  <span className="ml-1 text-xs">Preview</span>
                </Button>
              </div>

              {/* Preview section */}
              {previewIndex === i && (
                <div className="mt-1 ml-8 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs font-medium text-gray-500 mb-2">
                    Columns in order ({t.columns?.filter((c: any) => c.selected).length || 0} selected):
                  </p>
                  <ScrollArea className="max-h-[150px] overflow-auto">
                    <div className="space-y-1">
                      {t.columns
                        ?.filter((c: any) => c.selected)
                        .map((col: any, idx: number) => (
                          <div key={col.key} className="flex items-center gap-2 text-xs text-gray-600">
                            <span className="text-gray-400 font-mono w-6">{idx + 1}.</span>
                            <span>{col.label}</span>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          ))}
        </RadioGroup>

        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-xs text-gray-400">
            {selected !== null 
              ? `${templates[selected]?.columns?.filter((c: any) => c.selected).length || 0} columns will be exported`
              : 'Select a template to continue'}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button 
              disabled={selected === null} 
              onClick={() => selected !== null && onSelect(selected)}
            >
              Export with Template
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateSelectorDialog;