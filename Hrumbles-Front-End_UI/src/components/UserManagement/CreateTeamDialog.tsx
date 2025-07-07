import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";

interface Team {
  id: string;
  name: string;
  team_type: string;
  level: number;
}

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  teams: Team[]; // We only need the teams array for finding the parent
  parentTeamId?: string;
}

const CreateTeamDialog: React.FC<CreateTeamDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
  teams,
  parentTeamId,
}) => {
  // CHANGED: Renamed `child_team_name` to `name` for generic use
  const [formData, setFormData] = useState({
    parent_team_name: '',
    name: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      const parentTeam = parentTeamId ? teams.flatMap(t => [t, ...(t.children || [])]).find(t => t.id === parentTeamId) : null;
      setFormData({
        parent_team_name: parentTeam?.name || '',
        name: '', 
        description: '',
      });
    }
  }, [open, parentTeamId, teams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const authData = getAuthDataFromLocalStorage();
      if (!authData) throw new Error('Authentication data not found');
      const { organization_id, userId } = authData;

      let parentTeam = null;
      let level = 0;
      if (parentTeamId) {
        // Search through all teams and their children to find the parent
        const findParent = (teamsToSearch: Team[]): Team | null => {
            for (const team of teamsToSearch) {
                if (team.id === parentTeamId) return team;
                if (team.children) {
                    const found = findParent(team.children);
                    if (found) return found;
                }
            }
            return null;
        };
        parentTeam = findParent(teams);
        if (!parentTeam) throw new Error('Parent team not found');
        level = parentTeam.level + 1;
      }

      const teamData = {
        name: formData.name, // CHANGED: Use generic `name`
        description: formData.description,
        parent_team_id: parentTeamId || null,
        team_type: parentTeamId ? 'sub_team' : 'team',
        level: level,
        organization_id: organization_id,
        is_active: true,
      };

      const { data: newTeam, error } = await supabase
        .from('hr_teams')
        .insert([teamData])
        .select()
        .single();

      if (error) throw error;

      await supabase.from('hr_team_audit_logs').insert({
        team_id: newTeam.id,
        action_type: 'team_created',
        action_details: { team_data: teamData, created_by: userId },
        performed_by: userId,
        organization_id: organization_id,
      });

      toast({
        title: "Success",
        description: `Team "${teamData.name}" created successfully.`,
      });
      onSuccess();
    } catch (error) {
      console.error('Error creating team:', error);
      toast({
        title: "Error",
        description: "Failed to create team.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{parentTeamId ? 'Create Sub-Team' : 'Create a New Team'}</DialogTitle>
          <DialogDescription>
            {parentTeamId 
              ? 'Define a new team that will be nested under the selected parent team.' 
              : 'Create a new top-level team in your organization.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {parentTeamId && (
            <div>
              <Label htmlFor="parent_team_name">Parent Team</Label>
              <Input
                id="parent_team_name"
                value={formData.parent_team_name}
                readOnly
                className="bg-muted"
              />
            </div>
          )}
          <div>
            {/* CHANGED: Label is now more generic */}
            <Label htmlFor="name">{parentTeamId ? 'Sub-Team Name' : 'Team Name'} *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              placeholder="Enter team name"
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the team's purpose"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.name || loading}>
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                // CHANGED: Button text is more descriptive
                parentTeamId ? 'Create Sub-Team' : 'Create Team'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTeamDialog;