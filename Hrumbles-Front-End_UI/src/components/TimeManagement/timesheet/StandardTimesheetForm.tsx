
import React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash } from "lucide-react";
import { DetailedTimesheetEntry } from '@/types/time-tracker-types';

interface StandardTimesheetFormProps {
  detailedEntries: DetailedTimesheetEntry[];
  setDetailedEntries: React.Dispatch<React.SetStateAction<DetailedTimesheetEntry[]>>;
  totalWorkingHours: number;
}

export const StandardTimesheetForm: React.FC<StandardTimesheetFormProps> = ({
  detailedEntries,
  setDetailedEntries,
  totalWorkingHours
}) => {
  const totalDetailedHours = detailedEntries.reduce((sum, entry) => sum + entry.hours, 0);
  
  const handleAddEntry = () => {
    setDetailedEntries([...detailedEntries, { title: '', hours: 0, description: '' }]);
  };
  
  const handleRemoveEntry = (index: number) => {
    const newEntries = [...detailedEntries];
    newEntries.splice(index, 1);
    setDetailedEntries(newEntries);
  };
  
  const handleEntryChange = (index: number, field: string, value: string | number) => {
    const newEntries = [...detailedEntries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setDetailedEntries(newEntries);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label className="text-base font-medium">Detailed Time Entries (Optional)</Label>
        <div className="text-sm">
          Total Hours: 
          <span 
            className={totalDetailedHours > totalWorkingHours ? "text-red-500 ml-1 font-medium" : "ml-1 font-medium"}
          >
            {totalDetailedHours} / {totalWorkingHours}
          </span>
        </div>
      </div>
      
      {detailedEntries.map((entry, index) => (
        <div key={index} className="border rounded-md p-4 space-y-3">
          <div className="flex justify-between">
            <h4 className="font-medium">Entry #{index + 1}</h4>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => handleRemoveEntry(index)}
              className="h-8 px-2 text-red-500"
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`title-${index}`}>Title</Label>
              <Input
                id={`title-${index}`}
                value={entry.title}
                onChange={(e) => handleEntryChange(index, 'title', e.target.value)}
                placeholder="Entry title"
              />
            </div>
            
            <div>
              <Label htmlFor={`hours-${index}`}>Hours</Label>
              <Input
                id={`hours-${index}`}
                type="number"
                min="0"
                step="0.5"
                max={totalWorkingHours}
                value={entry.hours}
                onChange={(e) => handleEntryChange(index, 'hours', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor={`description-${index}`}>Description</Label>
            <Textarea
              id={`description-${index}`}
              value={entry.description || ''}
              onChange={(e) => handleEntryChange(index, 'description', e.target.value)}
              placeholder="Describe your work for this entry"
              className="min-h-[80px]"
            />
          </div>
        </div>
      ))}
      
      <Button 
        variant="outline" 
        onClick={handleAddEntry}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Detailed Entry
      </Button>
      
      {totalDetailedHours > totalWorkingHours && (
        <p className="text-sm text-red-500">Total detailed hours exceed the working hours. Please adjust your entries.</p>
      )}
    </div>
  );
};
