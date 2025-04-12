
import React, { useState } from 'react';
import { FormSectionProps, EducationEntry } from '@/types/application';
import { Button } from '@/components/careerPage/ui/button';
import { Input } from '@/components/careerPage/ui/input';
import { Label } from '@/components/careerPage/ui/label';
import { PlusCircle, Trash2, GraduationCap } from 'lucide-react';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/careerPage/ui/popover';
import { Calendar } from '@/components/careerPage/ui/calendar';
import { cn } from '@/lib/utils';

const EducationSection: React.FC<FormSectionProps> = ({ 
  formData, 
  updateFormData,
  errors,
  showValidationErrors
}) => {
  const [showAddEducation, setShowAddEducation] = useState(false);
  const [newEducation, setNewEducation] = useState<EducationEntry>({
    institute: '',
    degree: '',
    percentage: '',
    fromDate: '',
    toDate: ''
  });

  const handleAddEducation = () => {
    const updatedFormData = { ...formData };
    updatedFormData.education = [...formData.education, newEducation];
    updateFormData(updatedFormData);
    setNewEducation({
      institute: '',
      degree: '',
      percentage: '',
      fromDate: '',
      toDate: ''
    });
    setShowAddEducation(false);
  };

  const handleRemoveEducation = (index: number) => {
    const updatedFormData = { ...formData };
    updatedFormData.education = updatedFormData.education.filter((_, i) => i !== index);
    updateFormData(updatedFormData);
  };

  const handleInputChange = (field: keyof EducationEntry, value: string) => {
    setNewEducation({
      ...newEducation,
      [field]: value
    });
  };

  const handleDateChange = (field: 'fromDate' | 'toDate', date: Date | undefined) => {
    if (date) {
      setNewEducation({
        ...newEducation,
        [field]: format(date, 'yyyy-MM-dd')
      });
    }
  };

  const isEntryInvalid = (field: keyof EducationEntry): boolean => {
    if (!showValidationErrors) return false;
    
    if (field === 'institute' || field === 'degree' || field === 'fromDate' || field === 'toDate') {
      return !newEducation[field];
    }
    
    return false;
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium border-b pb-2 flex items-center gap-2">
        <GraduationCap className="h-5 w-5 text-blue-500" /> Education
      </h3>
      
      {formData.education.length === 0 && !showAddEducation ? (
        <div className="text-center py-8">
          <Button 
            type="button" 
            onClick={() => setShowAddEducation(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <PlusCircle className="h-4 w-4" /> Add Education
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* List existing education entries */}
          {formData.education.map((edu, index) => (
            <div key={index} className="p-4 border rounded-md bg-slate-50 relative">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 text-gray-500 hover:text-red-500"
                onClick={() => handleRemoveEducation(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Institute</Label>
                  <p className="mt-1">{edu.institute}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Degree</Label>
                  <p className="mt-1">{edu.degree}</p>
                </div>
                
                {edu.percentage && (
                  <div>
                    <Label className="text-sm font-medium">Percentage/CGPA</Label>
                    <p className="mt-1">{edu.percentage}</p>
                  </div>
                )}
                
                <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">From Date</Label>
                    <p className="mt-1">{edu.fromDate}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">To Date</Label>
                    <p className="mt-1">{edu.toDate}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Add new education form */}
          {showAddEducation && (
            <div className="p-4 border rounded-md bg-white">
              <h4 className="font-medium mb-4">Add Education</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="institute">
                    Institute Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="institute"
                    value={newEducation.institute}
                    onChange={(e) => handleInputChange('institute', e.target.value)}
                    className={isEntryInvalid('institute') ? "border-red-500" : ""}
                  />
                  {isEntryInvalid('institute') && (
                    <p className="text-red-500 text-sm">Institute name is required</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="degree">
                    Degree <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="degree"
                    value={newEducation.degree}
                    onChange={(e) => handleInputChange('degree', e.target.value)}
                    className={isEntryInvalid('degree') ? "border-red-500" : ""}
                  />
                  {isEntryInvalid('degree') && (
                    <p className="text-red-500 text-sm">Degree is required</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="percentage">Percentage/CGPA</Label>
                  <Input
                    id="percentage"
                    value={newEducation.percentage}
                    onChange={(e) => handleInputChange('percentage', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="fromDate">
                    From Date <span className="text-red-500">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !newEducation.fromDate && "text-muted-foreground",
                          isEntryInvalid('fromDate') && "border-red-500"
                        )}
                      >
                        {newEducation.fromDate ? newEducation.fromDate : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={newEducation.fromDate ? new Date(newEducation.fromDate) : undefined}
                        onSelect={(date) => handleDateChange('fromDate', date)}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  {isEntryInvalid('fromDate') && (
                    <p className="text-red-500 text-sm">From date is required</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="toDate">
                    To Date <span className="text-red-500">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !newEducation.toDate && "text-muted-foreground",
                          isEntryInvalid('toDate') && "border-red-500"
                        )}
                      >
                        {newEducation.toDate ? newEducation.toDate : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={newEducation.toDate ? new Date(newEducation.toDate) : undefined}
                        onSelect={(date) => handleDateChange('toDate', date)}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  {isEntryInvalid('toDate') && (
                    <p className="text-red-500 text-sm">To date is required</p>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end mt-4 space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowAddEducation(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  onClick={handleAddEducation}
                  disabled={!newEducation.institute || !newEducation.degree || !newEducation.fromDate || !newEducation.toDate}
                >
                  Add Education
                </Button>
              </div>
            </div>
          )}
          
          {/* Add education button */}
          {!showAddEducation && (
            <Button 
              type="button" 
              onClick={() => setShowAddEducation(true)}
              variant="outline"
              className="flex items-center gap-2 mt-4"
            >
              <PlusCircle className="h-4 w-4" /> Add Another Education
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default EducationSection;
