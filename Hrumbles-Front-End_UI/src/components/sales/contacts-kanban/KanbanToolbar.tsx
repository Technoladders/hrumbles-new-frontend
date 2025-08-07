import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import type { Workspace } from '@/hooks/sales/useWorkspaces'; // Import the type

interface KanbanToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  sortOption: string;
  onSortChange: (value: string) => void;
  // New props for workspace filtering
  workspaces: Workspace[];
  selectedWorkspaceId: string;
  onWorkspaceChange: (workspaceId: string) => void;
}

export const KanbanToolbar: React.FC<KanbanToolbarProps> = ({
  searchTerm, onSearchChange,
  sortOption, onSortChange,
  workspaces, selectedWorkspaceId, onWorkspaceChange
}) => {
  return (
    // The toolbar uses flex to align its items
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="relative w-full sm:w-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search hello contacts..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 w-full sm:w-64"
        />
        {/* <Select value={selectedWorkspaceId} onValueChange={onWorkspaceChange}>
          <SelectTrigger className="w-full flex-1 sm:w-[200px]">
            <SelectValue placeholder="Select a Workspace" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Contacts</SelectItem>
            <SelectItem value="unassigned">Unassigned Contacts</SelectItem>
            {workspaces.map(ws => (
              <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
            ))}
          </SelectContent>
        </Select> */}
      </div>
      <div className="flex items-center space-x-2 w-full sm:w-auto">
        {/* Workspace Selector */}
        

        {/* Sort Selector */}
        <Select value={sortOption} onValueChange={onSortChange}>
          <SelectTrigger className="w-full flex-1 sm:w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at_desc">Recently Created</SelectItem>
            <SelectItem value="updated_at_desc">Recently Updated</SelectItem>
            <SelectItem value="name_asc">Name (A-Z)</SelectItem>
            <SelectItem value="name_desc">Name (Z-A)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};