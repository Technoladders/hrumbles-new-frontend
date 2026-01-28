import React, { useState, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, ExternalLink, User, Building2, Briefcase, Mail, Phone, 
  Globe, Calendar, MapPin, Network, Code, Award, Database
} from 'lucide-react';
import { extractFromRaw, hasData } from '@/utils/dataExtractor';
import { cn } from '@/lib/utils';

// Recursive function to flatten nested objects - hides IDs
const flattenObject = (obj: any, prefix = '', maxDepth = 5, currentDepth = 0): Record<string, any> => {
  if (currentDepth >= maxDepth || !obj || typeof obj !== 'object') return {};

  const flattened: Record<string, any> = {};

  Object.keys(obj).forEach(key => {
    // Skip ALL ID fields except meaningful ones
    if (key.match(/_(id|uid)$|^id$|request_id|apollo/i) && 
        !['organization_id', 'person_id', 'contact_id'].includes(key)) {
      return;
    }

    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value === null || value === undefined) {
      flattened[newKey] = null;
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        flattened[newKey] = [];
      } else if (typeof value[0] === 'object') {
        value.forEach((item, index) => {
          Object.assign(flattened, flattenObject(item, `${newKey}[${index}]`, maxDepth, currentDepth + 1));
        });
      } else {
        flattened[newKey] = value;
      }
    } else if (typeof value === 'object' && !(value instanceof Date)) {
      Object.assign(flattened, flattenObject(value, newKey, maxDepth, currentDepth + 1));
    } else {
      flattened[newKey] = value;
    }
  });

  return flattened;
};

// Categorize fields
const categorizeFields = (flatData: Record<string, any>) => {
  const categories: Record<string, { icon: JSX.Element; fields: Array<{ key: string; value: any }> }> = {
    'Personal Information': { icon: <User className="w-4 h-4" />, fields: [] },
    'Contact Details': { icon: <Mail className="w-4 h-4" />, fields: [] },
    'Professional': { icon: <Briefcase className="w-4 h-4" />, fields: [] },
    'Organization': { icon: <Building2 className="w-4 h-4" />, fields: [] },
    'Location': { icon: <MapPin className="w-4 h-4" />, fields: [] },
    'Social & Web': { icon: <Globe className="w-4 h-4" />, fields: [] },
    'Employment History': { icon: <Calendar className="w-4 h-4" />, fields: [] },
    'Technology': { icon: <Code className="w-4 h-4" />, fields: [] },
    'Verification & Status': { icon: <Award className="w-4 h-4" />, fields: [] },
    'Other': { icon: <Network className="w-4 h-4" />, fields: [] },
  };

  Object.entries(flatData).forEach(([key, value]) => {
    // Only include if value exists
    if (!hasData(value)) return;
    
    const lowerKey = key.toLowerCase();
    const field = { key, value };

    if (lowerKey.match(/name|headline|photo|first_|last_/)) {
      categories['Personal Information'].fields.push(field);
    } else if (lowerKey.match(/email|phone|mobile|contact/)) {
      categories['Contact Details'].fields.push(field);
    } else if (lowerKey.match(/title|seniority|department|function|role/)) {
      categories['Professional'].fields.push(field);
    } else if (lowerKey.match(/organization|company|industry|revenue|employee|funding/)) {
      categories['Organization'].fields.push(field);
    } else if (lowerKey.match(/city|state|country|address|postal|location|timezone/)) {
      categories['Location'].fields.push(field);
    } else if (lowerKey.match(/linkedin|twitter|facebook|github|url|website|domain/)) {
      categories['Social & Web'].fields.push(field);
    } else if (lowerKey.match(/employment|history|experience|current/)) {
      categories['Employment History'].fields.push(field);
    } else if (lowerKey.match(/technology|tech|sic|naics|code/)) {
      categories['Technology'].fields.push(field);
    } else if (lowerKey.match(/status|verified|confidence|validation|intent/)) {
      categories['Verification & Status'].fields.push(field);
    } else {
      categories['Other'].fields.push(field);
    }
  });

  return Object.entries(categories)
    .filter(([_, cat]) => cat.fields.length > 0)
    .reduce((acc, [name, cat]) => ({ ...acc, [name]: cat }), {});
};

