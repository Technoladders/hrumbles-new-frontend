import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWorkspaces, Workspace } from '@/hooks/sales/useWorkspaces';
import { useWorkspaceFiles, WorkspaceFile } from '@/hooks/sales/useWorkspaceFiles';
import { useMoveContactsToFile } from '@/hooks/sales/useMoveContactsToFile';

interface MoveContactsToolbarProps {
  selectedContactIds: string[];
  onMoveComplete: () => void;
}

export const MoveContactsToolbar: React.FC<MoveContactsToolbarProps> = ({ selectedContactIds, onMoveComplete }) => {
  const { data: workspaces = [], isLoading: isLoadingWorkspaces } = useWorkspaces();
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const { data: files = [], isLoading: isLoadingFiles } = useWorkspaceFiles(selectedWorkspaceId);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  const moveContactsMutation = useMoveContactsToFile();

  const handleMove = () => {
    if (!selectedFileId || selectedContactIds.length === 0) return;
    moveContactsMutation.mutate(
      { contactIds: selectedContactIds, targetFileId: selectedFileId },
      {
        onSuccess: () => {
          onMoveComplete(); // This will clear the selection in the parent component
        }
      }
    );
  };

  return (
    <div className="flex items-center gap-4 p-3 bg-gray-100 border rounded-lg">
      <p className="text-sm font-semibold text-gray-700">
        {selectedContactIds.length} contact(s) selected
      </p>
      <div className="flex items-center gap-2">
        <Select onValueChange={setSelectedWorkspaceId} disabled={isLoadingWorkspaces}>
          <SelectTrigger className="w-[180px] bg-white">
            <SelectValue placeholder="Select a Workspace..." />
          </SelectTrigger>
          <SelectContent>
            {workspaces.map((ws) => (
              <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select onValueChange={setSelectedFileId} disabled={!selectedWorkspaceId || isLoadingFiles}>
          <SelectTrigger className="w-[180px] bg-white">
            <SelectValue placeholder="Select a File..." />
          </SelectTrigger>
          <SelectContent>
            {files.map((file) => (
              <SelectItem key={file.id} value={file.id}>{file.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button 
        onClick={handleMove}
        disabled={!selectedFileId || moveContactsMutation.isPending}
        size="sm"
        className="bg-purple-600 hover:bg-purple-700"
      >
        {moveContactsMutation.isPending ? 'Moving...' : 'Move to File'}
      </Button>
    </div>
  );
};