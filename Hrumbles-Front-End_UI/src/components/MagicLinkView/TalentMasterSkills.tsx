import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, BookOpen, Layers, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface TalentMasterSkillsProps {
  email: string | undefined;
}

const getCategoryIcon = (category: string) => {
  const cat = category.toLowerCase();
  let Icon = Layers;
  if (cat.includes("tech") || cat.includes("software")) Icon = Layers; // Adjust icons as needed
  if (cat.includes("soft") || cat.includes("management")) Icon = Layers;
  if (cat.includes("cloud") || cat.includes("web")) Icon = Layers;
  if (cat.includes("security")) Icon = Layers;
  if (cat.includes("infra")) Icon = Layers;
  return <Icon className="w-3 h-3 text-white" />;
};

const parseJsonArray = (data: any) => {
  if (Array.isArray(data)) return data;
  if (typeof data === "string") {
    try { return JSON.parse(data); } catch { return []; }
  }
  return [];
};

const TalentMasterSkills: React.FC<TalentMasterSkillsProps> = ({ email }) => {
  const { data: talentData, isLoading: isTalentLoading } = useQuery({
    queryKey: ["talentPoolEntry", email],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_talent_pool")
        .select("top_skills")
        .eq("email", email)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!email,
  });

  const rawSkills = useMemo(() => parseJsonArray(talentData?.top_skills), [talentData]);

  const { data: enrichedSkills, isLoading: isEnrichedLoading } = useQuery({
    queryKey: ["enrichedMasterSkills", rawSkills],
    queryFn: async () => {
      if (!rawSkills.length) return [];
      const { data, error } = await supabase.rpc("get_enriched_skills", {
        p_skill_names: rawSkills,
      });
      if (error) throw error;
      return data;
    },
    enabled: rawSkills.length > 0,
  });

  // Group data by category for Rowspan logic
  const groupedData = useMemo(() => {
    if (!rawSkills.length) return [];

    const enrichedMap = new Map(
      enrichedSkills?.map((item: any) => [item.skill_name.toLowerCase().trim(), item]) || []
    );

    // Create a flat list of all skills (enriched or raw)
    const flatList = rawSkills.map((skill) => {
      const info = enrichedMap.get(skill.toLowerCase().trim());
      return {
        rawName: skill,
        name: info?.normalized_name || skill,
        category: info?.category || "General",
        description: info?.description || "Professional proficiency required.",
        relatedSkills: info?.related_skills || [],
      };
    });

    // Group by category
    const groups: Record<string, typeof flatList> = {};
    flatList.forEach((item) => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });

    // Sort categories alphabetically
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [enrichedSkills, rawSkills]);

  // Split groupedData if total skills > 5
  const shouldSplit = rawSkills.length > 5;
  const mid = Math.ceil(groupedData.length / 2);
  const firstHalf = groupedData.slice(0, mid);
  const secondHalf = groupedData.slice(mid);

  const SkillBadge = ({ item }) => (
    <div className="relative group">
      <Badge 
        variant="secondary" 
        className="bg-gradient-to-r from-purple-50 to-blue-50 text-purple-700 border-purple-100 font-semibold text-[11px] px-2.5 py-1 whitespace-nowrap hover:shadow-md transition-all cursor-help flex items-center gap-1.5 shadow-sm"
      >
        {item.name}
        <Info className="w-3 h-3 opacity-40" />
      </Badge>

      {/* ABSOLUTE HOVER POPUP */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 p-0 rounded-xl bg-slate-900 text-white shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-200 z-[100] pointer-events-none border border-slate-700 overflow-hidden">
        <div className="bg-white/10 px-4 py-2 border-b border-white/10 flex justify-between items-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400">Skill Description</span>
          <BookOpen className="w-3 h-3 opacity-50" />
        </div>
        <div className="p-4">
          <p className="font-bold text-white mb-1 text-sm">{item.rawName}</p>
          <p className="text-slate-300 leading-relaxed text-[11px] mb-3">{item.description}</p>
          {item.relatedSkills.length > 0 && (
            <div className="pt-3 border-t border-white/10">
              <p className="text-[9px] font-bold text-slate-500 uppercase mb-2">Related Skills</p>
              <div className="flex flex-wrap gap-1">
                {item.relatedSkills.slice(0, 3).map((rs, i) => (
                  <Badge key={i} variant="outline" className="text-[9px] px-1.5 py-0 bg-white/5 border-white/10 text-slate-300">
                    {rs}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[7px] border-r-[7px] border-t-[7px] border-transparent border-t-slate-900"></div>
      </div>
    </div>
  );

  const renderTable = (data: typeof groupedData) => (
    <div className="max-h-96">
      <table className="w-full border-collapse text-left text-xs min-w-[450px]">
        <thead className="bg-white/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-200">
          <tr>
            <th className="px-3 py-2 font-bold text-slate-600 uppercase tracking-wider w-24">Category</th>
            <th className="px-3 py-2 font-bold text-slate-600 uppercase tracking-wider">Skill</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {data.map(([category, items]) => (
            <React.Fragment key={category}>
              {items.map((item, index) => (
                <tr key={`${category}-${index}`} className="hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-blue-50/50 transition-all group">
                  {/* Merged Category Column - Gradient accent */}
                  {index === 0 && (
                    <td
                      rowSpan={items.length}
                      className="px-3 py-2 align-center border-r border-slate-100 bg-gradient-to-b from-purple-50/70 to-transparent"
                    >
                      <div className="flex items-center gap-1.5 group-hover:scale-105 transition-transform">
                        {/* <div className="p-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded">
                          {getCategoryIcon(category)}
                        </div> */}
                        <span className="font-bold text-slate-800 text-xs whitespace-nowrap">
                          {category}
                        </span>
                      </div>
                    </td>
                  )}
                  
                  {/* Skill - Badge with Hover Popover */}
                  <td className="px-3 py-2">
                    <SkillBadge item={item} />
                  </td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (isTalentLoading || isEnrichedLoading) {
    return <div className="h-48 w-full animate-pulse bg-slate-50 rounded-2xl" />;
  }

  if (!groupedData.length) return null;

  return (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-50/50 to-blue-50/50 backdrop-blur-sm rounded-2xl ">
      <CardContent className="p-0">
        <div className="p-6 pb-4 border-b border-purple-100/50 bg-gradient-to-r from-purple-600/5 to-blue-600/5">
          <div className="flex items-center gap-2 text-purple-700">
            <div className="p-1.5 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg">
              <Sparkles className="w-4 h-4 text-purple-600" />
            </div>
            <span className="text-sm font-bold uppercase tracking-wider">Candidate Skills</span>
          </div>
        </div>
        <div className="">
          {shouldSplit ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4">
              <div className="border-r border-slate-100 pr-3">
                {renderTable(firstHalf)}
              </div>
              <div className="pl-3">
                {renderTable(secondHalf)}
              </div>
            </div>
          ) : (
            renderTable(groupedData)
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TalentMasterSkills;