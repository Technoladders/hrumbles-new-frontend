// Hrumbles-Front-End_UI/src/components/sales/contact-detail/MasterRecordTab.tsx
import React, { useState, useMemo } from 'react';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search, ExternalLink, User, Building2, Briefcase, Mail, Phone, 
  Globe, Calendar, MapPin, Code, Database, ChevronDown, ChevronUp,
  Copy, Check
} from 'lucide-react';
import { extractFromRaw, hasData } from '@/utils/dataExtractor';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// Recursive function to flatten nested objects
const flattenObject = (obj: any, prefix = '', maxDepth = 5, currentDepth = 0): Record<string, any> => {
  if (currentDepth >= maxDepth || !obj || typeof obj !== 'object') return {};

  const flattened: Record<string, any> = {};

  Object.keys(obj).forEach(key => {
    // Skip ID fields and internal fields
    if (key.match(/_(id|uid)$|^id$|request_id|apollo|_id|prototype/i) && 
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
        value.slice(0, 5).forEach((item, index) => {
          Object.assign(flattened, flattenObject(item, `${newKey}[${index}]`, maxDepth, currentDepth + 1));
        });
        if (value.length > 5) {
          flattened[`${newKey}[...]`] = `+${value.length - 5} more items`;
        }
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

// Categorize fields into sections
const categorizeFields = (flatData: Record<string, any>) => {
  const categories: Record<string, { icon: React.ReactNode; fields: Array<{ key: string; value: any }> }> = {
    'Personal Information': { icon: <User size={14} />, fields: [] },
    'Contact Details': { icon: <Mail size={14} />, fields: [] },
    'Professional': { icon: <Briefcase size={14} />, fields: [] },
    'Organization': { icon: <Building2 size={14} />, fields: [] },
    'Location': { icon: <MapPin size={14} />, fields: [] },
    'Social & Web': { icon: <Globe size={14} />, fields: [] },
    'Employment History': { icon: <Calendar size={14} />, fields: [] },
    'Technology': { icon: <Code size={14} />, fields: [] },
    'Other': { icon: <Database size={14} />, fields: [] },
  };

  Object.entries(flatData).forEach(([key, value]) => {
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
    } else {
      categories['Other'].fields.push(field);
    }
  });

  return Object.entries(categories)
    .filter(([_, cat]) => cat.fields.length > 0)
    .reduce((acc, [name, cat]) => ({ ...acc, [name]: cat }), {});
};

export const MasterRecordTab = ({ contact }: { contact: any }) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['Personal Information', 'Contact Details']));
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const data = extractFromRaw(contact);
  const rawData = data.fullRaw || {};
  
  const flattenedData = useMemo(() => flattenObject(rawData), [rawData]);
  const categorizedData = useMemo(() => categorizeFields(flattenedData), [flattenedData]);

  // Filter data based on search
  const filteredCategories = useMemo(() => {
    if (!searchTerm) return categorizedData;
    
    const lowerSearch = searchTerm.toLowerCase();
    return Object.entries(categorizedData)
      .map(([name, cat]: [string, any]) => ({
        name,
        ...cat,
        fields: cat.fields.filter((f: any) => 
          f.key.toLowerCase().includes(lowerSearch) || 
          String(f.value).toLowerCase().includes(lowerSearch)
        )
      }))
      .filter(cat => cat.fields.length > 0)
      .reduce((acc, { name, ...cat }) => ({ ...acc, [name]: cat }), {});
  }, [categorizedData, searchTerm]);

  const totalFields = Object.values(categorizedData).reduce(
    (sum: number, cat: any) => sum + cat.fields.length, 0
  );

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const copyValue = (value: any, key: string) => {
    const textValue = Array.isArray(value) ? value.join(', ') : String(value);
    navigator.clipboard.writeText(textValue);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
    toast({ title: "Copied", description: "Value copied to clipboard" });
  };

  if (!hasData(rawData)) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-gray-50 rounded-lg border border-gray-200">
        <Database className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-sm font-medium text-gray-900 mb-1">No enrichment data available</p>
        <p className="text-xs text-gray-500">Enrich this contact to see detailed data fields</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Database size={16} className="text-gray-400" />
            <span className="text-sm font-semibold text-gray-900">Data Fields</span>
            <Badge variant="secondary" className="text-xs">
              {totalFields} fields
            </Badge>
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <Input 
            placeholder="Search fields or values..." 
            className="pl-10 h-10 text-sm bg-gray-50 border-gray-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Data Sections */}
      <div className="space-y-3">
        {Object.entries(filteredCategories).length > 0 ? (
          Object.entries(filteredCategories).map(([categoryName, category]: [string, any]) => (
            <div 
              key={categoryName}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden"
            >
              {/* Section Header */}
              <button
                onClick={() => toggleSection(categoryName)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-gray-100 rounded text-gray-600">
                    {category.icon}
                  </div>
                  <span className="text-sm font-medium text-gray-900">{categoryName}</span>
                  <Badge variant="secondary" className="text-[10px] bg-gray-100 text-gray-500">
                    {category.fields.length}
                  </Badge>
                </div>
                {expandedSections.has(categoryName) ? (
                  <ChevronUp size={16} className="text-gray-400" />
                ) : (
                  <ChevronDown size={16} className="text-gray-400" />
                )}
              </button>
              
              {/* Section Content */}
              {expandedSections.has(categoryName) && (
                <div className="border-t border-gray-100">
                  <table className="w-full">
                    <tbody className="divide-y divide-gray-50">
                      {category.fields.map((field: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors group">
                          <td className="px-4 py-3 w-2/5">
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {formatFieldName(field.key)}
                            </span>
                            {field.key.includes('.') && (
                              <div className="text-[10px] text-gray-400 mt-0.5 truncate">
                                {field.key}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 w-3/5">
                            <div className="flex items-start justify-between gap-2">
                              <ValueRenderer value={field.value} fieldKey={field.key} />
                              <button
                                onClick={() => copyValue(field.value, field.key)}
                                className="flex-shrink-0 p-1 rounded hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                {copiedField === field.key ? (
                                  <Check size={12} className="text-green-500" />
                                ) : (
                                  <Copy size={12} className="text-gray-400" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <Search className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">No matches found</p>
            <p className="text-xs text-gray-500 mt-1">Try a different search term</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Format field name for display
const formatFieldName = (key: string): string => {
  const lastPart = key.split('.').pop() || key;
  const cleanKey = lastPart.replace(/\[\d+\]/g, '');
  return cleanKey
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .toLowerCase()
    .replace(/^\w/, c => c.toUpperCase());
};

// Value Renderer Component
const ValueRenderer = ({ value, fieldKey }: { value: any; fieldKey: string }) => {
  if (!hasData(value)) return <span className="text-gray-300">—</span>;

  // Boolean
  if (typeof value === 'boolean') {
    return (
      <Badge 
        variant="secondary"
        className={cn(
          "text-[10px] font-medium",
          value ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
        )}
      >
        {value ? 'Yes' : 'No'}
      </Badge>
    );
  }

  // Arrays
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-gray-300">—</span>;
    
    return (
      <div className="flex flex-wrap gap-1">
        {value.slice(0, 5).map((item, idx) => (
          <Badge 
            key={idx} 
            variant="outline"
            className="text-[10px] font-normal bg-gray-50 text-gray-600 border-gray-200"
          >
            {String(item)}
          </Badge>
        ))}
        {value.length > 5 && (
          <Badge variant="outline" className="text-[10px] text-gray-400 border-gray-200">
            +{value.length - 5}
          </Badge>
        )}
      </div>
    );
  }

  const lowerKey = fieldKey.toLowerCase();
  const stringValue = String(value);

  // URLs
  if ((lowerKey.includes('url') || lowerKey.includes('website') || lowerKey.includes('domain')) && 
      (stringValue.startsWith('http') || stringValue.startsWith('www'))) {
    return (
      <a 
        href={stringValue.startsWith('http') ? stringValue : `https://${stringValue}`} 
        target="_blank" 
        rel="noreferrer" 
        className="text-sm text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 truncate max-w-xs"
      >
        {stringValue}
        <ExternalLink size={10} className="flex-shrink-0" />
      </a>
    );
  }

  // Email
  if (lowerKey.includes('email') && stringValue.includes('@')) {
    return (
      <a 
        href={`mailto:${stringValue}`} 
        className="text-sm text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
      >
        <Mail size={12} className="flex-shrink-0 text-gray-400" />
        {stringValue}
      </a>
    );
  }

  // Phone
  if (lowerKey.includes('phone') || lowerKey.includes('mobile')) {
    return (
      <span className="text-sm text-gray-900 flex items-center gap-1">
        <Phone size={12} className="flex-shrink-0 text-gray-400" />
        {stringValue}
      </span>
    );
  }

  // Numbers
  if (typeof value === 'number') {
    return <span className="text-sm font-medium text-gray-900">{value.toLocaleString()}</span>;
  }

  // Dates
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return (
      <span className="text-sm text-gray-700 flex items-center gap-1">
        <Calendar size={12} className="flex-shrink-0 text-gray-400" />
        {new Date(value).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        })}
      </span>
    );
  }

  // Default string (with truncation for long values)
  if (stringValue.length > 200) {
    return (
      <span className="text-sm text-gray-700 line-clamp-3" title={stringValue}>
        {stringValue}
      </span>
    );
  }

  return <span className="text-sm text-gray-700">{stringValue}</span>;
};