const ValueRenderer = ({ value, fieldKey }: { value: any; fieldKey: string }) => {
  if (!hasData(value)) return null;

  // Handle boolean
  if (typeof value === 'boolean') {
    return (
      <Badge className={cn(
        "text-[9px] font-black uppercase px-2 py-0.5 border-none",
        value ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
      )}>
        {value ? 'TRUE' : 'FALSE'}
      </Badge>
    );
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1">
        {value.slice(0, 10).map((item, idx) => (
          <Badge key={idx} variant="outline" className="text-[9px] font-semibold bg-indigo-50 border-indigo-200 text-indigo-700 px-2 py-0">
            {String(item)}
          </Badge>
        ))}
        {value.length > 10 && (
          <Badge variant="outline" className="text-[9px] bg-slate-50 border-slate-200 text-slate-500">
            +{value.length - 10} more
          </Badge>
        )}
      </div>
    );
  }

  const lowerKey = fieldKey.toLowerCase();

  // Handle URLs
  if ((lowerKey.includes('url') || lowerKey.includes('website') || lowerKey.includes('domain')) && 
      typeof value === 'string' && (value.startsWith('http') || value.startsWith('www'))) {
    return (
      <a 
        href={value.startsWith('http') ? value : `https://${value}`} 
        target="_blank" 
        rel="noreferrer" 
        className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
      >
        <ExternalLink className="w-3 h-3 flex-shrink-0" />
        <span className="truncate max-w-md">{value}</span>
      </a>
    );
  }

  // Handle phone
  if (lowerKey.includes('phone') || lowerKey.includes('mobile')) {
    return (
      <div className="flex items-center gap-1.5">
        <Phone className="w-3 h-3 text-slate-400 flex-shrink-0" />
        <span className="text-xs font-semibold text-slate-700">{String(value)}</span>
      </div>
    );
  }

  // Handle email
  if (lowerKey.includes('email') && typeof value === 'string' && value.includes('@')) {
    return (
      <a href={`mailto:${value}`} className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline">
        <Mail className="w-3 h-3 flex-shrink-0" />
        <span className="truncate">{value}</span>
      </a>
    );
  }

  // Handle numbers
  if (typeof value === 'number') {
    return <span className="text-xs font-bold text-slate-800">{value.toLocaleString()}</span>;
  }

  // Handle dates
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return (
      <div className="flex items-center gap-1.5">
        <Calendar className="w-3 h-3 text-slate-400 flex-shrink-0" />
        <span className="text-xs font-semibold text-slate-700">{new Date(value).toLocaleDateString()}</span>
      </div>
    );
  }

  // Default string
  const stringValue = String(value);
  return (
    <span className="text-xs font-medium text-slate-700 break-words leading-relaxed">
      {stringValue.length > 300 ? `${stringValue.substring(0, 300)}...` : stringValue}
    </span>
  );
};

