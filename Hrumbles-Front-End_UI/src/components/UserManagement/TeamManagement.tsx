import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import TeamDetailView from './TeamDetailView';
import CreateTeamDialog from './CreateTeamDialog';

interface Team {
  id: string;
  name: string;
  description?: string;
  team_lead_name?: string;
  department_name?: string;
  member_count: number;
  parent_team_id?: string;
  team_type: 'department' | 'team' | 'sub_team';
  level: number;
  is_active: boolean;
  children?: Team[];
}

const TeamManagement = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSubTeamModal, setShowSubTeamModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('hr_teams')
        .select(`
          *,
          team_lead:hr_employees!team_lead_id(first_name, last_name),
          department:hr_departments(name),
          team_members:hr_team_members(count)
        `)
        .eq('is_active', true)
        .order('level')
        .order('name');

      if (error) throw error;

      const formattedTeams = data?.map(team => ({
        id: team.id,
        name: team.name,
        description: team.description,
        team_lead_name: team.team_lead 
          ? `${team.team_lead.first_name} ${team.team_lead.last_name}`
          : 'No lead assigned',
        department_name: team.department?.name || 'No department',
        member_count: Array.isArray(team.team_members) ? team.team_members.length : 0,
        parent_team_id: team.parent_team_id,
        team_type: (team.team_type || 'team') as 'department' | 'team' | 'sub_team',
        level: team.level || 0,
        is_active: team.is_active !== false
      })) || [];

      const hierarchicalTeams = buildTeamHierarchy(formattedTeams);
      setTeams(hierarchicalTeams);
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast({
        title: "Error",
        description: "Failed to fetch teams",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const buildTeamHierarchy = (teams: Team[]): Team[] => {
    const teamMap = new Map<string, Team>();
    const rootTeams: Team[] = [];

    teams.forEach(team => {
      teamMap.set(team.id, { ...team, children: [] });
    });

    teams.forEach(team => {
      if (team.parent_team_id) {
        const parent = teamMap.get(team.parent_team_id);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(teamMap.get(team.id)!);
        }
      } else {
        rootTeams.push(teamMap.get(team.id)!);
      }
    });

    return rootTeams;
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team?')) return;

    try {
      const { error } = await supabase
        .from('hr_teams')
        .update({ is_active: false })
        .eq('id', teamId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Team deleted successfully",
      });
      fetchTeams();
    } catch (error) {
      console.error('Error deleting team:', error);
      toast({
        title: "Error",
        description: "Failed to delete team",
        variant: "destructive",
      });
    }
  };

  const renderTeamRow = (team: Team, depth: number = 0) => {
    const hasChildren = team.children && team.children.length > 0;
    const isExpanded = true; // Always expand for simplicity
    const paddingLeft = depth * 20;

    const filteredChildren = team.children?.filter(child =>
      child.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const shouldShowTeam = team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      filteredChildren.length > 0;

    if (!shouldShowTeam) return null;

    return (
      <div key={team.id}>
        <div
          className="flex items-center gap-2 p-2 hover:bg-muted cursor-pointer"
          style={{ paddingLeft: `${paddingLeft}px` }}
          onClick={() => setSelectedTeam(team)}
        >
          {hasChildren && (
            <span className="text-muted-foreground">+</span>
          )}
          <span className="font-medium">{team.name}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTeam(team);
              setShowSubTeamModal(true);
            }}
            className="ml-2 text-muted-foreground hover:text-primary"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteTeam(team.id);
            }}
            className="ml-2 text-muted-foreground hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        {hasChildren && isExpanded && filteredChildren.map(child => renderTeamRow(child, depth + 1))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Left Sidebar for Teams */}
      <div className="w-1/4 p-4 border-r">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Total Created Teams</h2>
            <p className="text-sm text-muted-foreground">This includes all the teams and child teams.</p>
            <span className="inline-block px-2 py-1 bg-muted rounded">{teams.length}</span>
          </div>
          <Input
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
          <div className="space-y-1">
            {teams.map(team => renderTeamRow(team))}
          </div>
          <Button className="w-full mt-4" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Team
          </Button>
        </div>
      </div>

      {/* Right Section for Team Details */}
      <div className="w-3/4 p-4">
        {selectedTeam ? (
          <TeamDetailView
            team={selectedTeam}
            onBack={() => setSelectedTeam(null)}
            onRefresh={fetchTeams}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Select a team to view details</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Click on a team name from the left to see its details.</p>
            </CardContent>
          </Card>
        )}
      </div>

      <CreateTeamDialog
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={() => {
          setShowCreateModal(false);
          fetchTeams();
        }}
        departments={[]}
        employees={[]}
        teams={teams}
      />

      <CreateTeamDialog
        open={showSubTeamModal}
        onOpenChange={setShowSubTeamModal}
        onSuccess={() => {
          setShowSubTeamModal(false);
          fetchTeams();
        }}
        departments={[]}
        employees={[]}
        teams={teams}
        parentTeamId={selectedTeam?.id}
      />
    </div>
  );
};

export default TeamManagement;