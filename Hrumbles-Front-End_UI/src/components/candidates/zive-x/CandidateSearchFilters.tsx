// src/components/candidates/zive-x/CandidateSearchFilters.tsx
// ENHANCED: Dynamic suggestions, auto-complete, and fluid AI experience

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
  // Entry-level roles for freshers/juniors
  entryRoles: [
    'Junior Software Engineer', 'Trainee Software Engineer', 'Associate Software Engineer',
    'Junior Frontend Developer', 'Junior Backend Developer', 'Junior Full Stack Developer',
    'Junior Python Developer', 'Junior Java Developer', 'Junior React Developer',
    'Software Development Intern', 'Engineering Trainee',
    'Junior QA Engineer', 'Junior Data Analyst', 'Associate Data Engineer',
    'Frontend Intern', 'Backend Intern', 'UI/UX Design Intern'
  ],
  
  // Mid-level roles (1-5 years)
  midRoles: [
    'Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
    'Python Developer', 'Java Developer', 'JavaScript Developer', 'React Developer',
    'Node.js Developer', 'Angular Developer', 'Vue.js Developer',
    'DevOps Engineer', 'Cloud Engineer',
    'Data Analyst', 'Data Engineer', 'QA Engineer',
    'Mobile Developer', 'iOS Developer', 'Android Developer', 'Flutter Developer',
    'UI/UX Designer', 'Product Designer'
  ],
  
  // Senior-level roles (5+ years)
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
  
  // Entry-level skills
  entrySkills: [
    'HTML', 'CSS', 'JavaScript basics', 'SQL basics', 'Git basics',
    'Python basics', 'Java basics', 'React basics', 'OOP concepts',
    'Data structures basics', 'Algorithms basics', 'Testing basics'
  ],
  
  // Mid-level skills
  midSkills: [
    'Python', 'Java', 'JavaScript', 'TypeScript', 'C++',
    'React', 'Angular', 'Vue.js', 'Node.js', 'Express',
    'Django', 'Flask', 'Spring Boot',
    'PostgreSQL', 'MongoDB', 'MySQL',
    'REST API', 'Git', 'Agile'
  ],
  
  // Senior-level skills
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
  
  // Experience keywords and their mappings
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

// --- GENERATE SMART SUGGESTIONS (LOCAL FALLBACK) ---
const generateDynamicSuggestions = (input: string): string[] => {
  if (!input || input.length < 2) {
    // Default suggestions when no input
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
    // Generic fallback
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
  // Existing States
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

  // --- SMART AI CHAT STATES ---
  const [isChatMode, setIsChatMode] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [jdContext, setJdContext] = useState<any>(null);
  const [isProcessingIntent, setIsProcessingIntent] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // --- DYNAMIC SUGGESTIONS STATE ---
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>([]);
  const [showDynamicSuggestions, setShowDynamicSuggestions] = useState(true);
  
  // --- DEEPSEEK INTEGRATION STATES ---
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

  // --- API CALL FUNCTION FOR SUGGESTIONS ---
  const fetchDeepSeekSuggestions = async (input: string) => {
    if (!input || input.length < 2) return;
    
    const cacheKey = input.toLowerCase().trim();

    // 1. Check Cache first (Save money)
    if (suggestionCache.has(cacheKey)) {
      setDynamicSuggestions(suggestionCache.get(cacheKey)!);
      return;
    }

    setIsGeneratingSuggestions(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-jd-suggestions-deepseek-test', {
        body: { 
          userInput: input,
          conversationContext: jdContext,
          organizationId: organizationId 
        }
      });

      if (error) throw error;

      if (data && data.suggestions) {
        setDynamicSuggestions(data.suggestions);
        
        // Update Test Mode Info
        setIsTestMode(data.isTestMode || false);
        if (data.debug) {
            setTestDebugInfo(data.debug);
        }

        // Save to cache
        suggestionCache.set(cacheKey, data.suggestions);
      }
    } catch (err) {
      console.error("DeepSeek API Error, falling back to local:", err);
      // Fallback to local logic
      const localSuggestions = generateDynamicSuggestions(input);
      setDynamicSuggestions(localSuggestions);
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  // --- UPDATE SUGGESTIONS DYNAMICALLY WITH DEBOUNCE ---
  useEffect(() => {
    if (isChatMode) {
      // Clear previous timer
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (chatInput.length >= 2) {
        // Debounce for 600ms
        debounceRef.current = setTimeout(() => {
          fetchDeepSeekSuggestions(chatInput);
        }, 600);
      } else {
        // Reset/Default suggestions for empty input
        setDynamicSuggestions([
          'Senior Python Developer, 5-8 years, hybrid Bangalore',
          'Frontend Engineer with React, 3-5 years, remote',
          'Full Stack Developer, Node.js, 4-6 years, Mumbai',
          'DevOps Engineer, AWS, 6-10 years, Pune'
        ]);
        setTestDebugInfo(null);
      }
    }
    return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [chatInput, isChatMode, organizationId]);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const meta = user.user_metadata || {};
        let displayName = meta.full_name || meta.name;

        if (!displayName && meta.first_name) {
          displayName = `${meta.first_name} ${meta.last_name || ''}`.trim();
        }

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
      
      if (error) {
        console.error('Error fetching jobs:', error);
        return [];
      }
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
      chatContainerRef.current.scrollTo({
        top: scrollHeight - clientHeight,
        behavior: 'smooth'
      });
    }
  }, [chatMessages, isChatMode]);

  useEffect(() => {
    setShowVeilAnimation(true);
  }, []);

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
    if (selectedJob && selectedJob.description) {
      setJdText(selectedJob.description);
    }
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

      if (!jdText.trim() || jdText.length < 20) {
        setShowJDSuggestion(false);
        setAiSuggestedJobTitle('');
        return;
      }

      const wordCount = countWords(jdText);
      
      if (wordCount < 150) {
        setShowJDSuggestion(true);
        setAiSuggestedJobTitle('');
      } else {
        setShowJDSuggestion(false);
        setIsAnalyzingJD(true);
        
        const title = await analyzeJDForTitle(jdText);
        if (title) {
          setAiSuggestedJobTitle(title);
        }
        
        setIsAnalyzingJD(false);
      }
    };

    const timer = setTimeout(() => {
      analyzeJD();
    }, 1000);

    return () => clearTimeout(timer);
  }, [jdText, isChatMode]);

  // --- START CHAT ---
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
    setChatMessages([
      {
        id: 'intro',
        role: 'assistant',
        content: "Hi! I'll help you draft a great job description. You can describe the role in your own words, or pick a template below. Just tell me what you're looking for!"
      }
    ]);
  };

  // --- PARSE USER INTENT ---
