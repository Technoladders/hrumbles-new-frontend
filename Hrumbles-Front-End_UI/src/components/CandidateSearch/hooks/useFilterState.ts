import { useState, useCallback, useMemo } from "react";
import { FilterState } from "../types";

export interface UseFilterStateReturn extends FilterState {
  addSkill: (s: string) => void;
  removeSkill: (s: string) => void;
  addTitle: (t: string) => void;
  removeTitle: (t: string) => void;
  addLocation: (l: string) => void;
  removeLocation: (l: string) => void;
  toggleSeniority: (s: string) => void;
  clearAll: () => void;
  setSkillsFromQuickSearch: (skills: string[]) => void;
  filterCount: number;
  hasFilters: boolean;
}

export const useFilterState = (): UseFilterStateReturn => {
  const [skills,      setSkills]      = useState<string[]>([]);
  const [titles,      setTitles]      = useState<string[]>([]);
  const [locations,   setLocations]   = useState<string[]>([]);
  const [seniorities, setSeniorities] = useState<string[]>([]);

  const addSkill    = useCallback((s: string) => setSkills(p => p.includes(s) ? p : [...p, s]), []);
  const removeSkill = useCallback((s: string) => setSkills(p => p.filter(x => x !== s)), []);

  const addTitle    = useCallback((t: string) => setTitles(p => p.includes(t) ? p : [...p, t]), []);
  const removeTitle = useCallback((t: string) => setTitles(p => p.filter(x => x !== t)), []);

  const addLocation    = useCallback((l: string) => setLocations(p => p.includes(l) ? p : [...p, l]), []);
  const removeLocation = useCallback((l: string) => setLocations(p => p.filter(x => x !== l)), []);

  const toggleSeniority = useCallback((s: string) =>
    setSeniorities(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]), []);

  const clearAll = useCallback(() => {
    setSkills([]); setTitles([]); setLocations([]); setSeniorities([]);
  }, []);

  const setSkillsFromQuickSearch = useCallback((skills: string[]) => {
    setSkills(skills);
  }, []);

  const filterCount = useMemo(
    () => skills.length + titles.length + locations.length + seniorities.length,
    [skills, titles, locations, seniorities]
  );

  return {
    skills, titles, locations, seniorities,
    addSkill, removeSkill,
    addTitle, removeTitle,
    addLocation, removeLocation,
    toggleSeniority,
    clearAll,
    setSkillsFromQuickSearch,
    filterCount,
    hasFilters: filterCount > 0,
  };
};