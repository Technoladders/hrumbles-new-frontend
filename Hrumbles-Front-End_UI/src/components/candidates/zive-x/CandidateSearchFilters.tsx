// src/components/candidates/zive-x/CandidateSearchFilters.tsx
// ENHANCED: Dynamic suggestions, auto-complete, and fluid AI experience
// UI REFRESH: Modern compact filter panel with sleek animations

import { useState, FC, useCallback, useMemo, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { MandatoryTagSelector, Tag as SearchTag } from '@/components/candidates/zive-x/MandatoryTagSelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SearchFilters, SearchHistory } from '@/types/candidateSearch';
import { City } from 'country-state-city';
import { ChevronDown, ChevronUp, Info, Sparkles, X, Loader2, Check, Send, Bot, User, SkipForward, ArrowLeft, Upload, Zap, FileText, Wand2, Lightbulb, Activity } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import DarkVeil from '@/components/ui/Reactbits-theme/DarkVeil';

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user' | 'system';
  content: string;
  metadata?: any;
}

interface CandidateSearchFiltersProps {
  onSearch: (filters: SearchFilters) => void;
  isSearching: boolean;
  initialFilters?: Partial<SearchFilters>;
  organizationId: string;
  searchHistory?: SearchHistory | null;
  hideHero?: boolean;
}

// --- COMPREHENSIVE SUGGESTION DATABASE (FALLBACK) ---
const SUGGESTION_DATABASE = {
  entryRoles: [
    'Junior Software Engineer', 'Trainee Software Engineer', 'Associate Software Engineer',
    'Junior Frontend Developer', 'Junior Backend Developer', 'Junior Full Stack Developer',
    'Junior Python Developer', 'Junior Java Developer', 'Junior React Developer',
    'Software Development Intern', 'Engineering Trainee',
    'Junior QA Engineer', 'Junior Data Analyst', 'Associate Data Engineer',
    'Frontend Intern', 'Backend Intern', 'UI/UX Design Intern'
  ],
  midRoles: [
    'Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
    'Python Developer', 'Java Developer', 'JavaScript Developer', 'React Developer',
    'Node.js Developer', 'Angular Developer', 'Vue.js Developer',
    'DevOps Engineer', 'Cloud Engineer',
    'Data Analyst', 'Data Engineer', 'QA Engineer',
    'Mobile Developer', 'iOS Developer', 'Android Developer', 'Flutter Developer',
    'UI/UX Designer', 'Product Designer'
  ],
  seniorRoles: [
    'Senior Software Engineer', 'Lead Software Engineer', 'Staff Engineer',
    'Senior Frontend Developer', 'Senior Backend Developer', 'Senior Full Stack Developer',
    'Senior Python Developer', 'Senior Java Developer',
    'Senior DevOps Engineer', 'Site Reliability Engineer', 'Principal Engineer',
    'Data Scientist', 'Senior Data Engineer', 'ML Engineer',
    'Senior Product Manager', 'Engineering Manager', 'Tech Lead',
    'Senior UI/UX Designer', 'Lead Designer',
    'Senior QA Engineer', 'Automation Architect',
    'AI Engineer', 'Machine Learning Engineer', 'Deep Learning Engineer',
    'Solutions Architect', 'Security Engineer'
  ],
  entrySkills: [
    'HTML', 'CSS', 'JavaScript basics', 'SQL basics', 'Git basics',
    'Python basics', 'Java basics', 'React basics', 'OOP concepts',
    'Data structures basics', 'Algorithms basics', 'Testing basics'
  ],
  midSkills: [
    'Python', 'Java', 'JavaScript', 'TypeScript', 'C++',
    'React', 'Angular', 'Vue.js', 'Node.js', 'Express',
    'Django', 'Flask', 'Spring Boot',
    'PostgreSQL', 'MongoDB', 'MySQL',
    'REST API', 'Git', 'Agile'
  ],
  seniorSkills: [
    'System Design', 'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes',
    'Microservices', 'GraphQL', 'CI/CD', 'Jenkins', 'Terraform',
    'Redis', 'Kafka', 'TensorFlow', 'PyTorch',
    'Architecture Patterns', 'Team Leadership', 'Code Review'
  ],
  locations: [
    'Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Pune', 'Chennai',
    'Kolkata', 'Ahmedabad', 'Gurugram', 'Noida', 'Gurgaon', 'Kochi',
    'Jaipur', 'Chandigarh', 'Indore',
    'Remote', 'Hybrid', 'Work from Home'
  ],
  experienceKeywords: {
    'fresher': { range: 'Fresher', level: 'entry', years: '0-1 years' },
    'freshers': { range: 'Fresher', level: 'entry', years: '0-1 years' },
    'intern': { range: 'Internship', level: 'entry', years: '0-1 years' },
    'trainee': { range: 'Trainee', level: 'entry', years: '0-1 years' },
    '0 year': { range: 'Fresher', level: 'entry', years: '0-1 years' },
    '1 year': { range: '1 year', level: 'entry', years: '1-2 years' },
    '2 year': { range: '2 years', level: 'mid', years: '2-3 years' },
    '3 year': { range: '3 years', level: 'mid', years: '3-5 years' },
    '4 year': { range: '4 years', level: 'mid', years: '3-5 years' },
    '5 year': { range: '5 years', level: 'mid', years: '5-8 years' },
    '6 year': { range: '6 years', level: 'senior', years: '5-8 years' },
    '7 year': { range: '7 years', level: 'senior', years: '5-8 years' },
    '8 year': { range: '8 years', level: 'senior', years: '8-10 years' },
    '10 year': { range: '10+ years', level: 'senior', years: '10+ years' },
    '5-8': { range: '5-8 years', level: 'senior', years: '5-8 years' },
    '3-5': { range: '3-5 years', level: 'mid', years: '3-5 years' },
    '1-3': { range: '1-3 years', level: 'mid', years: '1-3 years' },
    '0-2': { range: '0-2 years', level: 'entry', years: '0-2 years' }
  },
  domains: [
    'Fintech', 'Healthcare', 'E-commerce', 'EdTech', 'SaaS',
    'Enterprise', 'Startup', 'Product', 'Services', 'Consulting'
  ]
};

