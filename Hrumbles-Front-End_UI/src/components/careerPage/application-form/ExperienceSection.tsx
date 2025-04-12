
import React, { useState } from 'react';
import { FormSectionProps, ExperienceEntry } from '@/types/application';
import { Button } from '@/components/careerPage/ui/button';
import { Input } from '@/components/careerPage/ui/input';
import { Label } from '@/components/careerPage/ui/label';
import { Textarea } from '@/components/careerPage/ui/textarea';
import { Checkbox } from '@/components/careerPage/ui/checkbox';
import { PlusCircle, Trash2, Briefcase, Calendar, X } from 'lucide-react';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/careerPage/ui/popover';
import { Calendar as CalendarComponent } from '@/components/careerPage/ui/calendar';
import { cn } from '@/lib/utils';

const ExperienceSection: React.FC<FormSectionProps> = ({ 
  formData, 
  updateFormData,
  errors,
  showValidationErrors
}) => {
  const [showAddExperience, setShowAddExperience] = useState(false);
  const [newExperience, setNewExperience] = useState<ExperienceEntry>({
    title: '',
    company: '',
    location: '',
    description: '',
    fromDate: '',
    toDate: '',
    currentlyWorking: false,
    skills: []
  });
  const [newSkill, setNewSkill] = useState('');

  const handleAddExperience = () => {
    const updatedFormData = { ...formData };
    updatedFormData.experiences = [...formData.experiences, newExperience];
    updateFormData(updatedFormData);
    setNewExperience({
      title: '',
      company: '',
      location: '',
      description: '',
      fromDate: '',
      toDate: '',
      currentlyWorking: false,
      skills: []
    });
    setShowAddExperience(false);
  };

  const handleRemoveExperience = (index: number) => {
    const updatedFormData = { ...formData };
    updatedFormData.experiences = updatedFormData.experiences.filter((_, i) => i !== index);
    updateFormData(updatedFormData);
  };

  const handleInputChange = (field: keyof ExperienceEntry, value: string | boolean) => {
    setNewExperience({
      ...newExperience,
      [field]: value
    });
  };

  const handleDateChange = (field: 'fromDate' | 'toDate', date: Date | undefined) => {
    if (date) {
      setNewExperience({
        ...newExperience,
        [field]: format(date, 'yyyy-MM-dd')
      });
    }
  };

  const handleAddSkill = () => {
    if (newSkill.trim()) {
      setNewExperience({
        ...newExperience,
        skills: [...newExperience.skills, newSkill.trim()]
      });
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (index: number) => {
    setNewExperience({
      ...newExperience,
      skills: newExperience.skills.filter((_, i) => i !== index)
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newSkill.trim()) {
      e.preventDefault();
      handleAddSkill();
    }
  };

  const isEntryInvalid = (field: keyof ExperienceEntry): boolean => {
    if (!showValidationErrors) return false;
    
    if (field === 'title' || field === 'company' || field === 'fromDate') {
      return !newExperience[field];
    }
    
    if (field === 'toDate' && !newExperience.currentlyWorking) {
      return !newExperience[field];
    }
    
    if (field === 'skills') {
      return newExperience.skills.length === 0;
    }
    
    return false;
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium border-b pb-2 flex items-center gap-2">
        <Briefcase className="h-5 w-5 text-blue-500" /> Experience
      </h3>
      
      {formData.experiences.length === 0 && !showAddExperience ? (
        <div className="text-center py-8">
          <Button 
            type="button" 
            onClick={() => setShowAddExperience(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <PlusCircle className="h-4 w-4" /> Add Experience
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* List existing experience entries */}
          {formData.experiences.map((exp, index) => (
            <div key={index} className="p-4 border rounded-md bg-slate-50 relative">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 text-gray-500 hover:text-red-500"
                onClick={() => handleRemoveExperience(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Title</Label>
                  <p className="mt-1">{exp.title}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Company</Label>
                  <p className="mt-1">{exp.company}</p>
                </div>
                
                {exp.location && (
                  <div>
                    <Label className="text-sm font-medium">Location</Label>
                    <p className="mt-1">{exp.location}</p>
                  </div>
                )}
                
                <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">From Date</Label>
                    <p className="mt-1">{exp.fromDate}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">To Date</Label>
                    <p className="mt-1">{exp.currentlyWorking ? "Present" : exp.toDate}</p>
                  </div>
                </div>
                
                {exp.description && (
                  <div className="col-span-1 md:col-span-2">
                    <Label className="text-sm font-medium">Description</Label>
                    <p className="mt-1 whitespace-pre-line">{exp.description}</p>
                  </div>
                )}
                
                <div className="col-span-1 md:col-span-2">
                  <Label className="text-sm font-medium">Skills</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {exp.skills.map((skill, skillIndex) => (
                      <span 
                        key={skillIndex} 
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Add new experience form */}
          {showAddExperience && (
            <div className="p-4 border rounded-md bg-white">
              <h4 className="font-medium mb-4">Add Experience</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">
                    Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={newExperience.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className={isEntryInvalid('title') ? "border-red-500" : ""}
                  />
                  {isEntryInvalid('title') && (
                    <p className="text-red-500 text-sm">Title is required</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="company">
                    Company Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="company"
                    value={newExperience.company}
                    onChange={(e) => handleInputChange('company', e.target.value)}
                    className={isEntryInvalid('company') ? "border-red-500" : ""}
                  />
                  {isEntryInvalid('company') && (
                    <p className="text-red-500 text-sm">Company name is required</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="location">Office Location</Label>
                  <Input
                    id="location"
                    value={newExperience.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
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
                          !newExperience.fromDate && "text-muted-foreground",
                          isEntryInvalid('fromDate') && "border-red-500"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {newExperience.fromDate ? newExperience.fromDate : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={newExperience.fromDate ? new Date(newExperience.fromDate) : undefined}
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
                  <div className="flex items-center justify-between">
                    <Label htmlFor="toDate">
                      To Date {!newExperience.currentlyWorking && <span className="text-red-500">*</span>}
                    </Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="currentlyWorking" 
                        checked={newExperience.currentlyWorking}
                        onCheckedChange={(checked) => 
                          handleInputChange('currentlyWorking', checked === true)
                        }
                      />
                      <label 
                        htmlFor="currentlyWorking" 
                        className="text-sm cursor-pointer"
                      >
                        Currently Working Here
                      </label>
                    </div>
                  </div>
                  
                  {!newExperience.currentlyWorking && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !newExperience.toDate && "text-muted-foreground",
                            isEntryInvalid('toDate') && "border-red-500"
                          )}
                          disabled={newExperience.currentlyWorking}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {newExperience.toDate ? newExperience.toDate : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={newExperience.toDate ? new Date(newExperience.toDate) : undefined}
                          onSelect={(date) => handleDateChange('toDate', date)}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                  
                  {isEntryInvalid('toDate') && (
                    <p className="text-red-500 text-sm">To date is required</p>
                  )}
                </div>
                
                <div className="col-span-1 md:col-span-2 space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newExperience.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={4}
                  />
                </div>
                
                <div className="col-span-1 md:col-span-2 space-y-2">
                  <Label htmlFor="skills">
                    Skills <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {newExperience.skills.map((skill, skillIndex) => (
                      <span 
                        key={skillIndex} 
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skillIndex)}
                          className="ml-1 text-blue-800 hover:text-blue-900"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      id="skills"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Type a skill and press Enter"
                      className={isEntryInvalid('skills') ? "border-red-500" : ""}
                    />
                    <Button 
                      type="button" 
                      onClick={handleAddSkill}
                      variant="outline"
                    >
                      Add
                    </Button>
                  </div>
                  {isEntryInvalid('skills') && (
                    <p className="text-red-500 text-sm">At least one skill is required</p>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end mt-4 space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowAddExperience(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  onClick={handleAddExperience}
                  disabled={
                    !newExperience.title || 
                    !newExperience.company || 
                    !newExperience.fromDate || 
                    (!newExperience.toDate && !newExperience.currentlyWorking) ||
                    newExperience.skills.length === 0
                  }
                >
                  Add Experience
                </Button>
              </div>
            </div>
          )}
          
          {/* Add experience button */}
          {!showAddExperience && (
            <Button 
              type="button" 
              onClick={() => setShowAddExperience(true)}
              variant="outline"
              className="flex items-center gap-2 mt-4"
            >
              <PlusCircle className="h-4 w-4" /> Add Another Experience
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default ExperienceSection;
