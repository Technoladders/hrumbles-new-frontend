import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  fetchAllStatuses,
  createStatus,
  updateStatus,
  deleteStatus,
  MainStatus,
  SubStatus
} from "@/services/statusService";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import { Pencil, Trash2 } from "lucide-react";
 
// Create interface for component props
interface StatusSettingsProps {
  onStatusChange?: () => void;
}
 
const StatusSettings: React.FC<StatusSettingsProps> = ({ onStatusChange }) => {
  const [statuses, setStatuses] = useState<MainStatus[]>([]);
  const [activeTab, setActiveTab] = useState("main");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditSubModalOpen, setIsEditSubModalOpen] = useState(false);
  const [selectedMainStatus, setSelectedMainStatus] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<MainStatus | SubStatus | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    color: "#3b82f6",
    description: "",
    displayOrder: 0
  });
  const organizationId = useSelector((state: any) => state.auth?.organization_id);
 
  // Fetch all statuses on component mount
  useEffect(() => {
    loadStatuses();
  }, []);
 
  // Load all statuses
  const loadStatuses = async () => {
    try {
      setIsLoading(true);
      const data = await fetchAllStatuses(organizationId);
      setStatuses(data);
    } catch (error) {
      console.error("Error loading statuses:", error);
      toast.error("Failed to load statuses");
    } finally {
      setIsLoading(false);
    }
  };
 
  // Create a new main status
  const handleCreateMainStatus = async () => {
    try {
      const newStatus: Partial<MainStatus> = {
        name: formData.name,
        color: formData.color,
        description: formData.description,
        type: 'main',
        display_order: formData.displayOrder
      };
     
      await createStatus(newStatus, organizationId);
     
      toast.success("Status created successfully");
      setIsModalOpen(false);
      resetForm();
      loadStatuses();
      if (onStatusChange) onStatusChange();
    } catch (error) {
      console.error("Error creating status:", error);
      toast.error("Failed to create status");
    }
  };
 
  // Create a new sub status
  const handleCreateSubStatus = async () => {
    try {
      if (!selectedMainStatus) {
        toast.error("Please select a parent status");
        return;
      }
     
      const newStatus: Partial<SubStatus> = {
        name: formData.name,
        color: formData.color,
        description: formData.description,
        type: 'sub',
        parent_id: selectedMainStatus,
        display_order: formData.displayOrder
      };
     
      await createStatus(newStatus, organizationId);
     
      toast.success("Sub-status created successfully");
      setIsSubModalOpen(false);
      resetForm();
      loadStatuses();
      if (onStatusChange) onStatusChange();
    } catch (error) {
      console.error("Error creating sub-status:", error);
      toast.error("Failed to create sub-status");
    }
  };
 
  // Update existing main status
  const handleUpdateMainStatus = async () => {
    try {
      if (!editingStatus || !editingStatus.id) {
        toast.error("No status selected for editing");
        return;
      }
     
      const updatedStatus: Partial<MainStatus> = {
        name: formData.name,
        color: formData.color,
        description: formData.description,
        display_order: formData.displayOrder
      };
     
      await updateStatus(editingStatus.id, updatedStatus);
     
      toast.success("Status updated successfully");
      setIsEditModalOpen(false);
      resetForm();
      loadStatuses();
      if (onStatusChange) onStatusChange();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };
 
  // Update existing sub status
  const handleUpdateSubStatus = async () => {
    try {
      if (!editingStatus || !editingStatus.id) {
        toast.error("No sub-status selected for editing");
        return;
      }
     
      const updatedStatus: Partial<SubStatus> = {
        name: formData.name,
        color: formData.color,
        description: formData.description,
        display_order: formData.displayOrder,
        parent_id: selectedMainStatus || (editingStatus as SubStatus).parent_id
      };
     
      await updateStatus(editingStatus.id, updatedStatus);
     
      toast.success("Sub-status updated successfully");
      setIsEditSubModalOpen(false);
      resetForm();
      loadStatuses();
      if (onStatusChange) onStatusChange();
    } catch (error) {
      console.error("Error updating sub-status:", error);
      toast.error("Failed to update sub-status");
    }
  };
 
  // Handle status deletion
  const handleDeleteStatus = async (statusId: string) => {
    if (window.confirm("Are you sure you want to delete this status? This action cannot be undone.")) {
      try {
        await deleteStatus(statusId);
        toast.success("Status deleted successfully");
        loadStatuses();
        if (onStatusChange) onStatusChange();
      } catch (error) {
        console.error("Error deleting status:", error);
        toast.error("Failed to delete status");
      }
    }
  };
 
  // Open edit modal for main status
  const handleEditMainStatus = (status: MainStatus) => {
    setEditingStatus(status);
    setFormData({
      name: status.name,
      color: status.color || "#3b82f6",
      description: status.description || "",
      displayOrder: status.display_order || 0
    });
    setIsEditModalOpen(true);
  };
 
  // Open edit modal for sub status
  const handleEditSubStatus = (status: SubStatus) => {
    setEditingStatus(status);
    setSelectedMainStatus(status.parent_id);
    setFormData({
      name: status.name,
      color: status.color || "#3b82f6",
      description: status.description || "",
      displayOrder: status.display_order || 0
    });
    setIsEditSubModalOpen(true);
  };
 
  // Reset form data
  const resetForm = () => {
    setFormData({
      name: "",
      color: "#3b82f6",
      description: "",
      displayOrder: 0
    });
    setSelectedMainStatus(null);
    setEditingStatus(null);
  };
 
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-5 mt-5 h-90">
        <h2 className="text-2xl font-bold">Status Management</h2>
        <div className="space-x-2">
          <Button onClick={() => setIsModalOpen(true)}>Add Main Status</Button>
          <Button onClick={() => setIsSubModalOpen(true)}>Add Sub Status</Button>
        </div>
      </div>
 
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="main">Main Statuses</TabsTrigger>
          <TabsTrigger value="sub">Sub Statuses</TabsTrigger>
        </TabsList>
       
        <TabsContent value="main" >
          <div className='max-h-[60vh] overflow-y-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Display Order</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody >
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">Loading...</TableCell>
                </TableRow>
              ) : statuses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">No statuses found</TableCell>
                </TableRow>
              ) : (
                statuses.map((status) => (
                  <TableRow key={status.id}>
                    <TableCell className="font-medium">{status.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <div
                          className="w-4 h-4 rounded-full mr-2"
                          style={{ backgroundColor: status.color }}
                        />
                        {status.color}
                      </div>
                    </TableCell>
                    <TableCell>{status.description || "N/A"}</TableCell>
                    <TableCell>{status.display_order || 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditMainStatus(status)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteStatus(status.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </TabsContent>
       
        <TabsContent value="sub" >
        <div className='max-h-[60vh] overflow-y-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Parent Status</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Display Order</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody >
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">Loading...</TableCell>
                </TableRow>
              ) : (
                statuses.flatMap(mainStatus =>
                  mainStatus.subStatuses ? mainStatus.subStatuses.map(subStatus => (
                    <TableRow key={subStatus.id}>
                      <TableCell className="font-medium">{subStatus.name}</TableCell>
                      <TableCell>{mainStatus.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <div
                            className="w-4 h-4 rounded-full mr-2"
                            style={{ backgroundColor: subStatus.color }}
                          />
                          {subStatus.color}
                        </div>
                      </TableCell>
                      <TableCell>{subStatus.description || "N/A"}</TableCell>
                      <TableCell>{subStatus.display_order || 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditSubStatus(subStatus)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteStatus(subStatus.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : []
                )
              )}
            </TableBody>
          </Table>
          </div>
        </TabsContent>
      </Tabs>
 
      {/* Main Status Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Main Status</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Name</Label>
              <Input
                className="col-span-3"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Color</Label>
              <div className="col-span-3 flex gap-2">
                <Input
                  type="color"
                  className="w-12"
                  value={formData.color}
                  onChange={(e) => setFormData({...formData, color: e.target.value})}
                />
                <Input
                  className="flex-1"
                  value={formData.color}
                  onChange={(e) => setFormData({...formData, color: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Description</Label>
              <Input
                className="col-span-3"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Display Order</Label>
              <Input
                type="number"
                className="col-span-3"
                value={formData.displayOrder}
                onChange={(e) => setFormData({...formData, displayOrder: parseInt(e.target.value) || 0})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateMainStatus}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
 
      {/* Sub Status Modal */}
      <Dialog open={isSubModalOpen} onOpenChange={setIsSubModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Sub Status</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Parent Status</Label>
              <Select
                value={selectedMainStatus || ""}
                onValueChange={setSelectedMainStatus}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a parent status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      {status.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Name</Label>
              <Input
                className="col-span-3"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Color</Label>
              <div className="col-span-3 flex gap-2">
                <Input
                  type="color"
                  className="w-12"
                  value={formData.color}
                  onChange={(e) => setFormData({...formData, color: e.target.value})}
                />
                <Input
                  className="flex-1"
                  value={formData.color}
                  onChange={(e) => setFormData({...formData, color: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Description</Label>
              <Input
                className="col-span-3"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Display Order</Label>
              <Input
                type="number"
                className="col-span-3"
                value={formData.displayOrder}
                onChange={(e) => setFormData({...formData, displayOrder: parseInt(e.target.value) || 0})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSubModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateSubStatus}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
 
      {/* Edit Main Status Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Main Status</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Name</Label>
              <Input
                className="col-span-3"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Color</Label>
              <div className="col-span-3 flex gap-2">
                <Input
                  type="color"
                  className="w-12"
                  value={formData.color}
                  onChange={(e) => setFormData({...formData, color: e.target.value})}
                />
                <Input
                  className="flex-1"
                  value={formData.color}
                  onChange={(e) => setFormData({...formData, color: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Description</Label>
              <Input
                className="col-span-3"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Display Order</Label>
              <Input
                type="number"
                className="col-span-3"
                value={formData.displayOrder}
                onChange={(e) => setFormData({...formData, displayOrder: parseInt(e.target.value) || 0})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateMainStatus}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
 
      {/* Edit Sub Status Modal */}
      <Dialog open={isEditSubModalOpen} onOpenChange={setIsEditSubModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Sub Status</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Parent Status</Label>
              <Select
                value={selectedMainStatus || ""}
                onValueChange={setSelectedMainStatus}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a parent status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      {status.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Name</Label>
              <Input
                className="col-span-3"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Color</Label>
              <div className="col-span-3 flex gap-2">
                <Input
                  type="color"
                  className="w-12"
                  value={formData.color}
                  onChange={(e) => setFormData({...formData, color: e.target.value})}
                />
                <Input
                  className="flex-1"
                  value={formData.color}
                  onChange={(e) => setFormData({...formData, color: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Description</Label>
              <Input
                className="col-span-3"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Display Order</Label>
              <Input
                type="number"
                className="col-span-3"
                value={formData.displayOrder}
                onChange={(e) => setFormData({...formData, displayOrder: parseInt(e.target.value) || 0})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditSubModalOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateSubStatus}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
 
export default StatusSettings;