const generateDynamicSuggestions = (input: string): string[] => {
  if (!input || input.length < 2) {
    return [
      'Senior Python Developer, 5-8 years, hybrid Bangalore, Flask/Django',
      'Frontend Engineer with React, 3-5 years, remote, startup experience',
      'Full Stack Developer, Node.js and React, 4-6 years, Mumbai office',
      'DevOps Engineer with AWS and Kubernetes, 6-10 years, Pune',
      'Data Scientist, Python and ML, 3-5 years, remote, fintech domain'
    ];
  }

  const inputLower = input.toLowerCase().trim();
  const suggestions: string[] = [];
  
  let experienceLevel: 'entry' | 'mid' | 'senior' | null = null;
  let experienceRange = '';
  
  for (const [keyword, data] of Object.entries(SUGGESTION_DATABASE.experienceKeywords)) {
    if (inputLower.includes(keyword)) {
      experienceLevel = data.level as 'entry' | 'mid' | 'senior';
      experienceRange = data.range;
      break;
    }
  }
  
  let rolePool: string[] = [];
  let skillPool: string[] = [];
  
  if (experienceLevel === 'entry') {
    rolePool = SUGGESTION_DATABASE.entryRoles;
    skillPool = SUGGESTION_DATABASE.entrySkills;
  } else if (experienceLevel === 'mid') {
    rolePool = SUGGESTION_DATABASE.midRoles;
    skillPool = SUGGESTION_DATABASE.midSkills;
  } else if (experienceLevel === 'senior') {
    rolePool = SUGGESTION_DATABASE.seniorRoles;
    skillPool = SUGGESTION_DATABASE.seniorSkills;
  } else {
    rolePool = [...SUGGESTION_DATABASE.entryRoles, ...SUGGESTION_DATABASE.midRoles, ...SUGGESTION_DATABASE.seniorRoles];
    skillPool = [...SUGGESTION_DATABASE.entrySkills, ...SUGGESTION_DATABASE.midSkills, ...SUGGESTION_DATABASE.seniorSkills];
  }
  
  const matchedRoles = rolePool.filter(role => 
    role.toLowerCase().includes(inputLower) || 
    inputLower.split(' ').some(word => word.length > 2 && role.toLowerCase().includes(word))
  ).slice(0, 4);
  
  const matchedLocations = SUGGESTION_DATABASE.locations.filter(location => 
    location.toLowerCase().includes(inputLower) || 
    inputLower.includes(location.toLowerCase())
  ).slice(0, 3);
  
  const matchedSkills = skillPool.filter(skill => 
    skill.toLowerCase().includes(inputLower) || 
    inputLower.includes(skill.toLowerCase())
  ).slice(0, 3);
  
  const locationsToUse = matchedLocations.length > 0 ? matchedLocations : ['Bangalore', 'Mumbai', 'Remote'];
  
  if (matchedRoles.length > 0) {
    matchedRoles.slice(0, 3).forEach(role => {
      locationsToUse.slice(0, 2).forEach(location => {
         suggestions.push(`${role}, ${experienceRange || '3-5 years'}, ${location}, ${skillPool[0]}`);
      });
    });
  } else {
     suggestions.push(`Software Engineer, ${experienceRange || '3-5 years'}, ${locationsToUse[0]}, ${skillPool[0]}`);
  }

  const uniqueSuggestions = [...new Set(suggestions)];
  return uniqueSuggestions.slice(0, 8);
};

