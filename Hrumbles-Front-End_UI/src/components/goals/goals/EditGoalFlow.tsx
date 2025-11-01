import React, { useState } from 'react';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GoalWithDetails } from '@/types/goal';
import EditGoalDetailsTab from './EditGoalDetailsTab';
import ManageAssignmentsTab from './ManageAssignmentsTab';
import { FileText, Users } from 'lucide-react';

interface EditGoalFlowProps {
  goal: GoalWithDetails;
  onClose: () => void;
}

const EditGoalFlow: React.FC<EditGoalFlowProps> = ({ goal, onClose }) => {
  // We may need to refetch the goal data to get the latest assignments after an update
  const [key, setKey] = useState(Date.now()); // A key to force re-renders

  const handleRefresh = () => {
    setKey(Date.now());
  };

  return (
    <DialogContent className="sm:max-w-5xl" key={key}>
      <DialogHeader>
        <DialogTitle>Edit Goal: {goal.name}</DialogTitle>
        <DialogDescription>Modify the goal's core details or manage employee assignments.</DialogDescription>
      </DialogHeader>
      <Tabs defaultValue="assignments" className="w-full pt-4">
        <TabsList className="grid w-full grid-cols-2 h-12">
          <TabsTrigger value="details" className="text-base"><FileText className="mr-2 h-5 w-5" />Goal Details</TabsTrigger>
          <TabsTrigger value="assignments" className="text-base"><Users className="mr-2 h-5 w-5" />Manage Assignments</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="pt-6">
          <EditGoalDetailsTab goal={goal} onClose={onClose} />
        </TabsContent>
        <TabsContent value="assignments" className="pt-6">
          <ManageAssignmentsTab goal={goal} onAssignmentUpdate={handleRefresh} />
        </TabsContent>
      </Tabs>
    </DialogContent>
  );
};

export default EditGoalFlow;