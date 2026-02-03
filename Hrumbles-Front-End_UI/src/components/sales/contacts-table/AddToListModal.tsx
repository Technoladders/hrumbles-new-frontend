// src/components/sales/contacts-table/AddToListModal.tsx
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';
import { Badge } from '@/components/ui/badge';
import { UserPlus, FolderPlus, ListPlus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddToListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (fileId: string) => void;
  personName: string;
  isFromDiscovery?: boolean;
}

export const AddToListModal = ({ 
  open, 
  onOpenChange, 
  onConfirm, 
  personName,
  isFromDiscovery = false 
}: AddToListModalProps) => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const [ws, setWs] = useState('');
  const [file, setFile] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: workspaces, isLoading: loadingWorkspaces } = useQuery({
    queryKey: ['workspaces-list', organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspaces')
        .select('id, name')
        .eq('organization_id', organization_id)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: open && !!organization_id
  });

  const { data: files, isLoading: loadingFiles } = useQuery({
    queryKey: ['workspace-files-list', ws],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_files')
        .select('id, name')
        .eq('workspace_id', ws)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!ws
  });

  const handleConfirm = async () => {
    if (!file) return;
    setIsSubmitting(true);
    try {
      await onConfirm(file);
    } finally {
      setIsSubmitting(false);
      setWs('');
      setFile('');
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setWs('');
      setFile('');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-black">
            {isFromDiscovery ? (
              <>
                <UserPlus className="h-5 w-5 text-indigo-600" />
                Save & Add to List
              </>
            ) : (
              <>
                <ListPlus className="h-5 w-5 text-indigo-600" />
                Add to List
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isFromDiscovery ? (
              <span>
                Save <span className="font-semibold text-slate-700">{personName}</span> to your CRM and add them to a list.
              </span>
            ) : (
              <span>
                Add <span className="font-semibold text-slate-700">{personName}</span> to a list for organization.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {isFromDiscovery && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-2">
            <div className="flex items-start gap-2">
              <Badge className="bg-indigo-600 text-white text-[9px] h-5 px-2 mt-0.5">
                NEW
              </Badge>
              <div className="text-xs text-indigo-800">
                This contact will be saved to your CRM and added to the selected list simultaneously.
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1.5">
              <FolderPlus size={12} />
              Target Workspace
            </Label>
            <Select 
              value={ws} 
              onValueChange={(value) => {
                setWs(value);
                setFile(''); // Reset file when workspace changes
              }}
            >
              <SelectTrigger className={cn(
                "h-10",
                loadingWorkspaces && "animate-pulse"
              )}>
                <SelectValue placeholder={loadingWorkspaces ? "Loading..." : "Select Workspace"} />
              </SelectTrigger>
              <SelectContent>
                {workspaces?.map(w => (
                  <SelectItem key={w.id} value={w.id} className="text-sm">
                    {w.name}
                  </SelectItem>
                ))}
                {workspaces?.length === 0 && (
                  <div className="p-2 text-xs text-slate-500 text-center">
                    No workspaces found
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1.5">
              <ListPlus size={12} />
              Target List
            </Label>
            <Select 
              value={file} 
              onValueChange={setFile} 
              disabled={!ws}
            >
              <SelectTrigger className={cn(
                "h-10",
                !ws && "opacity-50 cursor-not-allowed",
                loadingFiles && "animate-pulse"
              )}>
                <SelectValue placeholder={
                  !ws 
                    ? "Select a workspace first" 
                    : loadingFiles 
                      ? "Loading..." 
                      : "Select List"
                } />
              </SelectTrigger>
              <SelectContent>
                {files?.map(f => (
                  <SelectItem key={f.id} value={f.id} className="text-sm">
                    {f.name}
                  </SelectItem>
                ))}
                {files?.length === 0 && (
                  <div className="p-2 text-xs text-slate-500 text-center">
                    No lists found in this workspace
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="ghost" 
            onClick={() => handleClose(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!file || isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isFromDiscovery ? 'Saving...' : 'Adding...'}
              </>
            ) : (
              <>
                {isFromDiscovery ? (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Save & Add
                  </>
                ) : (
                  <>
                    <ListPlus className="h-4 w-4 mr-2" />
                    Add to List
                  </>
                )}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};