const CandidateSearchFilters: FC<CandidateSearchFiltersProps> = ({ 
  onSearch, 
  isSearching, 
  initialFilters, 
  organizationId, 
  searchHistory,
  hideHero = false
}) => {
  const [name, setName] = useState<SearchTag[]>([]);
  const [email, setEmail] = useState<SearchTag[]>([]);
  const [keywords, setKeywords] = useState<SearchTag[]>([]);
  const [skills, setSkills] = useState<SearchTag[]>([]);
  const [pastCompanies, setPastCompanies] = useState<SearchTag[]>([]);
  const [educations, setEducations] = useState<SearchTag[]>([]);
  const [locations, setLocations] = useState<SearchTag[]>([]);
  const [currentCompany, setCurrentCompany] = useState('');
  const [currentDesignation, setCurrentDesignation] = useState('');
  
  const [booleanKeywords, setBooleanKeywords] = useState('');
  const [isBooleanKeywords, setIsBooleanKeywords] = useState(false);
  const [booleanDesignation, setBooleanDesignation] = useState('');
  const [isBooleanDesignation, setIsBooleanDesignation] = useState(false);
  const [selectedBooleanPatterns, setSelectedBooleanPatterns] = useState<SearchTag[]>([]);

  const [jdText, setJdText] = useState('');
  const [isGeneratingBoolean, setIsGeneratingBoolean] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [openJobCombobox, setOpenJobCombobox] = useState(false);
  
  const [isAnalyzingJD, setIsAnalyzingJD] = useState(false);
  const [aiSuggestedJobTitle, setAiSuggestedJobTitle] = useState('');
  const [showJDSuggestion, setShowJDSuggestion] = useState(false);
  const [isGeneratingFullJD, setIsGeneratingFullJD] = useState(false);
  const [aiSuggestedTags, setAiSuggestedTags] = useState<string[]>([]);
  const [animatedTags, setAnimatedTags] = useState<string[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [analysisStages, setAnalysisStages] = useState<{
    stage: string;
    title: string;
    description: string;
    icon: string;
    isComplete: boolean;
  }[]>([]);
  const [currentStageIndex, setCurrentStageIndex] = useState(-1);
  const [showStages, setShowStages] = useState(true);
  const [visibleKeywordsCount, setVisibleKeywordsCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isChatMode, setIsChatMode] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [jdContext, setJdContext] = useState<any>(null);
  const [isProcessingIntent, setIsProcessingIntent] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>([]);
  const [showDynamicSuggestions, setShowDynamicSuggestions] = useState(true);
  
  const [suggestionCache] = useState<Map<string, string[]>>(new Map());
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);
  const [testDebugInfo, setTestDebugInfo] = useState<any>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const [showVeilAnimation, setShowVeilAnimation] = useState(true);

  const [minExp, setMinExp] = useState('');
  const [maxExp, setMaxExp] = useState('');
  const [minCurrentSalary, setMinCurrentSalary] = useState('');
  const [maxCurrentSalary, setMaxCurrentSalary] = useState('');
  const [minExpectedSalary, setMinExpectedSalary] = useState('');
  const [maxExpectedSalary, setMaxExpectedSalary] = useState('');
  const [noticePeriod, setNoticePeriod] = useState<string[]>([]);
  const [datePosted, setDatePosted] = useState('all_time');
  
  const [showEmployment, setShowEmployment] = useState(false);
  const [showEducation, setShowEducation] = useState(false);
  const [showCompensation, setShowCompensation] = useState(false);
  const [userName, setUserName] = useState('');

  const BRAND_COLOR = '#7731E8';

  const fetchDeepSeekSuggestions = async (input: string) => {
    if (!input || input.length < 2) return;
    const cacheKey = input.toLowerCase().trim();
    if (suggestionCache.has(cacheKey)) {
      setDynamicSuggestions(suggestionCache.get(cacheKey)!);
      return;
    }
    setIsGeneratingSuggestions(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-jd-suggestions-deepseek-test', {
        body: { userInput: input, conversationContext: jdContext, organizationId: organizationId }
      });
      if (error) throw error;
      if (data && data.suggestions) {
        setDynamicSuggestions(data.suggestions);
        setIsTestMode(data.isTestMode || false);
        if (data.debug) setTestDebugInfo(data.debug);
        suggestionCache.set(cacheKey, data.suggestions);
      }
    } catch (err) {
      console.error("DeepSeek API Error, falling back to local:", err);
      const localSuggestions = generateDynamicSuggestions(input);
      setDynamicSuggestions(localSuggestions);
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  useEffect(() => {
    if (isChatMode) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (chatInput.length >= 2) {
        debounceRef.current = setTimeout(() => { fetchDeepSeekSuggestions(chatInput); }, 600);
      } else {
        setDynamicSuggestions([
          'Senior Python Developer, 5-8 years, hybrid Bangalore',
          'Frontend Engineer with React, 3-5 years, remote',
          'Full Stack Developer, Node.js, 4-6 years, Mumbai',
          'DevOps Engineer, AWS, 6-10 years, Pune'
        ]);
        setTestDebugInfo(null);
      }
    }
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [chatInput, isChatMode, organizationId]);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const meta = user.user_metadata || {};
        let displayName = meta.full_name || meta.name;
        if (!displayName && meta.first_name) displayName = `${meta.first_name} ${meta.last_name || ''}`.trim();
        if (!displayName && user.email) {
          const emailPrefix = user.email.split('@')[0];
          displayName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
        }
        setUserName(displayName || 'User');
      }
    };
    fetchUser();
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setJdText(text);
    } catch (error) {
      console.error('Error reading file:', error);
    }
  };

  const { data: jobs = [] } = useQuery({
    queryKey: ['activeJobsForFilter', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('hr_jobs')
        .select('id, title, description')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      if (error) { console.error('Error fetching jobs:', error); return []; }
      return data;
    },
    enabled: !!organizationId,
  });

  useEffect(() => {
    setName(initialFilters?.name || []);
    setEmail(initialFilters?.email || []);
    setKeywords(initialFilters?.keywords || []);
    setSelectedBooleanPatterns([]);
    setSkills(initialFilters?.skills || []);
    setPastCompanies(initialFilters?.companies || []);
    setEducations(initialFilters?.educations || []);
    setLocations(initialFilters?.locations || []);
    setCurrentCompany(initialFilters?.current_company || '');
    setCurrentDesignation(initialFilters?.current_designation || '');
    setMinExp(initialFilters?.min_exp?.toString() || '');
    setMaxExp(initialFilters?.max_exp?.toString() || '');
    setMinCurrentSalary(initialFilters?.min_current_salary?.toString() || '');
    setMaxCurrentSalary(initialFilters?.max_current_salary?.toString() || '');
    setMinExpectedSalary(initialFilters?.min_expected_salary?.toString() || '');
    setMaxExpectedSalary(initialFilters?.max_expected_salary?.toString() || '');
    setNoticePeriod(initialFilters?.notice_periods || []);
    setDatePosted(initialFilters?.date_posted || 'all_time');
    if (initialFilters?.jd_text) {
      setJdText(initialFilters.jd_text);
      setAiSuggestedJobTitle(initialFilters.jd_job_title || '');
      setSelectedJobId(initialFilters.jd_selected_job_id || '');
      if (initialFilters.jd_generated_keywords) {
        setAiSuggestedTags(initialFilters.jd_generated_keywords);
        setVisibleKeywordsCount(initialFilters.jd_generated_keywords.length);
      }
      setIsBooleanKeywords(initialFilters.jd_is_boolean_mode || false);
    }
  }, [initialFilters]);

  useEffect(() => {
    if (searchHistory) {
      setJdText(searchHistory.jd_text);
      setAiSuggestedJobTitle(searchHistory.job_title || '');
      setSelectedJobId(searchHistory.selected_job_id || '');
      setAiSuggestedTags(searchHistory.generated_keywords);
      setIsBooleanKeywords(searchHistory.is_boolean_mode);
      setVisibleKeywordsCount(searchHistory.generated_keywords.length);
      setShowStages(false);
      setAnalysisStages([]);
      if (searchHistory.search_filters) {
        const filters = searchHistory.search_filters;
        setKeywords(filters.keywords || []);
        setSkills(filters.skills || []);
        setPastCompanies(filters.companies || []);
        setEducations(filters.educations || []);
        setLocations(filters.locations || []);
        setCurrentCompany(filters.current_company || '');
        setCurrentDesignation(filters.current_designation || '');
        setMinExp(filters.min_exp?.toString() || '');
        setMaxExp(filters.max_exp?.toString() || '');
        setMinCurrentSalary(filters.min_current_salary?.toString() || '');
        setMaxCurrentSalary(filters.max_current_salary?.toString() || '');
        setMinExpectedSalary(filters.min_expected_salary?.toString() || '');
        setMaxExpectedSalary(filters.max_expected_salary?.toString() || '');
        setNoticePeriod(filters.notice_periods || []);
        setDatePosted(filters.date_posted || 'all_time');
      }
    }
  }, [searchHistory]);

  useEffect(() => {
    if (aiSuggestedTags.length > 0 && !isAnimating && !isGeneratingBoolean) {
      const reAnimate = async () => {
        setIsAnimating(true);
        setShowStages(false);
        setAnalysisStages([]);
        setCurrentStageIndex(-1);
        const tagsToShow = isBooleanKeywords 
          ? generateBooleanExamples(aiSuggestedTags)
          : aiSuggestedTags;
        await showKeywordsSequentially(tagsToShow);
        setIsAnimating(false);
      };
      reAnimate();
    }
  }, [isBooleanKeywords]);

  useEffect(() => {
    if (isChatMode && chatContainerRef.current) {
      const { scrollHeight, clientHeight } = chatContainerRef.current;
      chatContainerRef.current.scrollTo({ top: scrollHeight - clientHeight, behavior: 'smooth' });
    }
  }, [chatMessages, isChatMode]);

  useEffect(() => { setShowVeilAnimation(true); }, []);

  const experienceOptions = Array.from({ length: 31 }, (_, i) => i);

  const fetchGenericSuggestions = useCallback((rpcName: string) => async (query: string) => {
    if (query.length < 2) return [];
    const { data, error } = await supabase.rpc(rpcName, { p_organization_id: organizationId, p_search_term: query });
    if (error) { console.error(error); return []; }
    return data.map((item: any) => item.suggestion || item.location || item.skill);
  }, [organizationId]);

  const fetchNameSuggestions = fetchGenericSuggestions('get_name_suggestions');
  const fetchEmailSuggestions = fetchGenericSuggestions('get_email_suggestions');
  const fetchSkillSuggestions = fetchGenericSuggestions('get_org_skills_by_search');
  const fetchCompanySuggestions = fetchGenericSuggestions('get_company_suggestions');
  const fetchEducationSuggestions = fetchGenericSuggestions('get_education_suggestions');
  
  const allIndianCities = useMemo(() => City.getCitiesOfCountry('IN').map(c => c.name), []);
  const fetchLocationSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) return [];
    return allIndianCities.filter(c => c.toLowerCase().includes(query.toLowerCase())).slice(0, 10);
  }, [allIndianCities]);

  const saveSearchHistory = async (keywords: string[]) => {
    if (!jdText.trim() || keywords.length === 0) return;
    try {
      const { data, error } = await supabase.rpc('save_candidate_search_history', {
        p_organization_id: organizationId,
        p_job_title: aiSuggestedJobTitle || (selectedJobId 
          ? jobs.find(j => j.id === selectedJobId)?.title 
          : null),
        p_jd_text: jdText,
        p_selected_job_id: selectedJobId || null,
        p_generated_keywords: keywords,
        p_is_boolean_mode: isBooleanKeywords,
        p_search_filters: null
      });
      if (error) throw error;
      console.log('Search history saved:', data);
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  };

  const handleJobSelect = (jobId: string) => {
    setSelectedJobId(jobId);
    const selectedJob = jobs.find(j => j.id === jobId);
    if (selectedJob && selectedJob.description) setJdText(selectedJob.description);
  };

  const countWords = (text: string): number => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const analyzeJDForTitle = async (jdText: string): Promise<string> => {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-jd-title', {
        body: { jobDescription: jdText }
      });
      if (error) throw error;
      return data.title || '';
    } catch (error) {
      console.error('Error analyzing JD:', error);
      return '';
    }
  };

  useEffect(() => {
    const analyzeJD = async () => {
      if (isChatMode) return;
      if (!jdText.trim() || jdText.length < 20) { setShowJDSuggestion(false); setAiSuggestedJobTitle(''); return; }
      const wordCount = countWords(jdText);
      if (wordCount < 150) {
        setShowJDSuggestion(true);
        setAiSuggestedJobTitle('');
      } else {
        setShowJDSuggestion(false);
        setIsAnalyzingJD(true);
        const title = await analyzeJDForTitle(jdText);
        if (title) setAiSuggestedJobTitle(title);
        setIsAnalyzingJD(false);
      }
    };
    const timer = setTimeout(() => { analyzeJD(); }, 1000);
    return () => clearTimeout(timer);
  }, [jdText, isChatMode]);

  const startJDChat = () => {
    setIsChatMode(true);
    setShowJDSuggestion(false);
    setShowDynamicSuggestions(true);
    setJdContext(null);
    setDynamicSuggestions([
        'Senior Python Developer, 5-8 years, hybrid Bangalore',
        'Frontend Engineer with React, 3-5 years, remote',
        'Full Stack Developer, Node.js, 4-6 years, Mumbai',
        'DevOps Engineer, AWS, 6-10 years, Pune'
    ]);
    setChatMessages([{
      id: 'intro',
      role: 'assistant',
      content: "Hi! I'll help you draft a great job description. You can describe the role in your own words, or pick a template below. Just tell me what you're looking for!"
    }]);
  };

  const parseUserIntent = async (userInput: string, existingContext: any = null) => {
    try {
      const { data, error } = await supabase.functions.invoke('parse-jd-intent-deepseek', {
        body: { userInput, conversationContext: existingContext }
      });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error parsing intent:', error);
      return null;
    }
  };

  const generateJDFromContext = async (context: any) => {
    try {
      const payload = {
        jobTitle: context.jobTitle, department: context.department, location: context.location,
        employmentType: context.workMode,
        experienceRange: context.experienceMin && context.experienceMax 
          ? `${context.experienceMin}-${context.experienceMax} years` : null,
        seniority: context.seniority, primarySkills: context.primarySkills?.join(', '),
        secondarySkills: context.secondarySkills?.join(', '),
        responsibilities: context.responsibilities?.join('; '),
        education: context.education?.join(', '), certifications: context.certifications?.join(', '),
        industry: context.industry,
        salary: context.salaryMin && context.salaryMax ? `₹${context.salaryMin}-${context.salaryMax} LPA` : null,
        positionCount: context.positionCount, timeline: context.timeline
      };
      const { data, error } = await supabase.functions.invoke('generate-jd-from-prompts', {
        body: { answers: payload }
      });
      if (error) throw error;
      return data.fullJD;
    } catch (error) {
      console.error('Error generating JD:', error);
      return null;
    }
  };

  const handleSuggestionClick = async (suggestion: string) => {
    setChatInput(suggestion);
    setShowDynamicSuggestions(false);
    const userMsg: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: suggestion };
    setChatMessages(prev => [...prev, userMsg]);
    setIsProcessingIntent(true);
    try {
      const parsed = await parseUserIntent(suggestion, jdContext);
      if (!parsed) {
        setChatMessages(prev => [...prev, { id: `error-${Date.now()}`, role: 'assistant', content: "Sorry, I had trouble understanding that. Could you rephrase?" }]);
        setIsProcessingIntent(false); return;
      }
      const updatedContext = { ...(jdContext || {}), ...parsed.extracted };
      setJdContext(updatedContext);
      if (parsed.canGenerateDraft) {
        setChatMessages(prev => [...prev, { id: `processing-${Date.now()}`, role: 'system', content: "✨ Great! I have enough information. Generating your job description..." }]);
        setIsGeneratingFullJD(true);
        const generatedJD = await generateJDFromContext(updatedContext);
        setIsGeneratingFullJD(false);
        if (generatedJD) {
          setJdText(generatedJD);
          setIsChatMode(false);
          setChatMessages(prev => [...prev, { id: `success-${Date.now()}`, role: 'assistant', content: "✅ Done! Your job description is ready." }]);
        }
      } else if (parsed.needsClarification && parsed.suggestedQuestion) {
        setChatMessages(prev => [...prev, { id: `clarify-${Date.now()}`, role: 'assistant', content: parsed.suggestedQuestion }]);
      }
      setIsProcessingIntent(false);
    } catch (error) {
      console.error('❌ Suggestion processing error:', error);
      setChatMessages(prev => [...prev, { id: `error-${Date.now()}`, role: 'assistant', content: "Something went wrong. Please try again." }]);
      setIsProcessingIntent(false);
    }
  };

  const handleChatSubmit = async () => {
    const userInput = chatInput.trim();
    if (!userInput) return;
    const userMsg: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: userInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setShowDynamicSuggestions(false);
    setIsProcessingIntent(true);
    try {
      const parsed = await parseUserIntent(userInput, jdContext);
      if (!parsed) {
        setChatMessages(prev => [...prev, { id: `error-${Date.now()}`, role: 'assistant', content: "Sorry, I had trouble understanding that. Could you rephrase?" }]);
        setIsProcessingIntent(false); return;
      }
      const updatedContext = { ...(jdContext || {}), ...parsed.extracted };
      setJdContext(updatedContext);
      if (parsed.canGenerateDraft) {
        setChatMessages(prev => [...prev, { id: `processing-${Date.now()}`, role: 'system', content: "✨ Great! I have enough information. Generating your job description..." }]);
        setIsGeneratingFullJD(true);
        const generatedJD = await generateJDFromContext(updatedContext);
        setIsGeneratingFullJD(false);
        if (generatedJD) {
          setJdText(generatedJD);
          setIsChatMode(false);
          setChatMessages(prev => [...prev, { id: `success-${Date.now()}`, role: 'assistant', content: "✅ Done! Your job description is ready." }]);
        }
      } else if (parsed.needsClarification && parsed.suggestedQuestion) {
        setChatMessages(prev => [...prev, { id: `clarify-${Date.now()}`, role: 'assistant', content: parsed.suggestedQuestion }]);
        setShowDynamicSuggestions(true);
      } else {
        setChatMessages(prev => [...prev, { id: `ack-${Date.now()}`, role: 'assistant', content: "Got it! What else can you tell me about this role?" }]);
        setShowDynamicSuggestions(true);
      }
      setIsProcessingIntent(false);
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [...prev, { id: `error-${Date.now()}`, role: 'assistant', content: "Something went wrong. Please try again." }]);
      setIsProcessingIntent(false);
    }
  };

  const generateBooleanExamples = (keywords: string[]): string[] => {
    if (keywords.length === 0) return [];
    const examples: string[] = [];
    if (keywords.length >= 2) {
      const orGroup = keywords.slice(0, Math.min(3, keywords.length)).map(k => `"${k}"`).join(' OR ');
      examples.push(`(${orGroup})`);
    }
    if (keywords.length >= 2) {
      const firstTwo = keywords.slice(0, 2).map(k => `"${k}"`).join(' AND ');
      examples.push(firstTwo);
    }
    if (keywords.length >= 4) {
      const orPart = keywords.slice(0, 2).map(k => `"${k}"`).join(' OR ');
      const andKeyword = `"${keywords[2]}"`;
      examples.push(`(${orPart}) AND ${andKeyword}`);
    }
    if (keywords.length >= 3) {
      const mainKeyword = `"${keywords[0]}"`;
      const notKeyword = keywords[keywords.length - 1];
      examples.push(`${mainKeyword} NOT "${notKeyword}"`);
    }
    if (keywords.length >= 2) {
      const lastTwo = keywords.slice(-2).map(k => `"${k}"`).join(' AND ');
      examples.push(lastTwo);
    }
    return examples;
  };

  const showKeywordsSequentially = async (keywords: string[]) => {
    setVisibleKeywordsCount(0);
    for (let i = 0; i < keywords.length; i++) {
      setVisibleKeywordsCount(i + 1);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  };

  const typewriterText = async (text: string, callback: (partial: string) => void) => {
    for (let i = 0; i <= text.length; i++) {
      callback(text.substring(0, i));
      await new Promise(resolve => setTimeout(resolve, 20));
    }
  };

  const runAnalysisStages = async (keywords: string[]) => {
    const stages = [
      { stage: 'analyzing', title: 'Analyzing Job Description', description: 'AI is reading and understanding the job requirements...', isComplete: false, icon: '🔍' },
      { stage: 'extracting', title: 'Extracting Key Information', description: 'Identifying critical skills, qualifications, and experience needed...', isComplete: false, icon: '📊' },
      { stage: 'processing', title: 'Processing Keywords', description: `Found ${keywords.length} relevant keywords for your search...`, isComplete: false, icon: '⚡' },
    ];
    setAnalysisStages([]);
    setCurrentStageIndex(-1);
    setShowStages(true);
    for (let i = 0; i < stages.length; i++) {
      setCurrentStageIndex(i);
      const newStage = { ...stages[i], title: '', description: '' };
      setAnalysisStages(prev => [...prev, newStage]);
      await typewriterText(stages[i].title, (partial) => {
        setAnalysisStages(prev => { const updated = [...prev]; updated[i] = { ...updated[i], title: partial }; return updated; });
      });
      await new Promise(resolve => setTimeout(resolve, 200));
      await typewriterText(stages[i].description, (partial) => {
        setAnalysisStages(prev => { const updated = [...prev]; updated[i] = { ...updated[i], description: partial }; return updated; });
      });
      setAnalysisStages(prev => { const updated = [...prev]; updated[i] = { ...updated[i], isComplete: true }; return updated; });
      if (i < stages.length - 1) await new Promise(resolve => setTimeout(resolve, 500));
    }
    await new Promise(resolve => setTimeout(resolve, 500));
    setShowStages(false);
    await new Promise(resolve => setTimeout(resolve, 300));
    setAnalysisStages([]);
    setCurrentStageIndex(-1);
  };

  const handleGenerateBoolean = async () => {
    if (!jdText.trim()) return;
    setIsGeneratingBoolean(true);
    setAnimatedTags([]);
    setAiSuggestedTags([]);
    setAnalysisStages([]);
    setCurrentStageIndex(-1);
    setShowStages(true);
    setVisibleKeywordsCount(0);
    try {
      const { data, error } = await supabase.functions.invoke('generate-boolean-search-4o', {
        body: { jobDescription: jdText }
      });
      if (error) throw error;
      const generatedTags = data.keywords || [];
      setAiSuggestedTags(generatedTags);
      await saveSearchHistory(generatedTags);
      setIsAnimating(true);
      await runAnalysisStages(generatedTags);
      await showKeywordsSequentially(generatedTags);
      setIsAnimating(false);
    } catch (error) {
      console.error("Error generating keywords:", error);
      setIsAnimating(false);
      setAnimatedTags([]);
      setAnalysisStages([]);
      setShowStages(false);
    } finally {
      setIsGeneratingBoolean(false);
    }
  };

  const handleAddAiTag = (tagToAdd: string) => {
    if (isBooleanKeywords) {
      setSelectedBooleanPatterns(prev => {
        const exists = prev.some(t => t.value === tagToAdd);
        if (exists) return prev;
        return [...prev, { value: tagToAdd, mandatory: false }];
      });
      return;
    }
    setKeywords(prev => {
      const exists = prev.some(t => t.value.toLowerCase() === tagToAdd.toLowerCase());
      if (exists) return prev;
      return [...prev, { value: tagToAdd, mandatory: false }];
    });
    setAiSuggestedTags(prev => prev.filter(t => t !== tagToAdd));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalKeywords = keywords;
    if (isBooleanKeywords) {
      if (selectedBooleanPatterns.length > 0) {
        if (selectedBooleanPatterns.length === 1) {
          finalKeywords = [{ value: selectedBooleanPatterns[0].value, mandatory: true }];
        } else {
          const combinedPattern = selectedBooleanPatterns.map(p => `(${p.value})`).join(' OR ');
          finalKeywords = [{ value: combinedPattern, mandatory: true }];
        }
      } else if (booleanKeywords.trim()) {
        finalKeywords = [{ value: booleanKeywords, mandatory: true }];
      }
    }
    let finalDesignation = currentDesignation;
    if (isBooleanDesignation && booleanDesignation.trim()) finalDesignation = booleanDesignation;
    onSearch({
      name, email, keywords: finalKeywords, skills, educations, locations,
      companies: pastCompanies, current_company: currentCompany, current_designation: finalDesignation,
      min_exp: minExp ? parseInt(minExp) : null, max_exp: maxExp ? parseInt(maxExp) : null,
      min_current_salary: minCurrentSalary ? parseFloat(minCurrentSalary) : null,
      max_current_salary: maxCurrentSalary ? parseFloat(maxCurrentSalary) : null,
      min_expected_salary: minExpectedSalary ? parseFloat(minExpectedSalary) : null,
      max_expected_salary: maxExpectedSalary ? parseFloat(maxExpectedSalary) : null,
      notice_periods: noticePeriod, date_posted: datePosted, jd_text: jdText,
      jd_job_title: aiSuggestedJobTitle, jd_selected_job_id: selectedJobId,
      jd_generated_keywords: aiSuggestedTags, jd_is_boolean_mode: isBooleanKeywords,
    });
  };

  const displayTags = useMemo(() => {
    if (aiSuggestedTags.length === 0) return [];
    const tagsToShow = isBooleanKeywords ? generateBooleanExamples(aiSuggestedTags) : aiSuggestedTags;
    return tagsToShow.slice(0, visibleKeywordsCount);
  }, [aiSuggestedTags, isBooleanKeywords, visibleKeywordsCount]);

  return (
    <div className={cn("zxf-root", !hideHero && "pb-10")}>
      <style>{`
        /* ═══════════════════════════════════════════
           ZIVE-X FILTER — REFINED COMPACT SYSTEM v2
           ═══════════════════════════════════════════ */
        .zxf-root {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          --brand:        #6C2BD9;
          --brand-light:  #F3EEFF;
          --brand-mid:    #DDD6FE;
          --brand-dark:   #5519C0;
          --text-primary: #0F172A;
          --text-sub:     #475569;
          --text-muted:   #94A3B8;
          --border:       #E2E8F0;
          --border-focus: #A78BFA;
          --surface:      #FFFFFF;
          --surface-alt:  #F8F9FB;
          --r:            8px;
          --r-sm:         5px;
          --t:            130ms cubic-bezier(0.4,0,0.2,1);
        }

        /* ── HERO (DARK AI — UNTOUCHED) ── */
        .gemini-card {
          position: relative; background: #000; border-radius: 20px; overflow: hidden;
          border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 50px rgba(0,0,0,0.5);
          min-height: 480px; display: flex; flex-direction: column;
        }
        .gemini-card-veil { position: absolute; inset: 0; z-index: 0; }
        .gemini-card-inner {
          position: relative; z-index: 0; width: 100%; height: 100%;
          display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 36px;
        }
        .hero-badge {
          background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white;
          padding: 5px 14px; border-radius: 20px; font-size: 11px; font-weight: 500; margin-bottom: 20px;
          backdrop-filter: blur(5px); display: inline-flex; align-items: center; gap: 6px;
        }
        .hero-title {
          font-size: 2.5rem; line-height: 1.1; font-weight: 700; text-align: center; color: white;
          margin-bottom: 24px; letter-spacing: -0.03em; text-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .gemini-textarea-container { width: 100%; max-width: 580px; position: relative; margin-bottom: 16px; }
        .gemini-textarea {
          width: 100%; min-height: 110px; padding: 18px 20px; border-radius: 18px; font-size: 15px;
          line-height: 1.5; color: white; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
          backdrop-filter: blur(12px); resize: vertical; transition: all 0.3s ease;
        }
        .gemini-textarea:focus { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.4); box-shadow: 0 0 0 4px rgba(255,255,255,0.1); outline: none; }
        .gemini-textarea::placeholder { color: rgba(255,255,255,0.45); }
        .gemini-action-buttons { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; width: 100%; }
        .gemini-action-btn {
          height: 40px; padding: 0 20px; display: flex; align-items: center; justify-content: center;
          gap: 7px; border-radius: 99px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;
        }
        .gemini-action-btn.primary { background: white; color: black; border: none; }
        .gemini-action-btn.primary:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(255,255,255,0.2); }
        .gemini-action-btn:not(.primary) { background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1); }
        .gemini-action-btn:not(.primary):hover { background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.3); }
        .chat-container { background: rgba(0,0,0,0.4); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.1); border-radius: 18px; }
        .suggestions-container { margin-top: 12px; max-height: 280px; overflow-y: auto; }
        .suggestions-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; color: rgba(255,255,255,0.6); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .suggestion-tag { background: linear-gradient(135deg,rgba(119,49,232,0.15),rgba(168,85,247,0.15)); border: 1px solid rgba(119,49,232,0.3); color: white; padding: 10px 14px; border-radius: 10px; cursor: pointer; transition: all 0.25s cubic-bezier(0.4,0,0.2,1); font-size: 12.5px; line-height: 1.4; margin-bottom: 6px; display: block; text-align: left; }
        .suggestion-tag:hover { background: linear-gradient(135deg,rgba(119,49,232,0.3),rgba(168,85,247,0.3)); border-color: rgba(119,49,232,0.6); transform: translateX(4px); box-shadow: 0 4px 12px rgba(119,49,232,0.3); }
        .suggestions-container::-webkit-scrollbar { width: 4px; }
        .suggestions-container::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); }
        .suggestions-container::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
        .test-mode-badge { background: rgba(234,179,8,0.1); border: 1px solid rgba(234,179,8,0.3); border-radius: 10px; padding: 8px 12px; margin-bottom: 10px; font-size: 10.5px; color: #fbbf24; display: flex; flex-direction: column; gap: 3px; }
        .test-metric { display: flex; justify-content: space-between; opacity: 0.8; }

        /* ─────────────────────────────────
           FILTER PANEL
           ───────────────────────────────── */
        .zxf-panel { background: var(--surface); }

        /* Core filters section — tighter gradient strip */
        .zxf-search-section {
          padding: 12px 14px 14px;
          background: linear-gradient(160deg, #FAFBFF 0%, #F4EFFE 100%);
          border-bottom: 1px solid var(--border);
          position: relative;
        }
        .zxf-search-section::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, var(--brand), #a855f7, var(--brand));
          background-size: 200% 100%;
          animation: zxf-shim 3s linear infinite;
        }
        @keyframes zxf-shim { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

        /* ── FIELD ── */
        .zxf-field { display: flex; flex-direction: column; gap: 4px; }

        /* ── LABEL ── */
        .zxf-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.55px;
          text-transform: uppercase;
          color: var(--text-sub);
          display: flex;
          align-items: center;
          justify-content: space-between;
          line-height: 1;
        }

        /* ── INPUT WRAPPER (border + focus ring lives here) ── */
        .zxf-wrap {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--r);
          transition: border-color var(--t), box-shadow var(--t);
          overflow: visible;
        }
        .zxf-wrap:focus-within {
          border-color: var(--border-focus);
          box-shadow: 0 0 0 2.5px rgba(108,43,217,0.13);
        }

        /* ── BARE TEXT INPUT ── */
        .zxf-input {
          height: 32px;
          width: 100%;
          padding: 0 10px;
          font-size: 12.5px;
          color: var(--text-primary);
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--r);
          transition: border-color var(--t), box-shadow var(--t);
        }
        .zxf-input:focus {
          outline: none;
          border-color: var(--border-focus);
          box-shadow: 0 0 0 2.5px rgba(108,43,217,0.13);
        }
        .zxf-input::placeholder { color: var(--text-muted); font-size: 12px; }

        /* ── 2-COL GRID ── */
        .zxf-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }

        /* ── SELECT OVERRIDE ── */
        .zxf-sel {
          height: 32px !important;
          font-size: 12.5px !important;
          border: 1px solid var(--border) !important;
          border-radius: var(--r) !important;
          background: var(--surface) !important;
          padding: 0 10px !important;
          box-shadow: none !important;
          transition: border-color var(--t), box-shadow var(--t) !important;
        }
        .zxf-sel:focus, .zxf-sel[data-state=open] {
          border-color: var(--border-focus) !important;
          box-shadow: 0 0 0 2.5px rgba(108,43,217,0.13) !important;
          outline: none !important;
        }

        /* ── INFO STRIP (replaces big box) ── */
        .zxf-info {
          display: flex; align-items: flex-start; gap: 6px;
          padding: 6px 8px;
          background: var(--brand-light);
          border: 1px solid var(--brand-mid);
          border-radius: var(--r-sm);
          margin-top: 4px;
        }
        .zxf-info p { margin: 0; font-size: 11px; line-height: 1.4; color: #5521B5; }

        /* ── MINI TOGGLE ── */
        .zxf-bool-row { display: flex; align-items: center; gap: 5px; }
        .zxf-bool-lbl {
          font-size: 9.5px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.4px; color: var(--text-muted); transition: color var(--t);
        }
        .zxf-bool-lbl.on { color: var(--brand); }
        .zxf-sw { position: relative; display: inline-block; width: 30px; height: 17px; flex-shrink: 0; }
        .zxf-sw input { opacity: 0; width: 0; height: 0; }
        .zxf-sl {
          position: absolute; cursor: pointer; inset: 0;
          background: #CBD5E1; border-radius: 34px; transition: .25s;
        }
        .zxf-sl::before {
          content: ''; position: absolute; height: 12px; width: 12px;
          left: 2.5px; bottom: 2.5px; background: white; border-radius: 50%;
          transition: .25s; box-shadow: 0 1px 3px rgba(0,0,0,0.18);
        }
        input:checked + .zxf-sl { background: var(--brand); }
        input:checked + .zxf-sl::before { transform: translateX(13px); }

        /* ── ACCORDION ── */
        .zxf-acc { border-top: 1px solid var(--border); }
        .zxf-acc-hd {
          padding: 9px 14px;
          cursor: pointer; display: flex; justify-content: space-between; align-items: center;
          user-select: none; transition: background var(--t);
        }
        .zxf-acc-hd:hover { background: var(--surface-alt); }
        .zxf-acc-hd span { font-size: 12px; font-weight: 600; color: var(--text-primary); }
        .zxf-acc-body {
          padding: 0 14px 12px;
          display: flex; flex-direction: column; gap: 8px;
          animation: zxf-drop 0.18s ease-out;
        }
        @keyframes zxf-drop { from{opacity:0;transform:translateY(-5px)} to{opacity:1;transform:translateY(0)} }

        /* ── NOTICE CHIPS ── */
        .zxf-chips { display: flex; flex-wrap: wrap; gap: 5px; }
        .zxf-chip {
          padding: 3px 9px; border-radius: 99px;
          border: 1px solid var(--border); font-size: 11px; font-weight: 500;
          color: var(--text-sub); background: var(--surface); cursor: pointer;
          transition: all var(--t); line-height: 1.5;
        }
        .zxf-chip[data-state=on] {
          background: var(--brand-light); border-color: var(--brand);
          color: var(--brand); font-weight: 600;
        }
        .zxf-chip:hover:not([data-state=on]) { border-color: var(--border-focus); color: var(--brand); }

        /* ── SUBMIT BAR ── */
        .zxf-foot {
          padding: 10px 14px;
          border-top: 1px solid var(--border);
          background: var(--surface);
          position: sticky; bottom: 0; z-index: 5;
        }
        .zxf-btn {
          width: 100%; height: 36px;
          border-radius: var(--r);
          background: var(--brand); color: white;
          font-size: 12.5px; font-weight: 600; letter-spacing: 0.15px;
          border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 6px;
          box-shadow: 0 2px 6px rgba(108,43,217,0.28);
          transition: all var(--t);
        }
        .zxf-btn:hover:not(:disabled) { background: var(--brand-dark); box-shadow: 0 4px 12px rgba(108,43,217,0.36); transform: translateY(-1px); }
        .zxf-btn:active:not(:disabled) { transform: none; }
        .zxf-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        /* ── KEYWORD TAGS PANEL (hero area) ── */
        .zxf-tags-panel {
          margin-top: 14px; width: 100%;
          background: rgba(0,0,0,0.4); backdrop-filter: blur(12px);
          border-radius: 14px; padding: 12px 14px; border: 1px solid rgba(255,255,255,0.1);
          animation: zxf-up 0.3s ease-out;
        }
        @keyframes zxf-up { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .zxf-tag-pill {
          display: inline-flex; align-items: center; gap: 4px; font-size: 11px;
          background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.2);
          padding: 3px 10px; border-radius: 99px; cursor: pointer; transition: all 0.2s; font-family: monospace;
        }
        .zxf-tag-pill:hover { background: rgba(168,85,247,0.4); border-color: rgba(168,85,247,0.6); transform: translateY(-1px); }

        /* ── RESET OVERRIDES ── */
        .zxf-root input:focus { outline: none !important; }
        .zxf-wrap > div { background: transparent !important; border: none !important; box-shadow: none !important; }
      `}</style>

      <form onSubmit={handleSubmit}>
        {/* ── DARK HERO AI SECTION (untouched per Jira) ── */}
        {!hideHero && (
          <div className="gemini-card m-4 md:m-6 mb-10">
            <div className="gemini-card-veil"><DarkVeil /></div>
            <div className="gemini-card-inner">
              {!isChatMode && !jdText && (
                <div className="flex flex-col items-center animate-in fade-in zoom-in duration-1000 mb-5">
                  <div className="hero-badge">
                    <Sparkles className="w-3 h-3 text-purple-300" />
                    <span>AI Recruiting</span>
                  </div>
                  {userName && <h1 className="hero-title max-w-xl">Welcome {userName}</h1>}
                </div>
              )}

              <div className="gemini-textarea-container">
                {isChatMode ? (
                  <div className="chat-container h-[460px] flex flex-col">
                    <div className="flex justify-between items-center p-3 border-b border-white/10 bg-white/5">
                      <span className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-2">
                        <Bot className="w-4 h-4" /> AI Assistant
                        {isTestMode && <span className="bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded text-[10px]">TEST MODE</span>}
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => {setIsChatMode(false); setShowDynamicSuggestions(false);}} className="h-6 w-6 p-0 hover:bg-white/10 rounded-full text-white">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="chat-messages flex-1 overflow-y-auto p-3" ref={chatContainerRef}>
                      {isTestMode && testDebugInfo && (
                        <div className="test-mode-badge animate-in slide-in-from-top-2">
                          <div className="flex items-center gap-2 font-bold border-b border-yellow-500/20 pb-1 mb-1">
                            <Activity className="w-3 h-3" /> LIVE BUDGET TRACKING
                          </div>
                          <div className="test-metric"><span>Requests:</span><span>{testDebugInfo.requestNumber} / {testDebugInfo.remainingRequests + testDebugInfo.requestNumber}</span></div>
                          <div className="test-metric"><span>Spent:</span><span>${Number(testDebugInfo.totalSpent).toFixed(4)} / $2.12</span></div>
                          <div className="w-full bg-yellow-900/30 h-1.5 rounded-full mt-1 overflow-hidden">
                            <div className="bg-yellow-500 h-full transition-all duration-500" style={{ width: `${testDebugInfo.percentUsed}%` }}></div>
                          </div>
                        </div>
                      )}
                      {chatMessages.map((msg) => (
                        <div key={msg.id} className={cn("mb-3 p-3 rounded-xl text-sm max-w-[85%]",
                          msg.role === 'assistant' ? "bg-white/10 text-white" :
                          msg.role === 'system' ? "bg-purple-500/20 text-purple-200 text-center max-w-full mx-auto" :
                          "bg-[#7731E8] text-white ml-auto")}>
                          {msg.content}
                        </div>
                      ))}
                      {showDynamicSuggestions && (
                        <div className="suggestions-container">
                          <div className="suggestions-header flex justify-between">
                            <div className="flex items-center gap-2">
                              <Lightbulb className="w-3 h-3" />
                              <span>{chatInput.length > 0 ? 'AI Suggestions:' : 'Try these examples:'}</span>
                            </div>
                            {isGeneratingSuggestions && <Loader2 className="w-3 h-3 animate-spin" />}
                          </div>
                          {isGeneratingSuggestions && dynamicSuggestions.length === 0 ? (
                            <div className="space-y-2 opacity-50">
                              <div className="h-7 bg-white/10 rounded-lg w-3/4 animate-pulse"></div>
                              <div className="h-7 bg-white/10 rounded-lg w-1/2 animate-pulse"></div>
                            </div>
                          ) : (
                            dynamicSuggestions.map((suggestion, idx) => (
                              <button key={idx} type="button" onClick={() => handleSuggestionClick(suggestion)} className="suggestion-tag">{suggestion}</button>
                            ))
                          )}
                        </div>
                      )}
                      {isProcessingIntent && (
                        <div className="flex items-center gap-2 text-white/60 text-sm mt-3">
                          <Loader2 className="w-4 h-4 animate-spin" /><span>Analyzing...</span>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                    <div className="p-3 border-t border-white/10 flex gap-2">
                      <input
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-purple-400"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Describe the role..."
                        onKeyDown={(e) => { if (e.key === 'Enter' && !isProcessingIntent && !isGeneratingFullJD) handleChatSubmit(); }}
                        disabled={isProcessingIntent || isGeneratingFullJD}
                      />
                      <Button type="button" size="sm" onClick={handleChatSubmit} disabled={isProcessingIntent || isGeneratingFullJD} className="bg-[#7731E8] hover:bg-[#6228c2]">
                        {isProcessingIntent ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <textarea value={jdText} onChange={(e) => setJdText(e.target.value)}
                    placeholder="Paste your Job Description here, or ask AI to help you draft one..." className="gemini-textarea" />
                )}
              </div>

              {!isChatMode && (
                <div className="gemini-action-buttons">
                  <input ref={fileInputRef} type="file" accept=".txt,.doc,.docx,.pdf" onChange={handleFileUpload} className="hidden" />
                  <button type="button" className="gemini-action-btn" onClick={() => fileInputRef.current?.click()}><Upload className="w-4 h-4" /> Upload JD</button>
                  <button type="button" className="gemini-action-btn" onClick={startJDChat}><Wand2 className="w-4 h-4" /> Draft with AI</button>
                  <Popover open={openJobCombobox} onOpenChange={setOpenJobCombobox}>
                    <PopoverTrigger asChild>
                      <button type="button" className="gemini-action-btn"><FileText className="w-4 h-4" /> Select Job</button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[280px] p-0 bg-gray-900 border-gray-700 text-white">
                      <Command className="bg-transparent">
                        <CommandInput placeholder="Search job..." className="text-white placeholder:text-gray-500" />
                        <CommandList>
                          <CommandEmpty>No jobs found.</CommandEmpty>
                          <CommandGroup>
                            {jobs.map((job: any) => (
                              <CommandItem key={job.id} value={job.title} onSelect={() => { handleJobSelect(job.id); setOpenJobCombobox(false); }} className="text-white aria-selected:bg-white/10">{job.title}</CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <button type="button" className="gemini-action-btn primary" onClick={handleGenerateBoolean} disabled={!jdText.trim() || isGeneratingBoolean}>
                    {isGeneratingBoolean ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {isGeneratingBoolean ? 'Generating...' : 'Generate Keywords'}
                  </button>
                </div>
              )}

              {!isChatMode && (isGeneratingBoolean || displayTags.length > 0) && (
                <div className="zxf-tags-panel mt-6 max-w-3xl w-full">
                  <div className="flex justify-between items-center mb-2 px-1">
                    <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Generated Keywords</span>
                    <button type="button" onClick={() => {setAiSuggestedTags([]); setAnimatedTags([]);}} className="text-gray-400 hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {displayTags.map((tag, idx) => (
                      <button key={idx} type="button" onClick={() => handleAddAiTag(tag)} className="zxf-tag-pill">
                        <span>{tag}</span>
                        <span className="opacity-0 group-hover:opacity-100 text-[10px]">+</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── COMPACT FILTER PANEL ── */}
        <div className="zxf-panel">

          {/* ── CORE FILTERS ── */}
          <div className="zxf-search-section" style={{display:'flex',flexDirection:'column',gap:'10px'}}>

            {/* Keywords */}
            <div className="zxf-field">
              <div className="zxf-label">
                <span>Keywords</span>
                <div className="zxf-bool-row">
                  <span className={`zxf-bool-lbl ${isBooleanKeywords ? 'on' : ''}`}>Boolean</span>
                  <label className="zxf-sw">
                    <input type="checkbox" checked={isBooleanKeywords} onChange={(e) => { setIsBooleanKeywords(e.target.checked); if (!e.target.checked) setSelectedBooleanPatterns([]); }} />
                    <span className="zxf-sl" />
                  </label>
                </div>
              </div>
              <div className="zxf-wrap">
                {isBooleanKeywords
                  ? <MandatoryTagSelector value={selectedBooleanPatterns} onChange={setSelectedBooleanPatterns} placeholder="Add boolean patterns..." disableSuggestions={true} />
                  : <MandatoryTagSelector value={keywords} onChange={setKeywords} placeholder="Skills, role, company..." disableSuggestions={true} />
                }
              </div>
              <div className="zxf-info">
                <Info className="w-3 h-3 text-[#6C2BD9] flex-shrink-0 mt-px" />
                <p>Tip: many candidates omit IT skills — keywords cast a wider net.</p>
              </div>
            </div>

            {/* Experience */}
            <div className="zxf-field">
              <label className="zxf-label">Experience</label>
              <div className="zxf-2col">
                <Select value={minExp} onValueChange={setMinExp}>
                  <SelectTrigger className="zxf-sel"><SelectValue placeholder="Min yrs" /></SelectTrigger>
                  <SelectContent>{experienceOptions.map(y => <SelectItem key={y} value={y.toString()}>{y} yr{y !== 1 ? 's' : ''}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={maxExp} onValueChange={setMaxExp}>
                  <SelectTrigger className="zxf-sel"><SelectValue placeholder="Max yrs" /></SelectTrigger>
                  <SelectContent>{experienceOptions.map(y => <SelectItem key={y} value={y.toString()}>{y} yr{y !== 1 ? 's' : ''}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Location */}
            <div className="zxf-field">
              <label className="zxf-label">Location</label>
              <div className="zxf-wrap">
                <MandatoryTagSelector value={locations} onChange={setLocations} placeholder="City or remote..." fetchSuggestions={fetchLocationSuggestions} queryKey="locationSuggestions" />
              </div>
            </div>
          </div>

          {/* ── EMPLOYMENT ── */}
          <div className="zxf-acc">
            <div className="zxf-acc-hd" onClick={() => setShowEmployment(!showEmployment)}>
              <span>Employment</span>
              {showEmployment ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
            </div>
            {showEmployment && (
              <div className="zxf-acc-body">
                <div className="zxf-field">
                  <label className="zxf-label">Skills</label>
                  <div className="zxf-wrap">
                    <MandatoryTagSelector value={skills} onChange={setSkills} placeholder="Filter by skills..." fetchSuggestions={fetchSkillSuggestions} queryKey="skillSuggestions" />
                  </div>
                </div>
                <div className="zxf-field">
                  <label className="zxf-label">Current Company</label>
                  <input className="zxf-input" placeholder="e.g. Infosys" value={currentCompany} onChange={e => setCurrentCompany(e.target.value)} />
                </div>
                <div className="zxf-field">
                  <div className="zxf-label">
                    <span>Designation</span>
                    <div className="zxf-bool-row">
                      <span className={`zxf-bool-lbl ${isBooleanDesignation ? 'on' : ''}`}>Advanced</span>
                      <label className="zxf-sw">
                        <input type="checkbox" checked={isBooleanDesignation} onChange={e => setIsBooleanDesignation(e.target.checked)} />
                        <span className="zxf-sl" />
                      </label>
                    </div>
                  </div>
                  <input
                    className="zxf-input"
                    placeholder={isBooleanDesignation ? '"Engineer" OR "Developer"' : 'e.g. Senior Engineer'}
                    value={isBooleanDesignation ? booleanDesignation : currentDesignation}
                    onChange={e => isBooleanDesignation ? setBooleanDesignation(e.target.value) : setCurrentDesignation(e.target.value)}
                  />
                </div>
                <div className="zxf-field">
                  <label className="zxf-label">Past Companies</label>
                  <div className="zxf-wrap">
                    <MandatoryTagSelector value={pastCompanies} onChange={setPastCompanies} placeholder="e.g. Google, TCS..." fetchSuggestions={fetchCompanySuggestions} queryKey="companySuggestions" />
                  </div>
                </div>
                <div className="zxf-field">
                  <label className="zxf-label">Notice Period</label>
                  <ToggleGroup type="multiple" value={noticePeriod} onValueChange={setNoticePeriod} className="zxf-chips justify-start flex-wrap">
                    {["Immediate", "15 Days", "1 Month", "2 Months", "3 Months+"].map(p => (
                      <ToggleGroupItem key={p} value={p} className="zxf-chip">{p}</ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
              </div>
            )}
          </div>

          {/* ── EDUCATION ── */}
          <div className="zxf-acc">
            <div className="zxf-acc-hd" onClick={() => setShowEducation(!showEducation)}>
              <span>Education</span>
              {showEducation ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
            </div>
            {showEducation && (
              <div className="zxf-acc-body">
                <div className="zxf-field">
                  <label className="zxf-label">Qualification</label>
                  <div className="zxf-wrap">
                    <MandatoryTagSelector value={educations} onChange={setEducations} placeholder="Degree, institution..." fetchSuggestions={fetchEducationSuggestions} queryKey="educationSuggestions" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── COMPENSATION ── */}
          <div className="zxf-acc">
            <div className="zxf-acc-hd" onClick={() => setShowCompensation(!showCompensation)}>
              <span>Compensation</span>
              {showCompensation ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
            </div>
            {showCompensation && (
              <div className="zxf-acc-body">
                <div className="zxf-field">
                  <label className="zxf-label">Current CTC (Lacs)</label>
                  <div className="zxf-2col">
                    <input type="number" placeholder="Min" className="zxf-input" value={minCurrentSalary} onChange={e => setMinCurrentSalary(e.target.value)} />
                    <input type="number" placeholder="Max" className="zxf-input" value={maxCurrentSalary} onChange={e => setMaxCurrentSalary(e.target.value)} />
                  </div>
                </div>
                <div className="zxf-field">
                  <label className="zxf-label">Expected CTC (Lacs)</label>
                  <div className="zxf-2col">
                    <input type="number" placeholder="Min" className="zxf-input" value={minExpectedSalary} onChange={e => setMinExpectedSalary(e.target.value)} />
                    <input type="number" placeholder="Max" className="zxf-input" value={maxExpectedSalary} onChange={e => setMaxExpectedSalary(e.target.value)} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── SUBMIT ── */}
          <div className="zxf-foot">
            <button type="submit" disabled={isSearching} className="zxf-btn">
              {isSearching
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching...</>
                : <><Sparkles className="w-3.5 h-3.5" /> Search Candidates</>
              }
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CandidateSearchFilters;