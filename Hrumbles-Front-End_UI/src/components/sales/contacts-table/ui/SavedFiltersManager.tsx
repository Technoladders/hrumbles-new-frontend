// src/components/sales/contacts-table/SavedFiltersManager.tsx
// Save and load filter presets

import React, { useState } from 'react';
import { Save, Loader2, Check, Trash2, Star, Users, Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table } from '@tanstack/react-table';
import { useToast } from '@/hooks/use-toast';
import { useSavedFilters } from '@/hooks/sales/useSavedFilters';

interface SavedFiltersManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: Table<any>;
}

export function SavedFiltersManager({ 
  open, 
  onOpenChange, 
  table 
}: SavedFiltersManagerProps) {
  const { toast } = useToast();
  const [mode, setMode] = useState<'save' | 'load'>('save');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isDefault, setIsDefault] = useState(false);

  const { 
    savedFilters, 
    isLoading, 
    saveFilter, 
    loadFilter, 
    deleteFilter,
    isSaving 
  } = useSavedFilters();

  const activeFilters = table.getState().columnFilters;
  const hasActiveFilters = activeFilters.length > 0;

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for this filter.",
        variant: "destructive",
      });
      return;
    }

    if (!hasActiveFilters) {
      toast({
        title: "No filters active",
        description: "Apply some filters before saving.",
        variant: "destructive",
      });
      return;
    }

    try {
      await saveFilter({
        name: name.trim(),
        description: description.trim() || undefined,
        filterConfig: activeFilters,
        isPublic,
        isDefault,
      });

      toast({
        title: "Filter saved",
        description: `"${name}" has been saved successfully.`,
      });

      // Reset form
      setName('');
      setDescription('');
      setIsPublic(false);
      setIsDefault(false);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Failed to save",
        description: "Could not save filter. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLoad = (filterId: string) => {
    try {
      loadFilter(filterId, table);
      toast({
        title: "Filter loaded",
        description: "Filters have been applied.",
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Failed to load",
        description: "Could not load filter. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (filterId: string, filterName: string) => {
    if (!confirm(`Delete "${filterName}"?`)) return;

    try {
      await deleteFilter(filterId);
      toast({
        title: "Filter deleted",
        description: `"${filterName}" has been deleted.`,
      });
    } catch (error) {
      toast({
        title: "Failed to delete",
        description: "Could not delete filter. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5 text-blue-600" />
            Saved Filters
          </DialogTitle>
          <DialogDescription>
            Save current filters as a preset or load a previously saved filter.
          </DialogDescription>
        </DialogHeader>

        {/* Mode Toggle */}
        <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
          <Button
            variant={mode === 'save' ? 'default' : 'ghost'}
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={() => setMode('save')}
          >
            <Save className="h-3.5 w-3.5 mr-2" />
            Save Current
          </Button>
          <Button
            variant={mode === 'load' ? 'default' : 'ghost'}
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={() => setMode('load')}
          >
            Load Saved ({savedFilters?.length || 0})
          </Button>
        </div>

        {/* SAVE MODE */}
        {mode === 'save' && (
          <div className="space-y-4">
            {/* Active Filters Preview */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-xs font-semibold text-blue-900 mb-2">
                Current Filters ({activeFilters.length})
              </div>
              {hasActiveFilters ? (
                <div className="flex flex-wrap gap-1">
                  {activeFilters.map((filter) => (
                    <Badge key={filter.id} className="bg-blue-600 text-white text-[10px] h-5">
                      {filter.id}: {Array.isArray(filter.value) ? `${filter.value.length} items` : 'active'}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-blue-600">No active filters. Apply filters before saving.</p>
              )}
            </div>

            {/* Name Input */}
            <div className="space-y-2">
              <Label htmlFor="filter-name" className="text-xs font-semibold">
                Filter Name *
              </Label>
              <Input
                id="filter-name"
                placeholder="e.g., Hot Leads, VIP Contacts, Q1 Pipeline..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            {/* Description Input */}
            <div className="space-y-2">
              <Label htmlFor="filter-description" className="text-xs font-semibold">
                Description (Optional)
              </Label>
              <Textarea
                id="filter-description"
                placeholder="Describe when to use this filter..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-20 text-sm resize-none"
              />
            </div>

            {/* Options */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-500" />
                  <Label htmlFor="public-switch" className="text-xs font-semibold cursor-pointer">
                    Share with team
                  </Label>
                </div>
                <Switch
                  id="public-switch"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
              </div>
              <p className="text-[11px] text-slate-500 ml-6">
                Other team members can view and use this filter
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" />
                  <Label htmlFor="default-switch" className="text-xs font-semibold cursor-pointer">
                    Set as default
                  </Label>
                </div>
                <Switch
                  id="default-switch"
                  checked={isDefault}
                  onCheckedChange={setIsDefault}
                />
              </div>
              <p className="text-[11px] text-slate-500 ml-6">
                Automatically apply this filter when opening the page
              </p>
            </div>
          </div>
        )}

        {/* LOAD MODE */}
        {mode === 'load' && (
          <div className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : savedFilters && savedFilters.length > 0 ? (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {savedFilters.map((filter) => (
                    <div
                      key={filter.id}
                      className="border border-slate-200 rounded-lg p-3 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-semibold text-slate-900 truncate">
                              {filter.name}
                            </h4>
                            {filter.is_default && (
                              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                            )}
                            {filter.is_public ? (
                              <Users className="h-3.5 w-3.5 text-blue-500" />
                            ) : (
                              <Lock className="h-3.5 w-3.5 text-slate-400" />
                            )}
                          </div>
                          {filter.description && (
                            <p className="text-xs text-slate-600 mb-2">
                              {filter.description}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1">
                            {(filter.filter_config as any[]).slice(0, 5).map((f, idx) => (
                              <Badge key={idx} variant="secondary" className="text-[9px] h-4">
                                {f.id}
                              </Badge>
                            ))}
                            {(filter.filter_config as any[]).length > 5 && (
                              <Badge variant="secondary" className="text-[9px] h-4">
                                +{(filter.filter_config as any[]).length - 5} more
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="default"
                            size="sm"
                            className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700"
                            onClick={() => handleLoad(filter.id)}
                          >
                            Load
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(filter.id, filter.name)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Save className="h-12 w-12 text-slate-300 mb-3" />
                <p className="text-sm text-slate-600 font-medium">No saved filters yet</p>
                <p className="text-xs text-slate-500 mt-1">
                  Apply some filters and save them for quick access
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 h-8 text-xs"
                  onClick={() => setMode('save')}
                >
                  Save Current Filters
                </Button>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-9 text-sm"
          >
            Cancel
          </Button>
          {mode === 'save' && (
            <Button
              onClick={handleSave}
              disabled={!hasActiveFilters || !name.trim() || isSaving}
              className="h-9 text-sm bg-blue-600 hover:bg-blue-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Filter
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}