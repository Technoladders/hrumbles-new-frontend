
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Clock, 
  Plus, 
  Edit,
  Trash2,
  Calendar
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  break_duration_minutes: number;
  days_of_week: string[];
  employee_count?: number;
}

const ShiftManagement = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    start_time: '',
    end_time: '',
    break_duration_minutes: 60,
    days_of_week: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  });
  const { toast } = useToast();

  const dayOptions = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' }
  ];

  useEffect(() => {
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('hr_shifts')
        .select(`
          *,
          hr_employees(count)
        `);

      if (error) throw error;

      const formattedShifts = data?.map(shift => ({
        id: shift.id,
        name: shift.name,
        start_time: shift.start_time,
        end_time: shift.end_time,
        break_duration_minutes: shift.break_duration_minutes,
        days_of_week: shift.days_of_week,
        employee_count: Array.isArray(shift.hr_employees) ? shift.hr_employees.length : 0
      })) || [];

      setShifts(formattedShifts);
    } catch (error) {
      console.error('Error fetching shifts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch shifts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) throw new Error('Not authenticated');

      const { data: userProfile } = await supabase
        .from('hr_employees')
        .select('organization_id')
        .eq('id', currentUser.user.id)
        .single();

      if (!userProfile) throw new Error('User profile not found');

      const { error } = await supabase
        .from('hr_shifts')
        .insert([{
          ...formData,
          organization_id: userProfile.organization_id
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Shift created successfully",
      });

      setShowCreateModal(false);
      resetForm();
      fetchShifts();
    } catch (error) {
      console.error('Error creating shift:', error);
      toast({
        title: "Error",
        description: "Failed to create shift",
        variant: "destructive",
      });
    }
  };

  const handleUpdateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShift) return;
    
    try {
      const { error } = await supabase
        .from('hr_shifts')
        .update(formData)
        .eq('id', editingShift.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Shift updated successfully",
      });

      setEditingShift(null);
      resetForm();
      fetchShifts();
    } catch (error) {
      console.error('Error updating shift:', error);
      toast({
        title: "Error",
        description: "Failed to update shift",
        variant: "destructive",
      });
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (!confirm('Are you sure you want to delete this shift?')) return;

    try {
      const { error } = await supabase
        .from('hr_shifts')
        .delete()
        .eq('id', shiftId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Shift deleted successfully",
      });

      fetchShifts();
    } catch (error) {
      console.error('Error deleting shift:', error);
      toast({
        title: "Error",
        description: "Failed to delete shift",
        variant: "destructive",
      });
    }
  };

  const handleDayChange = (day: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      days_of_week: checked 
        ? [...prev.days_of_week, day]
        : prev.days_of_week.filter(d => d !== day)
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      start_time: '',
      end_time: '',
      break_duration_minutes: 60,
      days_of_week: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    });
  };

  const openEditModal = (shift: Shift) => {
    setEditingShift(shift);
    setFormData({
      name: shift.name,
      start_time: shift.start_time,
      end_time: shift.end_time,
      break_duration_minutes: shift.break_duration_minutes,
      days_of_week: shift.days_of_week
    });
  };

  const formatTime = (time: string) => {
    return new Date(`1970-01-01T${time}`).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getDaysDisplay = (days: string[]) => {
    const shortDays = days.map(day => day.slice(0, 3).toUpperCase());
    return shortDays.join(', ');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Shift Management
              </CardTitle>
              <CardDescription>
                Create and manage work shifts for your organization
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Shift
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shift Name</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Break Duration</TableHead>
                  <TableHead>Working Days</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shifts.map((shift) => (
                  <TableRow key={shift.id}>
                    <TableCell className="font-medium">{shift.name}</TableCell>
                    <TableCell>
                      {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                    </TableCell>
                    <TableCell>{shift.break_duration_minutes} min</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getDaysDisplay(shift.days_of_week)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{shift.employee_count || 0} employees</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(shift)}
                        >
                          <Edit className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteShift(shift.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {shifts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No shifts found. Create your first shift to get started.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Shift Modal */}
      <Dialog 
        open={showCreateModal || !!editingShift} 
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateModal(false);
            setEditingShift(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingShift ? 'Edit Shift' : 'Create New Shift'}
            </DialogTitle>
            <DialogDescription>
              Set up work schedules and break times for your employees.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={editingShift ? handleUpdateShift : handleCreateShift} className="space-y-4">
            <div>
              <Label htmlFor="shift_name">Shift Name *</Label>
              <Input
                id="shift_name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Morning Shift, Night Shift"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_time">Start Time *</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="end_time">End Time *</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="break_duration">Break Duration (minutes)</Label>
              <Input
                id="break_duration"
                type="number"
                value={formData.break_duration_minutes}
                onChange={(e) => setFormData(prev => ({ ...prev, break_duration_minutes: parseInt(e.target.value) }))}
                min="0"
                max="480"
              />
            </div>

            <div>
              <Label>Working Days</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {dayOptions.map((day) => (
                  <div key={day.value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={day.value}
                      checked={formData.days_of_week.includes(day.value)}
                      onChange={(e) => handleDayChange(day.value, e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor={day.value} className="text-sm font-normal">
                      {day.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingShift(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingShift ? 'Update Shift' : 'Create Shift'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShiftManagement;
