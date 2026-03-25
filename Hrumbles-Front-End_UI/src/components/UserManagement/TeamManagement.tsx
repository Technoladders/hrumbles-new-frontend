import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Plus, ChevronRight, ChevronDown,
  Search, FolderTree, Layers, Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import TeamDetailView from './TeamDetailView';
import CreateTeamDialog from './CreateTeamDialog';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Team {
  id: string;
  name: string;
  description?: string;
  team_lead_id?: string;
  team_lead_name?: string;
  department_name?: string;
  member_count: number;
  parent_team_id?: string;
  team_type: 'department' | 'team' | 'sub_team';
  level: number;
  is_active: boolean;
  children?: Team[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const flattenTeams = (teams: Team[]): Team[] =>
  teams.flatMap(t => [t, ...flattenTeams(t.children ?? [])]);

const filterTree = (teams: Team[], term: string): Team[] => {
  if (!term.trim()) return teams;
  return teams.reduce<Team[]>((acc, team) => {
    const filteredChildren = filterTree(team.children ?? [], term);
    if (team.name.toLowerCase().includes(term.toLowerCase()) || filteredChildren.length > 0) {
      acc.push({ ...team, children: filteredChildren });
    }
    return acc;
  }, []);
};

const buildDefaultExpanded = (teams: Team[]): Set<string> => {
  const ids = new Set<string>();
  flattenTeams(teams).forEach(t => { if (t.children?.length) ids.add(t.id); });
  return ids;
};

const buildHierarchy = (flat: Team[]): Team[] => {
  const map = new Map(flat.map(t => [t.id, { ...t, children: [] as Team[] }]));
  const roots: Team[] = [];
  flat.forEach(t => {
    if (t.parent_team_id && map.has(t.parent_team_id)) {
      map.get(t.parent_team_id)!.children!.push(map.get(t.id)!);
    } else {
      roots.push(map.get(t.id)!);
    }
  });
  return roots;
};

// ─── Type dot ────────────────────────────────────────────────────────────────

const typeDot: Record<string, string> = {
  department: 'bg-violet-400',
  team:       'bg-sky-400',
  sub_team:   'bg-emerald-400',
};

// ─── Tree Node ────────────────────────────────────────────────────────────────

interface TreeNodeProps {
  team: Team;
  depth: number;
  selectedId: string | null;
  expandedIds: Set<string>;
  searchTerm: string;
  onSelect: (t: Team) => void;
  onToggle: (id: string) => void;
  onAddSub: (t: Team) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  team, depth, selectedId, expandedIds, searchTerm,
  onSelect, onToggle, onAddSub,
}) => {
  const hasChildren = (team.children?.length ?? 0) > 0;
  const isExpanded  = expandedIds.has(team.id);
  const isSelected  = selectedId === team.id;
  const isMatch     = !!searchTerm && team.name.toLowerCase().includes(searchTerm.toLowerCase());

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-1.5 rounded-lg py-1.5 pr-2 cursor-pointer transition-all duration-100 select-none',
          isSelected
            ? 'bg-gradient-to-r from-violet-600 to-pink-600 shadow-sm'
            : isMatch
            ? 'bg-amber-50 ring-1 ring-amber-300'
            : 'hover:bg-violet-50',
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => onSelect(team)}
      >
        {/* Chevron */}
        <button
          className={cn(
            'flex-shrink-0 w-4 h-4 flex items-center justify-center rounded transition-colors',
            !hasChildren && 'invisible',
            isSelected ? 'text-white/60 hover:text-white' : 'text-slate-400 hover:text-violet-500',
          )}
          onClick={e => { e.stopPropagation(); onToggle(team.id); }}
        >
          {isExpanded
            ? <ChevronDown className="h-3 w-3" />
            : <ChevronRight className="h-3 w-3" />}
        </button>

        {/* Type dot */}
        <span className={cn(
          'flex-shrink-0 h-1.5 w-1.5 rounded-full',
          isSelected ? 'bg-white/70' : (typeDot[team.team_type] ?? 'bg-slate-300'),
        )} />

        {/* Name */}
        <span className={cn(
          'flex-1 text-xs font-medium truncate',
          isSelected ? 'text-white' : 'text-slate-700',
        )}>
          {team.name}
        </span>

        {/* Member count */}
        {team.member_count > 0 && (
          <span className={cn(
            'flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-semibold',
            isSelected
              ? 'bg-white/20 text-white'
              : 'bg-violet-100 text-violet-600',
          )}>
            {team.member_count}
          </span>
        )}

        {/* Add sub-team (hover) */}
        <button
          title="Add sub-team"
          className={cn(
            'flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded',
            isSelected
              ? 'text-white/60 hover:text-white hover:bg-white/10'
              : 'text-slate-400 hover:text-violet-600 hover:bg-violet-100',
          )}
          onClick={e => { e.stopPropagation(); onAddSub(team); }}
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {team.children!.map(child => (
            <TreeNode
              key={child.id}
              team={child}
              depth={depth + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              searchTerm={searchTerm}
              onSelect={onSelect}
              onToggle={onToggle}
              onAddSub={onAddSub}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Skeleton node ────────────────────────────────────────────────────────────

const SkeletonNode: React.FC<{ depth?: number }> = ({ depth = 0 }) => (
  <div className="flex items-center gap-2 py-2 rounded-lg" style={{ paddingLeft: `${12 + depth * 16}px` }}>
    <div className="h-3 w-3 rounded bg-violet-100 animate-pulse flex-shrink-0" />
    <div className="h-2.5 bg-slate-100 rounded animate-pulse flex-1" style={{ width: `${60 + Math.random() * 40}%` }} />
  </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────

const TeamManagement: React.FC = () => {
  const [teams, setTeams]               = useState<Team[]>([]);
  const [loading, setLoading]           = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [expandedIds, setExpandedIds]   = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm]     = useState('');
  const [showCreate, setShowCreate]     = useState(false);
  const [subParent, setSubParent]       = useState<Team | undefined>(undefined);
  const { toast } = useToast();

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      const { data: teamsData, error: teamsError } = await supabase
        .from('hr_teams')
        .select(`
          id, name, description, team_lead_id, parent_team_id,
          team_type, level, is_active,
          team_lead:hr_employees!team_lead_id(first_name, last_name),
          department:hr_departments(name)
        `)
        .eq('is_active', true)
        .order('level')
        .order('name');
      if (teamsError) throw teamsError;

      // Reliable member count
      const { data: membersData, error: memberErr } = await supabase
        .from('hr_team_members').select('team_id');
      if (memberErr) throw memberErr;

      const countMap = new Map<string, number>();
      membersData?.forEach(r => countMap.set(r.team_id, (countMap.get(r.team_id) ?? 0) + 1));

      const formatted: Team[] = (teamsData ?? []).map(t => ({
        id: t.id,
        name: t.name,
        description: t.description ?? undefined,
        team_lead_id: t.team_lead_id ?? undefined,
        team_lead_name: t.team_lead
          ? `${t.team_lead.first_name} ${t.team_lead.last_name}`
          : undefined,
        department_name: t.department?.name ?? undefined,
        member_count: countMap.get(t.id) ?? 0,
        parent_team_id: t.parent_team_id ?? undefined,
        team_type: (t.team_type ?? 'team') as Team['team_type'],
        level: t.level ?? 0,
        is_active: t.is_active !== false,
        children: [],
      }));

      const hierarchy = buildHierarchy(formatted);
      setTeams(hierarchy);
      setExpandedIds(buildDefaultExpanded(hierarchy));
    } catch (err: any) {
      toast({ title: 'Error', description: 'Failed to load teams', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchTeams(); }, [fetchTeams]);

  // Auto-expand on search
  useEffect(() => {
    if (searchTerm.trim()) {
      setExpandedIds(new Set(flattenTeams(teams).map(t => t.id)));
    } else {
      setExpandedIds(buildDefaultExpanded(teams));
    }
  }, [searchTerm, teams]);

  const toggleExpand = (id: string) =>
    setExpandedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleAddSub = (team: Team) => {
    setSubParent(team);
    setShowCreate(true);
  };

  const handleCreateSuccess = () => {
    setShowCreate(false);
    setSubParent(undefined);
    fetchTeams();
  };

  const visibleTree  = filterTree(teams, searchTerm);
  const totalCount   = flattenTeams(teams).length;
  const allFlat      = flattenTeams(teams);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className="w-72 flex flex-col bg-white border-r border-slate-100 shadow-sm shrink-0">

        {/* Header with gradient accent */}
        <div className="relative px-4 pt-5 pb-4 overflow-hidden">
          {/* Decorative gradient blob */}
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br from-violet-200 to-pink-200 opacity-40 blur-2xl pointer-events-none" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-600 to-pink-600">
                <FolderTree className="h-3.5 w-3.5 text-white" />
              </div>
              <h2 className="text-sm font-bold text-slate-700">Teams</h2>
            </div>
            <p className="text-[10px] text-slate-400 mb-4">
              Organisation structure & members
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-violet-50 border border-violet-100 px-3 py-2 text-center">
                <p className="text-lg font-bold bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent leading-none">
                  {totalCount}
                </p>
                <p className="text-[9px] text-slate-400 mt-0.5 font-medium uppercase tracking-wide">Total</p>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-center">
                <p className="text-lg font-bold text-slate-600 leading-none">{teams.length}</p>
                <p className="text-[9px] text-slate-400 mt-0.5 font-medium uppercase tracking-wide">Root</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 pb-3 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search teams…"
              className="pl-8 h-8 text-xs border-slate-200 focus-visible:ring-violet-400 bg-slate-50"
            />
          </div>
        </div>

        {/* Tree */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {loading ? (
            <div className="space-y-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonNode key={i} depth={i > 3 ? 1 : 0} />
              ))}
            </div>
          ) : visibleTree.length === 0 ? (
            <div className="text-center py-10">
              <Users className="h-8 w-8 text-violet-200 mx-auto mb-2" />
              <p className="text-xs text-slate-400">
                {searchTerm ? 'No teams match your search.' : 'No teams yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {visibleTree.map(team => (
                <TreeNode
                  key={team.id}
                  team={team}
                  depth={0}
                  selectedId={selectedTeam?.id ?? null}
                  expandedIds={expandedIds}
                  searchTerm={searchTerm}
                  onSelect={setSelectedTeam}
                  onToggle={toggleExpand}
                  onAddSub={handleAddSub}
                />
              ))}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-3">
            {[
              { label: 'Dept', color: 'bg-violet-400' },
              { label: 'Team', color: 'bg-sky-400' },
              { label: 'Sub', color: 'bg-emerald-400' },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1">
                <span className={cn('h-1.5 w-1.5 rounded-full', color)} />
                <span className="text-[9px] text-slate-400 font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Add team */}
        <div className="p-3 border-t border-slate-100">
          <Button
            onClick={() => { setSubParent(undefined); setShowCreate(true); }}
            className="w-full h-8 text-xs bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700 text-white border-0 shadow-sm gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> New Team
          </Button>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        {selectedTeam ? (
          <div className="p-6">
            <TeamDetailView
              team={selectedTeam}
              allTeams={allFlat}
              onBack={() => setSelectedTeam(null)}
              onRefresh={fetchTeams}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            {/* Decorative gradient circle */}
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-200 to-pink-200 blur-xl opacity-60" />
              <div className="relative rounded-full bg-gradient-to-br from-violet-100 to-pink-100 p-6">
                <Layers className="h-10 w-10 text-violet-400" />
              </div>
            </div>
            <h3 className="text-base font-bold text-slate-700 mb-1">Select a Team</h3>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              Choose a team from the panel to view its members, or create a new one to get started.
            </p>
            <Button
              onClick={() => { setSubParent(undefined); setShowCreate(true); }}
              className="mt-5 h-8 text-xs bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700 text-white border-0 shadow-sm gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Create your first team
            </Button>
          </div>
        )}
      </main>

      {/* ── Dialog ───────────────────────────────────────────────────────── */}
      <CreateTeamDialog
        open={showCreate}
        onOpenChange={open => { if (!open) { setShowCreate(false); setSubParent(undefined); } }}
        onSuccess={handleCreateSuccess}
        allTeams={allFlat}
        parentTeam={subParent}
      />
    </div>
  );
};

export default TeamManagement;