const parseUserIntent = async (userInput: string, existingContext: any = null) => {
  try {
    const { data, error } = await supabase.functions.invoke('parse-jd-intent-deepseek', {
      body: { 
        userInput,
        conversationContext: existingContext 
      }
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error parsing intent:', error);
    return null;
  }
};

  // --- GENERATE JD FROM CONTEXT ---
  const generateJDFromContext = async (context: any) => {
    try {
      const payload = {
        jobTitle: context.jobTitle,
        department: context.department,
        location: context.location,
        employmentType: context.workMode,
        experienceRange: context.experienceMin && context.experienceMax 
          ? `${context.experienceMin}-${context.experienceMax} years`
          : null,
        seniority: context.seniority,
        primarySkills: context.primarySkills?.join(', '),
        secondarySkills: context.secondarySkills?.join(', '),
        responsibilities: context.responsibilities?.join('; '),
        education: context.education?.join(', '),
        certifications: context.certifications?.join(', '),
        industry: context.industry,
        salary: context.salaryMin && context.salaryMax
          ? `₹${context.salaryMin}-${context.salaryMax} LPA`
          : null,
        positionCount: context.positionCount,
        timeline: context.timeline
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

  // --- HANDLE SUGGESTION CLICK ---
const handleSuggestionClick = async (suggestion: string) => {
  console.log('🎯 Suggestion clicked:', suggestion);
  
  setChatInput(suggestion);
  setShowDynamicSuggestions(false);
  
  const userMsg: ChatMessage = {
    id: `user-${Date.now()}`,
    role: 'user',
    content: suggestion
  };
  
  setChatMessages(prev => [...prev, userMsg]);
  setIsProcessingIntent(true);

  try {
    console.log('🔍 Calling parseUserIntent with DeepSeek...');
    const parsed = await parseUserIntent(suggestion, jdContext);
    
    console.log('✅ DeepSeek response:', parsed);
    
    if (!parsed) {
      console.error('❌ Parse failed');
      setChatMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "Sorry, I had trouble understanding that. Could you rephrase?"
      }]);
      setIsProcessingIntent(false);
      return;
    }

    const updatedContext = {
      ...(jdContext || {}),
      ...parsed.extracted
    };
    setJdContext(updatedContext);

    console.log('🎉 Updated context:', updatedContext);

    if (parsed.canGenerateDraft) {
      console.log('🚀 Generating full JD...');
      
      setChatMessages(prev => [...prev, {
        id: `processing-${Date.now()}`,
        role: 'system',
        content: "✨ Great! I have enough information. Generating your job description..."
      }]);

      setIsGeneratingFullJD(true);
      const generatedJD = await generateJDFromContext(updatedContext);
      setIsGeneratingFullJD(false);

      if (generatedJD) {
        console.log('✅ JD generated successfully!');
        setJdText(generatedJD);
        setIsChatMode(false);
        
        setChatMessages(prev => [...prev, {
          id: `success-${Date.now()}`,
          role: 'assistant',
          content: "✅ Done! Your job description is ready. You can review and edit it, or generate keywords to start searching."
        }]);
      }
    } else {
      console.log('ℹ️ Need more info, asking clarification question');
      
      if (parsed.needsClarification && parsed.suggestedQuestion) {
        setChatMessages(prev => [...prev, {
          id: `clarify-${Date.now()}`,
          role: 'assistant',
          content: parsed.suggestedQuestion
        }]);
      }
    }

    setIsProcessingIntent(false);
    
  } catch (error) {
    console.error('❌ Suggestion processing error:', error);
    setChatMessages(prev => [...prev, {
      id: `error-${Date.now()}`,
      role: 'assistant',
      content: "Something went wrong. Please try again."
    }]);
    setIsProcessingIntent(false);
  }
};

  // --- HANDLE CHAT SUBMIT (ENTER KEY) ---
  const handleChatSubmit = async () => {
    const userInput = chatInput.trim();
    if (!userInput) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userInput
    };
    
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setShowDynamicSuggestions(false);
    setIsProcessingIntent(true);

    try {
      const parsed = await parseUserIntent(userInput, jdContext);
      
      if (!parsed) {
        setChatMessages(prev => [...prev, {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: "Sorry, I had trouble understanding that. Could you rephrase?"
        }]);
        setIsProcessingIntent(false);
        return;
      }

      const updatedContext = {
        ...(jdContext || {}),
        ...parsed.extracted
      };
      setJdContext(updatedContext);

      if (parsed.canGenerateDraft) {
        setChatMessages(prev => [...prev, {
          id: `processing-${Date.now()}`,
          role: 'system',
          content: "✨ Great! I have enough information. Generating your job description..."
        }]);

        setIsGeneratingFullJD(true);
        const generatedJD = await generateJDFromContext(updatedContext);
        setIsGeneratingFullJD(false);

        if (generatedJD) {
          setJdText(generatedJD);
          setIsChatMode(false);
          
          setChatMessages(prev => [...prev, {
            id: `success-${Date.now()}`,
            role: 'assistant',
            content: "✅ Done! Your job description is ready. You can review and edit it, or generate keywords to start searching."
          }]);
        }
      } else if (parsed.needsClarification && parsed.suggestedQuestion) {
        setChatMessages(prev => [...prev, {
          id: `clarify-${Date.now()}`,
          role: 'assistant',
          content: parsed.suggestedQuestion
        }]);
        setShowDynamicSuggestions(true);
      } else {
        setChatMessages(prev => [...prev, {
          id: `ack-${Date.now()}`,
          role: 'assistant',
          content: "Got it! What else can you tell me about this role?"
        }]);
        setShowDynamicSuggestions(true);
      }

      setIsProcessingIntent(false);
      
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "Something went wrong. Please try again."
      }]);
      setIsProcessingIntent(false);
    }
  };

  const generateBooleanExamples = (keywords: string[]): string[] => {
    if (keywords.length === 0) return [];
    
    const examples: string[] = [];
    
    if (keywords.length >= 2) {
      const orGroup = keywords.slice(0, Math.min(3, keywords.length))
        .map(k => `"${k}"`)
        .join(' OR ');
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
      {
        stage: 'analyzing',
        title: 'Analyzing Job Description',
        description: 'AI is reading and understanding the job requirements...',
        isComplete: false,
        icon: '🔍'
      },
      {
        stage: 'extracting',
        title: 'Extracting Key Information',
        description: 'Identifying critical skills, qualifications, and experience needed...',
        isComplete: false,
        icon: '📊'
      },
      {
        stage: 'processing',
        title: 'Processing Keywords',
        description: `Found ${keywords.length} relevant keywords for your search...`,
        isComplete: false,
        icon: '⚡'
      },
    ];

    setAnalysisStages([]);
    setCurrentStageIndex(-1);
    setShowStages(true);

    for (let i = 0; i < stages.length; i++) {
      setCurrentStageIndex(i);
      
      const newStage = { ...stages[i], title: '', description: '' };
      setAnalysisStages(prev => [...prev, newStage]);
      
      await typewriterText(stages[i].title, (partial) => {
        setAnalysisStages(prev => {
          const updated = [...prev];
          updated[i] = { ...updated[i], title: partial };
          return updated;
        });
      });
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      await typewriterText(stages[i].description, (partial) => {
        setAnalysisStages(prev => {
          const updated = [...prev];
          updated[i] = { ...updated[i], description: partial };
          return updated;
        });
      });
      
      setAnalysisStages(prev => {
        const updated = [...prev];
        updated[i] = { ...updated[i], isComplete: true };
        return updated;
      });
      
      if (i < stages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
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
          const combinedPattern = selectedBooleanPatterns
            .map(p => `(${p.value})`)
            .join(' OR ');
          finalKeywords = [{ value: combinedPattern, mandatory: true }];
        }
      } else if (booleanKeywords.trim()) {
        finalKeywords = [{ value: booleanKeywords, mandatory: true }];
      }
    }

    let finalDesignation = currentDesignation;
    if (isBooleanDesignation && booleanDesignation.trim()) {
      finalDesignation = booleanDesignation;
    }

    onSearch({
      name, email, 
      keywords: finalKeywords, 
      skills, educations, locations,
      companies: pastCompanies,
      current_company: currentCompany,
      current_designation: finalDesignation,
      min_exp: minExp ? parseInt(minExp) : null,
      max_exp: maxExp ? parseInt(maxExp) : null,
      min_current_salary: minCurrentSalary ? parseFloat(minCurrentSalary) : null,
      max_current_salary: maxCurrentSalary ? parseFloat(maxCurrentSalary) : null,
      min_expected_salary: minExpectedSalary ? parseFloat(minExpectedSalary) : null,
      max_expected_salary: maxExpectedSalary ? parseFloat(maxExpectedSalary) : null,
      notice_periods: noticePeriod,
      date_posted: datePosted,
      jd_text: jdText,
      jd_job_title: aiSuggestedJobTitle,
      jd_selected_job_id: selectedJobId,
      jd_generated_keywords: aiSuggestedTags,
      jd_is_boolean_mode: isBooleanKeywords,
    });
  };

  const displayTags = useMemo(() => {
    if (aiSuggestedTags.length === 0) return [];
    
    const tagsToShow = isBooleanKeywords 
      ? generateBooleanExamples(aiSuggestedTags)
      : aiSuggestedTags;
    
    return tagsToShow.slice(0, visibleKeywordsCount);
  }, [aiSuggestedTags, isBooleanKeywords, visibleKeywordsCount]);

  return (
    <div className={cn("min-h-screen bg-gray-50/50", !hideHero && "pb-20")}>
      <form onSubmit={handleSubmit} className="zive-x-filters-container relative">
        <style>{`
        /* --- AURORA DARK THEME (Hero) --- */
        .gemini-card {
          position: relative;
          background: #000;
          border-radius: 24px;
          overflow: hidden; 
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
          min-height: 500px;
          display: flex;
          flex-direction: column;
        }
        
        .gemini-card-veil {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          z-index: 0;
        }

        .gemini-card-inner {
          position: relative;
          z-index: 0;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
        }

        .hero-badge {
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            color: white;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
            margin-bottom: 24px;
            backdrop-filter: blur(5px);
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }

        .hero-title {
            font-size: 3rem;
            line-height: 1.1;
            font-weight: 700;
            text-align: center;
            color: white;
            margin-bottom: 30px;
            letter-spacing: -0.03em;
            text-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }

        .gemini-textarea-container {
          width: 100%;
          max-width: 600px;
          position: relative;
          margin-bottom: 20px;
        }
        
        .gemini-textarea {
          width: 100%;
          min-height: 120px;
          padding: 20px 24px;
          border-radius: 20px;
          font-size: 16px;
          line-height: 1.5;
          color: white;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(12px);
          resize: vertical;
          transition: all 0.3s ease;
        }
        
        .gemini-textarea:focus {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.4);
          box-shadow: 0 0 0 4px rgba(255,255,255,0.1);
          outline: none;
        }
        
        .gemini-textarea::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }

        .gemini-action-buttons {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 12px;
          width: 100%;
        }
        
        .gemini-action-btn {
          height: 44px;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 99px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .gemini-action-btn.primary {
          background: white;
          color: black;
          border: none;
        }
        .gemini-action-btn.primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(255,255,255,0.2);
        }

        .gemini-action-btn:not(.primary) {
          background: rgba(255,255,255,0.05);
          color: white;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .gemini-action-btn:not(.primary):hover {
           background: rgba(255,255,255,0.15);
           border-color: rgba(255,255,255,0.3);
        }

        /* CHAT CONTAINER */
        .chat-container {
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
        }

        /* DYNAMIC SUGGESTIONS */
        .suggestions-container {
          margin-top: 16px;
          max-height: 300px;
          overflow-y: auto;
        }

        .suggestions-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          color: rgba(255, 255, 255, 0.6);
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .suggestion-tag {
          background: linear-gradient(135deg, rgba(119, 49, 232, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%);
          border: 1px solid rgba(119, 49, 232, 0.3);
          color: white;
          padding: 12px 16px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-size: 13px;
          line-height: 1.4;
          margin-bottom: 8px;
          display: block;
          text-align: left;
        }
        
        .suggestion-tag:hover {
          background: linear-gradient(135deg, rgba(119, 49, 232, 0.3) 0%, rgba(168, 85, 247, 0.3) 100%);
          border-color: rgba(119, 49, 232, 0.6);
          transform: translateX(4px);
          box-shadow: 0 4px 12px rgba(119, 49, 232, 0.3);
        }

        .keyword-appear.group {
            background: rgba(255,255,255,0.1) !important;
            border-color: rgba(255,255,255,0.2) !important;
            color: white !important;
        }

        /* WHITE FORM CARD */
        .white-form-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 10px 40px -10px rgba(0,0,0,0.08);
          border: 1px solid #e5e7eb;
          padding: 32px;
          margin-top: -30px;
          position: relative;
          z-index: 0;
        }
        
        .form-layout-container {
          max-width: 100%;
          margin: 4rem auto;
          padding: 0 24px 40px 24px;
        }

        .naukri-label {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
          display: block;
        }

        .naukri-input {
          height: 48px;
          border-radius: 8px;
          border: 1px solid #d1d5db;
          padding: 0 16px;
          width: 100%;
          transition: all 0.2s;
        }
        .naukri-input:focus {
          border-color: #7731E8;
          box-shadow: 0 0 0 4px rgba(119, 49, 232, 0.1);
        }

        .naukri-section {
             border-bottom: 1px solid #f3f4f6;
             margin-bottom: 0;
             padding-bottom: 24px;
        }
        .naukri-section:last-child { border-bottom: none; }
        
        .naukri-section-header {
          padding: 24px 0;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .naukri-section-header h3 { font-size: 18px; font-weight: 600; color: #111827; margin: 0; }
        .naukri-section-content { animation: slideDown 0.3s ease-out; }
        
        .purple-info-box {
          background: #F3E8FF;
          border: 1px solid #D8B4FE;
          border-radius: 8px;
          padding: 12px 16px;
          display: flex;
          gap: 12px;
          align-items: flex-start;
          margin-top: 16px;
          margin-bottom: 24px;
        }
        .purple-info-box p {
          color: #6B21A8;
          font-size: 13px;
          margin: 0;
          line-height: 1.5;
        }
        
        .mandatory-tag-wrapper {
           border-radius: 8px;
           border: 1px solid #d1d5db;
        }
        .mandatory-tag-wrapper:focus-within {
           border-color: #7731E8;
           box-shadow: 0 0 0 4px rgba(119, 49, 232, 0.1);
        }

        .boolean-toggle-wrapper {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .boolean-label {
            font-size: 14px;
            font-weight: 600;
            color: #6b7280;
            transition: color 0.3s ease;
        }
        .boolean-label.active {
            color: #7731E8;
        }
        .toggle-switch {
            position: relative;
            display: inline-block;
            width: 44px;
            height: 24px;
        }
        .toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        .toggle-slider {
            position: absolute;
            cursor: pointer;
            top: 0; left: 0; right: 0; bottom: 0;
            background-color: #cbd5e1;
            transition: .4s;
            border-radius: 34px;
        }
        .toggle-slider:before {
            position: absolute;
            content: "";
            height: 18px;
            width: 18px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: .4s;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        input:checked + .toggle-slider {
            background-color: #7731E8;
        }
        input:checked + .toggle-slider:before {
            transform: translateX(20px);
        }

        .zive-x-filters-container input:focus { outline: none !important; }
        @keyframes slideDown {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* Scrollbar styling for suggestions */
        .suggestions-container::-webkit-scrollbar {
          width: 6px;
        }
        .suggestions-container::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .suggestions-container::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
        }
        .suggestions-container::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        /* TEST MODE STYLES */
        .test-mode-badge {
            background: rgba(234, 179, 8, 0.1);
            border: 1px solid rgba(234, 179, 8, 0.3);
            border-radius: 12px;
            padding: 10px 14px;
            margin-bottom: 12px;
            font-size: 11px;
            color: #fbbf24;
            display: flex;
            flex-direction: column;
            gap: 4px;
            backdrop-filter: blur(4px);
        }
        .test-metric {
            display: flex;
            justify-content: space-between;
            opacity: 0.8;
        }
        `}</style>

        {/* --- DARK HERO SECTION --- */}
        {!hideHero && (
          <div className={cn("gemini-card m-4 md:m-8 mb-12")}>
            <div className="gemini-card-veil">
              <DarkVeil />
            </div>

            <div className="gemini-card-inner">
              {!isChatMode && !jdText && (
                <div className="flex flex-col items-center animate-in fade-in zoom-in duration-1000 mb-6">
                  <div className="hero-badge">
                    <Sparkles className="w-3 h-3 text-purple-300" />
                    <span>AI Recruiting</span>
                  </div>
                  {userName && (
                    <h1 className="hero-title max-w-2xl">
                      Welcome {userName}
                    </h1>
                  )}
                </div>
              )}

              <div className="gemini-textarea-container">
                {isChatMode ? (
                  <div className="chat-container h-[500px] flex flex-col">
                    <div className="flex justify-between items-center p-3 border-b border-white/10 bg-white/5">
                      <span className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-2">
                        <Bot className="w-4 h-4" /> AI Assistant
                        {isTestMode && <span className="bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded text-[10px]">TEST MODE</span>}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {setIsChatMode(false); setShowDynamicSuggestions(false);}} 
                        className="h-6 w-6 p-0 hover:bg-white/10 rounded-full text-white"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="chat-messages flex-1 overflow-y-auto p-4" ref={chatContainerRef}>
                      
                       {/* TEST MODE DASHBOARD */}
                       {isTestMode && testDebugInfo && (
                        <div className="test-mode-badge animate-in slide-in-from-top-2">
                            <div className="flex items-center gap-2 font-bold border-b border-yellow-500/20 pb-1 mb-1">
                                <Activity className="w-3 h-3" /> LIVE BUDGET TRACKING
                            </div>
                            <div className="test-metric">
                                <span>Requests:</span>
                                <span>{testDebugInfo.requestNumber} / {testDebugInfo.remainingRequests + testDebugInfo.requestNumber}</span>
                            </div>
                            <div className="test-metric">
                                <span>Spent:</span>
                                <span>${Number(testDebugInfo.totalSpent).toFixed(4)} / $2.12</span>
                            </div>
                            <div className="w-full bg-yellow-900/30 h-1.5 rounded-full mt-1 overflow-hidden">
                                <div 
                                    className="bg-yellow-500 h-full transition-all duration-500" 
                                    style={{ width: `${testDebugInfo.percentUsed}%` }}
                                ></div>
                            </div>
                        </div>
                      )}

                      {/* Chat messages */}
                      {chatMessages.map((msg) => (
                        <div 
                          key={msg.id} 
                          className={cn(
                            "mb-3 p-3 rounded-xl text-sm max-w-[85%]", 
                            msg.role === 'assistant' ? "bg-white/10 text-white" : 
                            msg.role === 'system' ? "bg-purple-500/20 text-purple-200 text-center max-w-full mx-auto" :
                            "bg-[#7731E8] text-white ml-auto"
                          )}
                        >
                          {msg.content}
                        </div>
                      ))}
                      
                      {/* Dynamic suggestions */}
                      {showDynamicSuggestions && (
                        <div className="suggestions-container">
                          <div className="suggestions-header flex justify-between">
                            <div className="flex items-center gap-2">
                                <Lightbulb className="w-3 h-3" />
                                <span>{chatInput.length > 0 ? 'AI Suggestions:' : 'Try these examples:'}</span>
                            </div>
                            {isGeneratingSuggestions && <Loader2 className="w-3 h-3 animate-spin" />}
                          </div>
                          
                          {/* Loading State or Suggestions */}
                          {isGeneratingSuggestions && dynamicSuggestions.length === 0 ? (
                             <div className="space-y-2 opacity-50">
                                <div className="h-8 bg-white/10 rounded-lg w-3/4 animate-pulse"></div>
                                <div className="h-8 bg-white/10 rounded-lg w-1/2 animate-pulse"></div>
                             </div>
                          ) : (
                            dynamicSuggestions.map((suggestion, idx) => (
                                <button
                                key={idx}
                                type="button"
                                onClick={() => handleSuggestionClick(suggestion)}
                                className="suggestion-tag"
                                >
                                {suggestion}
                                </button>
                            ))
                          )}
                        </div>
                      )}

                      {isProcessingIntent && (
                        <div className="flex items-center gap-2 text-white/60 text-sm mt-3">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Analyzing...</span>
                        </div>
                      )}
                      
                      <div ref={chatEndRef} />
                    </div>

                    <div className="p-3 border-t border-white/10 flex gap-2">
                      <input 
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-purple-400"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Describe the role (e.g. 'Freshers Bangalore Python')..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !isProcessingIntent && !isGeneratingFullJD) {
                            handleChatSubmit();
                          }
                        }}
                        disabled={isProcessingIntent || isGeneratingFullJD}
                      />
                      <Button 
                        type="button" 
                        size="sm" 
                        onClick={handleChatSubmit} 
                        disabled={isProcessingIntent || isGeneratingFullJD}
                        className="bg-[#7731E8] hover:bg-[#6228c2]"
                      >
                        {isProcessingIntent ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <textarea
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                    placeholder="Paste your Job Description here, or ask AI to help you draft one..."
                    className="gemini-textarea"
                  />
                )}
              </div>

              {/* Action Buttons */}
              {!isChatMode && (
                <div className="gemini-action-buttons">
                  <input ref={fileInputRef} type="file" accept=".txt,.doc,.docx,.pdf" onChange={handleFileUpload} className="hidden" />
                  
                  <button type="button" className="gemini-action-btn" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4" /> Upload JD
                  </button>
                  
                  <button type="button" className="gemini-action-btn" onClick={startJDChat}>
                    <Wand2 className="w-4 h-4" /> Draft with AI
                  </button>

                  <Popover open={openJobCombobox} onOpenChange={setOpenJobCombobox}>
                    <PopoverTrigger asChild>
                      <button type="button" className="gemini-action-btn">
                        <FileText className="w-4 h-4" /> Select Job
                      </button>
                    </PopoverTrigger>

                    <PopoverContent className="w-[300px] p-0 bg-gray-900 border-gray-700 text-white">
                      <Command className="bg-transparent">
                        <CommandInput placeholder="Search job..." className="text-white placeholder:text-gray-500" />
                        <CommandList>
                          <CommandEmpty>No jobs found.</CommandEmpty>
                          <CommandGroup>
                            {jobs.map((job: any) => (
                              <CommandItem 
                                key={job.id} 
                                value={job.title} 
                                onSelect={() => { handleJobSelect(job.id); setOpenJobCombobox(false); }} 
                                className="text-white aria-selected:bg-white/10"
                              >
                                {job.title}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  <button 
                    type="button" 
                    className="gemini-action-btn primary" 
                    onClick={handleGenerateBoolean} 
                    disabled={!jdText.trim() || isGeneratingBoolean}
                  >
                    {isGeneratingBoolean ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {isGeneratingBoolean ? 'Generating...' : 'Generate Keywords'}
                  </button>
                </div>
              )}
              
              {/* Display Generated Tags */}
              {!isChatMode && (isGeneratingBoolean || displayTags.length > 0) && (
                <div className="mt-8 w-full max-w-4xl bg-black/40 backdrop-blur-md rounded-xl p-4 border border-white/10 animate-in slide-in-from-bottom-5">
                  <div className="flex justify-between items-center mb-2 px-2">
                    <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Generated Keywords</span>
                    <button 
                      type="button" 
                      onClick={() => {setAiSuggestedTags([]); setAnimatedTags([]);}} 
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {displayTags.map((tag, idx) => (
                      <button 
                        key={idx} 
                        type="button" 
                        onClick={() => handleAddAiTag(tag)}
                        className="group flex items-center gap-1 text-sm bg-white/10 text-white border border-white/20 hover:bg-purple-500/50 hover:border-purple-400 px-3 py-1.5 rounded-full transition-all"
                      >
                        <span className="font-mono text-xs">{tag}</span>
                        <span className="opacity-0 group-hover:opacity-100 text-[10px] ml-1">+</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- FORM SECTION --- */}
        <div className="form-layout-container">
          <div className={cn("white-form-card", hideHero && "mt-0 shadow-none border-none p-0 h-full")}>
            
            <div className="mb-8">
              <div className="flex justify-between items-center mb-2">
                <label className="naukri-label mb-0">Keywords</label>
                <div className="boolean-toggle-wrapper">
                  <span className={`boolean-label ${isBooleanKeywords ? 'active' : ''}`}>Boolean Search</span>
                  <label className="toggle-switch">
                    <input 
                      type="checkbox" 
                      checked={isBooleanKeywords} 
                      onChange={(e) => {
                        setIsBooleanKeywords(e.target.checked);
                        if (!e.target.checked) setSelectedBooleanPatterns([]);
                      }} 
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              {isBooleanKeywords ? (
                <div className="mandatory-tag-wrapper">
                  <MandatoryTagSelector 
                    value={selectedBooleanPatterns} 
                    onChange={setSelectedBooleanPatterns} 
                    placeholder="Select Boolean patterns..." 
                    disableSuggestions={true}
                  />
                </div>
              ) : (
                <div className="mandatory-tag-wrapper">
                  <MandatoryTagSelector 
                    value={keywords} 
                    onChange={setKeywords} 
                    placeholder="Enter keywords like skills, designation and company" 
                    disableSuggestions={true} 
                  />
                </div>
              )}
              
              <div className="purple-info-box">
                <Info className="w-5 h-5 text-[#7731E8] flex-shrink-0" />
                <p>Many candidates skip adding their IT skills to their profiles, which can result in fewer matches when searching by specific technical skills.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="group">
                  <label className="naukri-label">Min experience</label>
                  <Select value={minExp} onValueChange={setMinExp}>
                    <SelectTrigger className="naukri-input">
                      <SelectValue placeholder="Years" />
                    </SelectTrigger>
                    <SelectContent>
                      {experienceOptions.map(y => (
                        <SelectItem key={y} value={y.toString()}>{y} {y === 1 ? 'Year' : 'Years'}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="group">
                  <label className="naukri-label">Max experience</label>
                  <Select value={maxExp} onValueChange={setMaxExp}>
                    <SelectTrigger className="naukri-input">
                      <SelectValue placeholder="Years" />
                    </SelectTrigger>
                    <SelectContent>
                      {experienceOptions.map(y => (
                        <SelectItem key={y} value={y.toString()}>{y} {y === 1 ? 'Year' : 'Years'}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="group">
                <label className="naukri-label">Current location of candidate</label>
                <div className="mandatory-tag-wrapper">
                  <MandatoryTagSelector 
                    value={locations} 
                    onChange={setLocations} 
                    placeholder="Add location" 
                    fetchSuggestions={fetchLocationSuggestions} 
                    queryKey="locationSuggestions" 
                  />
                </div>
              </div>
            </div>

            {/* Employment Details Accordion */}
            <div className="naukri-section">
              <div className="naukri-section-header" onClick={() => setShowEmployment(!showEmployment)}>
                <h3>Employment Details</h3>
                {showEmployment ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
              </div>
              
              {showEmployment && (
                <div className="naukri-section-content space-y-6">
                  <div className="group">
                    <label className="naukri-label">Skills</label>
                    <div className="mandatory-tag-wrapper">
                      <MandatoryTagSelector 
                        value={skills} 
                        onChange={setSkills} 
                        placeholder="Filter by skills..." 
                        fetchSuggestions={fetchSkillSuggestions} 
                        queryKey="skillSuggestions" 
                      />
                    </div>
                  </div>
                  
                  <div className="group">
                    <label className="naukri-label">Current Company</label>
                    <Input 
                      placeholder="Company name" 
                      value={currentCompany} 
                      onChange={e => setCurrentCompany(e.target.value)} 
                      className="naukri-input" 
                    />
                  </div>
                  
                  <div className="group">
                    <div className="flex justify-between items-end mb-2">
                      <label className="naukri-label mb-0">Current Designation</label>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase ${isBooleanDesignation ? 'text-[#7731E8]' : 'text-gray-400'}`}>
                          Advanced
                        </span>
                        <label className="toggle-switch scale-75">
                          <input 
                            type="checkbox" 
                            checked={isBooleanDesignation} 
                            onChange={e => setIsBooleanDesignation(e.target.checked)} 
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                    </div>
                    <Input 
                      placeholder={isBooleanDesignation ? '("Engineer" OR "Developer")' : "Designation"} 
                      value={isBooleanDesignation ? booleanDesignation : currentDesignation} 
                      onChange={e => isBooleanDesignation ? setBooleanDesignation(e.target.value) : setCurrentDesignation(e.target.value)} 
                      className="naukri-input" 
                    />
                  </div>
                  
                  <div className="group">
                    <label className="naukri-label">Past Companies</label>
                    <div className="mandatory-tag-wrapper">
                      <MandatoryTagSelector 
                        value={pastCompanies} 
                        onChange={setPastCompanies} 
                        placeholder="Filter by companies..." 
                        fetchSuggestions={fetchCompanySuggestions} 
                        queryKey="companySuggestions" 
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="naukri-label">Notice Period</label>
                    <ToggleGroup 
                      type="multiple" 
                      value={noticePeriod} 
                      onValueChange={setNoticePeriod} 
                      className="flex flex-wrap gap-3 justify-start"
                    >
                      {["Immediate", "15 Days", "1 Month", "2 Months", "3 Months+"].map(p => (
                        <ToggleGroupItem key={p} value={p} className="naukri-toggle-button">
                          {p}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </div>
                </div>
              )}
            </div>

            <div className="naukri-section">
              <div className="naukri-section-header" onClick={() => setShowEducation(!showEducation)}>
                <h3>Education Details</h3>
                {showEducation ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
              </div>
              
              {showEducation && (
                <div className="naukri-section-content">
                  <div className="group">
                    <label className="naukri-label">Education</label>
                    <div className="mandatory-tag-wrapper">
                      <MandatoryTagSelector 
                        value={educations} 
                        onChange={setEducations} 
                        placeholder="Filter by education..." 
                        fetchSuggestions={fetchEducationSuggestions} 
                        queryKey="educationSuggestions" 
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="naukri-section">
              <div className="naukri-section-header" onClick={() => setShowCompensation(!showCompensation)}>
                <h3>Compensation & Availability</h3>
                {showCompensation ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
              </div>
              
              {showCompensation && (
                <div className="naukri-section-content space-y-6">
                  <div className="group">
                    <label className="naukri-label">Current Salary (INR Lacs)</label>
                    <div className="grid grid-cols-2 gap-4">
                      <Input 
                        type="number" 
                        placeholder="Min" 
                        value={minCurrentSalary} 
                        onChange={e => setMinCurrentSalary(e.target.value)} 
                        className="naukri-input" 
                      />
                      <Input 
                        type="number" 
                        placeholder="Max" 
                        value={maxCurrentSalary} 
                        onChange={e => setMaxCurrentSalary(e.target.value)} 
                        className="naukri-input" 
                      />
                    </div>
                  </div>
                  <div className="group">
                    <label className="naukri-label">Expected Salary (INR Lacs)</label>
                    <div className="grid grid-cols-2 gap-4">
                      <Input 
                        type="number" 
                        placeholder="Min" 
                        value={minExpectedSalary} 
                        onChange={e => setMinExpectedSalary(e.target.value)} 
                        className="naukri-input" 
                      />
                      <Input 
                        type="number" 
                        placeholder="Max" 
                        value={maxExpectedSalary} 
                        onChange={e => setMaxExpectedSalary(e.target.value)} 
                        className="naukri-input" 
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-8">
              <Button 
                type="submit" 
                disabled={isSearching}
                className="h-12 px-8 rounded-lg bg-[#7731E8] hover:bg-[#6228c2] text-white font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {isSearching ? 'Searching...' : 'Search candidates'}
              </Button>
            </div>

          </div>
        </div>
      </form>
    </div>
  );
};

export default CandidateSearchFilters;