export const MasterRecordTab = ({ contact }: any) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'categorized' | 'raw'>('categorized');

  const data = extractFromRaw(contact);
  const rawData = data.fullRaw || {};
  
  const flattenedData = useMemo(() => flattenObject(rawData), [rawData]);
  const categorizedData = useMemo(() => categorizeFields(flattenedData), [flattenedData]);

  const filteredData = useMemo(() => {
    if (!searchTerm) return flattenedData;
    
    const lowerSearch = searchTerm.toLowerCase();
    return Object.entries(flattenedData)
      .filter(([key, value]) => 
        key.toLowerCase().includes(lowerSearch) || 
        String(value).toLowerCase().includes(lowerSearch)
      )
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
  }, [flattenedData, searchTerm]);

  const filteredCategories = useMemo(() => {
    if (!searchTerm) return categorizedData;
    
    const lowerSearch = searchTerm.toLowerCase();
    return Object.entries(categorizedData)
      .map(([name, cat]) => ({
        name,
        ...cat,
        fields: cat.fields.filter(f => 
          f.key.toLowerCase().includes(lowerSearch) || 
          String(f.value).toLowerCase().includes(lowerSearch)
        )
      }))
      .filter(cat => cat.fields.length > 0)
      .reduce((acc, { name, ...cat }) => ({ ...acc, [name]: cat }), {});
  }, [categorizedData, searchTerm]);

  const totalFields = Object.keys(filteredData).length;

  if (!hasData(rawData)) {
    return (
      <div className="flex items-center justify-center h-96 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl">
        <div className="text-center">
          <Database className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-bold text-sm">No enrichment data available</p>
          <p className="text-xs text-slate-400 mt-2">Enrich this contact to see detailed information</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 shadow-2xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMSIgb3BhY2l0eT0iMC4wMyIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-50"></div>
        
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg">
                <Database size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white tracking-tight">Data Explorer</h3>
                <p className="text-xs text-slate-300 font-semibold tracking-wide">Complete Enrichment Analysis</p>
              </div>
            </div>
            
            <Badge className="bg-white/10 backdrop-blur-sm text-white border-white/20 px-3 py-1.5 text-xs font-bold shadow-lg">
              {totalFields} Fields
            </Badge>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <Input 
              placeholder="Search fields or values..." 
              className="pl-10 h-11 text-sm bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-white/40"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
        <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1 h-11">
          <TabsTrigger value="categorized" className="text-xs font-bold">
            Categorized View
          </TabsTrigger>
          <TabsTrigger value="raw" className="text-xs font-bold">
            Raw Data
          </TabsTrigger>
        </TabsList>

        {/* Categorized View */}
        <TabsContent value="categorized" className="mt-6">
          <div className="space-y-4">
            {Object.entries(filteredCategories).length > 0 ? (
              Object.entries(filteredCategories).map(([categoryName, category]: [string, any], idx) => (
                <Card key={idx} className="border-2 border-slate-100 shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                  <div className="bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b-2 border-slate-100 px-5 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-slate-900 rounded-lg text-white shadow-md">
                        {category.icon}
                      </div>
                      <span className="text-sm font-black text-slate-800 tracking-tight">{categoryName}</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-600 border-none font-bold">
                      {category.fields.length}
                    </Badge>
                  </div>
                  
                  <CardContent className="p-0">
                    <div className="divide-y divide-slate-50">
                      {category.fields.map((field: any, fIdx: number) => (
                        <div key={fIdx} className="flex items-start px-5 py-4 hover:bg-slate-50/80 transition-colors group">
                          <div className="w-2/5 pr-4">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight group-hover:text-blue-600 transition-colors break-words leading-relaxed">
                              {field.key.split('.').pop()?.replace(/_/g, ' ')}
                            </span>
                            {field.key.includes('.') && (
                              <div className="text-[9px] text-slate-400 mt-1 font-medium">
                                {field.key.split('.').slice(0, -1).join(' › ')}
                              </div>
                            )}
                          </div>
                          <div className="w-3/5">
                            <ValueRenderer value={field.value} fieldKey={field.key} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="border-2 border-dashed border-slate-200 bg-slate-50">
                <CardContent className="py-16 text-center">
                  <Search className="mx-auto text-slate-300 mb-3" size={48} />
                  <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">No matches found</p>
                  <p className="text-xs text-slate-400 mt-2">Try different search terms</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Raw View */}
        <TabsContent value="raw" className="mt-6">
          <Card className="border-2 border-slate-100 shadow-lg overflow-hidden">
            <CardContent className="p-0">
              {Object.entries(filteredData).length > 0 ? (
                <div className="divide-y divide-slate-50">
                  {Object.entries(filteredData).map(([key, value], idx) => (
                    <div key={idx} className="flex items-start px-5 py-4 hover:bg-slate-50/80 transition-colors group">
                      <div className="w-2/5 pr-4">
                        <span className="text-[11px] font-mono font-bold text-slate-600 break-all group-hover:text-blue-600 transition-colors leading-relaxed">
                          {key}
                        </span>
                      </div>
                      <div className="w-3/5">
                        <ValueRenderer value={value} fieldKey={key} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center">
                  <Search className="mx-auto text-slate-300 mb-3" size={48} />
                  <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">No matches</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};