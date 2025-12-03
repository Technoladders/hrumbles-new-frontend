// src/components/candidates/zive-x/CandidateSearchFilters.tsx

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
// Added 'Send', 'Bot', 'User', 'SkipForward' icons
import { ChevronDown, ChevronUp, Info, Sparkles, X, Loader2, Check, Send, Bot, User, SkipForward, ArrowLeft } from 'lucide-react';
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

// --- CHAT QUESTION CONFIGURATION ---
const JD_CHAT_QUESTIONS = [
  {
    id: 'jobDetails',
    text: "Let's build a great JD. First, what is the **Job Title**, **Department**, and **Work Location** (Remote/Hybrid/City)?",
    placeholder: "e.g. Senior Python Dev, Engineering, Hybrid Bangalore..."
  },
  {
    id: 'experience',
    text: "Got it. What are the **experience requirements** (years) and expected **seniority level**?",
    placeholder: "e.g. 5-8 years, Senior Level..."
  },
  {
    id: 'skills',
    text: "What are the **Primary Skills** (must-haves) and **Secondary Skills** (good-to-haves)?",
    placeholder: "Primary: React, Node. Secondary: AWS, Docker..."
  },
  {
    id: 'responsibilities',
    text: "What are the top **3-5 key responsibilities** for this role?",
    placeholder: "e.g. Lead the frontend team, Architect solutions..."
  },
  {
    id: 'education',
    text: "Any specific **Education** (Degrees) or **Certifications** required?",
    placeholder: "e.g. B.Tech CS, AWS Solution Architect..."
  },
  {
    id: 'industry',
    text: "Is experience in a specific **Industry** or Domain preferred?",
    placeholder: "e.g. Fintech, Healthcare, E-commerce..."
  },
  {
    id: 'salary',
    text: "Do you want to mention a **Salary Range**? (Optional)",
    placeholder: "e.g. 25-35 LPA or Skip"
  },
  {
    id: 'hiringContext',
    text: "Finally, **how many positions** are open and what is the **hiring timeline**?",
    placeholder: "e.g. 2 positions, Immediate joiner preferred"
  }
];

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
}

interface CandidateSearchFiltersProps {
  onSearch: (filters: SearchFilters) => void;
  isSearching: boolean;
  initialFilters?: Partial<SearchFilters>;
  organizationId: string;
  searchHistory?: SearchHistory | null;
}

const CandidateSearchFilters: FC<CandidateSearchFiltersProps> = ({ onSearch, isSearching, initialFilters, organizationId, searchHistory }) => {
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
  
  // --- BOOLEAN & AI STATES ---
  const [booleanKeywords, setBooleanKeywords] = useState('');
  const [isBooleanKeywords, setIsBooleanKeywords] = useState(false);
  const [booleanDesignation, setBooleanDesignation] = useState('');
  const [isBooleanDesignation, setIsBooleanDesignation] = useState(false);
  
  // --- NEW: Store multiple selected Boolean patterns as tags ---
  const [selectedBooleanPatterns, setSelectedBooleanPatterns] = useState<SearchTag[]>([]);

  // New States for AI JD & Suggestions
  const [jdText, setJdText] = useState('');
  const [isGeneratingBoolean, setIsGeneratingBoolean] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [openJobCombobox, setOpenJobCombobox] = useState(false);
  
  // --- AI JD Analysis States ---
  const [isAnalyzingJD, setIsAnalyzingJD] = useState(false);
  const [aiSuggestedJobTitle, setAiSuggestedJobTitle] = useState('');
  const [showJDSuggestion, setShowJDSuggestion] = useState(false);
  // const [aiDraftedJD, setAiDraftedJD] = useState(''); // Removed unused
  const [isGeneratingFullJD, setIsGeneratingFullJD] = useState(false);
  
  // --- State to hold the AI suggestion before applying it ---
  const [aiSuggestedTags, setAiSuggestedTags] = useState<string[]>([]);
  
  // --- Typewriter animation states ---
  const [animatedTags, setAnimatedTags] = useState<string[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // --- Multi-stage analysis states ---
  const [analysisStages, setAnalysisStages] = useState<{
    stage: string;
    title: string;
    description: string;
    icon: string;
    isComplete: boolean;
  }[]>([]);
  const [currentStageIndex, setCurrentStageIndex] = useState(-1);
  const [showStages, setShowStages] = useState(true); // Control stages visibility
  const [visibleKeywordsCount, setVisibleKeywordsCount] = useState(0); // Control how many keywords are visible

  // --- NEW CHAT BOT STATES ---
  const [isChatMode, setIsChatMode] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [chatInput, setChatInput] = useState("");
  const [jdAnswers, setJdAnswers] = useState<Record<string, string>>({});
  const chatEndRef = useRef<HTMLDivElement>(null);
   const chatContainerRef = useRef<HTMLDivElement>(null); // <--- ADD THIS


  // Other States
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

  // --- BRAND COLOR CONSTANT ---
  const BRAND_COLOR = '#7731E8'; 

  // --- FETCH JOBS FOR DROPDOWN ---
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
  
  // LOAD JD METADATA FROM INITIAL FILTERS
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


// --- LOAD FROM SEARCH HISTORY ---
  useEffect(() => {
    if (searchHistory) {
      // Load JD and keywords from history
      setJdText(searchHistory.jd_text);
      setAiSuggestedJobTitle(searchHistory.job_title || '');
      setSelectedJobId(searchHistory.selected_job_id || '');
      setAiSuggestedTags(searchHistory.generated_keywords);
      setIsBooleanKeywords(searchHistory.is_boolean_mode);
      
      // Show all keywords immediately (no animation)
      setVisibleKeywordsCount(searchHistory.generated_keywords.length);
      setShowStages(false);
      setAnalysisStages([]);
      
      // If there were saved filters, load them too
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

  // Re-animate when boolean mode changes and we have existing suggestions
  useEffect(() => {
    if (aiSuggestedTags.length > 0 && !isAnimating && !isGeneratingBoolean) {
      const reAnimate = async () => {
        setIsAnimating(true);
        setShowStages(false); // Don't show stages on re-animation
        setAnalysisStages([]);
        setCurrentStageIndex(-1);
        
        // Show keywords sequentially
        const tagsToShow = isBooleanKeywords 
          ? generateBooleanExamples(aiSuggestedTags)
          : aiSuggestedTags;
        await showKeywordsSequentially(tagsToShow);
        setIsAnimating(false);
      };
      reAnimate();
    }
  }, [isBooleanKeywords]); // Only trigger on boolean mode change

  // Auto-scroll chat to bottom
// Auto-scroll chat to bottom (Updated to prevent page jumping)
  useEffect(() => {
    if (isChatMode && chatContainerRef.current) {
      const { scrollHeight, clientHeight } = chatContainerRef.current;
      chatContainerRef.current.scrollTo({
        top: scrollHeight - clientHeight,
        behavior: 'smooth'
      });
    }
  }, [chatMessages, isChatMode]);

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


// --- SAVE SEARCH HISTORY TO DATABASE ---
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

  // --- HANDLE JOB SELECTION ---
  const handleJobSelect = (jobId: string) => {
    setSelectedJobId(jobId);
    const selectedJob = jobs.find(j => j.id === jobId);
    if (selectedJob && selectedJob.description) {
      setJdText(selectedJob.description);
    }
  };

  // --- Count words in text ---
  const countWords = (text: string): number => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  // --- Analyze JD to extract job title ---
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

  // --- Handle JD text changes and AI analysis ---
  useEffect(() => {
    const analyzeJD = async () => {
      // Don't analyze if we are in chat mode
      if (isChatMode) return;

      if (!jdText.trim() || jdText.length < 20) {
        setShowJDSuggestion(false);
        setAiSuggestedJobTitle('');
        return;
      }

      const wordCount = countWords(jdText);
      
      // If JD is too short (< 150 words), suggest AI drafting
      if (wordCount < 150) {
        setShowJDSuggestion(true);
        setAiSuggestedJobTitle('');
      } else {
        // JD is long enough, analyze for title
        setShowJDSuggestion(false);
        setIsAnalyzingJD(true);
        
        const title = await analyzeJDForTitle(jdText);
        if (title) {
          setAiSuggestedJobTitle(title);
        }
        
        setIsAnalyzingJD(false);
      }
    };

    // Debounce the analysis
    const timer = setTimeout(() => {
      analyzeJD();
    }, 1000);

    return () => clearTimeout(timer);
  }, [jdText, isChatMode]);


  // =======================================================
  // --- NEW: CHAT BOT LOGIC FOR JD GENERATION ---
  // =======================================================

  const startJDChat = () => {
    setIsChatMode(true);
    setShowJDSuggestion(false);
    setCurrentQuestionIdx(0);
    setJdAnswers({});
    setChatMessages([
      {
        id: 'intro',
        role: 'assistant',
        content: JD_CHAT_QUESTIONS[0].text
      }
    ]);
  };

  const handleChatSubmit = async (skipped = false) => {
    const answerText = skipped ? "Skipped" : chatInput.trim();
    if (!answerText) return;

    // 1. Add User Message
    const newUserMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: answerText
    };
    
    // 2. Save Answer
    const currentQKey = JD_CHAT_QUESTIONS[currentQuestionIdx].id;
    const updatedAnswers = { ...jdAnswers, [currentQKey]: answerText };
    setJdAnswers(updatedAnswers);
    
    setChatInput(""); // Clear Input
    
    // 3. Determine Next Step
    const nextIdx = currentQuestionIdx + 1;
    
    if (nextIdx < JD_CHAT_QUESTIONS.length) {
      // Move to next question
      const nextQ = JD_CHAT_QUESTIONS[nextIdx];
      const newBotMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: nextQ.text
      };
      setChatMessages(prev => [...prev, newUserMsg, newBotMsg]);
      setCurrentQuestionIdx(nextIdx);
    } else {
      // Finish & Generate
      setChatMessages(prev => [...prev, newUserMsg]);
      setIsGeneratingFullJD(true);
      
      try {
        // Map answers for the Edge Function
        const payload = {
            jobTitle: updatedAnswers['jobDetails'], // Contains title, dept, location
            department: updatedAnswers['jobDetails'],
            location: updatedAnswers['jobDetails'],
            experienceRange: updatedAnswers['experience'],
            seniority: updatedAnswers['experience'],
            primarySkills: updatedAnswers['skills'],
            secondarySkills: updatedAnswers['skills'],
            responsibilities: updatedAnswers['responsibilities'],
            education: updatedAnswers['education'],
            industry: updatedAnswers['industry'],
            salary: updatedAnswers['salary'],
            positionCount: updatedAnswers['hiringContext'],
            timeline: updatedAnswers['hiringContext']
        };

        const { data, error } = await supabase.functions.invoke('generate-jd-from-prompts', {
          body: { answers: payload }
        });

        if (error) throw error;
        
        // Success
        setJdText(data.fullJD);
        setIsChatMode(false); // Exit chat mode
        
      } catch (err) {
        console.error("Error generating JD:", err);
        // Show error message in chat
        setChatMessages(prev => [...prev, {
          id: 'error',
          role: 'assistant',
          content: "Sorry, I encountered an error generating the JD. Please try again or paste a description manually."
        }]);
      } finally {
        setIsGeneratingFullJD(false);
      }
    }
  };


  // --- HELPER: Convert simple keywords to Boolean search examples ---
  const generateBooleanExamples = (keywords: string[]): string[] => {
    if (keywords.length === 0) return [];
    
    const examples: string[] = [];
    
    // Example 1: OR combination of first 2-3 keywords
    if (keywords.length >= 2) {
      const orGroup = keywords.slice(0, Math.min(3, keywords.length))
        .map(k => `"${k}"`)
        .join(' OR ');
      examples.push(`(${orGroup})`);
    }
    
    // Example 2: AND combination
    if (keywords.length >= 2) {
      const firstTwo = keywords.slice(0, 2).map(k => `"${k}"`).join(' AND ');
      examples.push(firstTwo);
    }
    
    // Example 3: Complex AND/OR if we have 4+ keywords
    if (keywords.length >= 4) {
      const orPart = keywords.slice(0, 2).map(k => `"${k}"`).join(' OR ');
      const andKeyword = `"${keywords[2]}"`;
      examples.push(`(${orPart}) AND ${andKeyword}`);
    }
    
    // Example 4: NOT pattern if we have 3+ keywords
    if (keywords.length >= 3) {
      const mainKeyword = `"${keywords[0]}"`;
      const notKeyword = keywords[keywords.length - 1];
      examples.push(`${mainKeyword} NOT "${notKeyword}"`);
    }
    
    // Example 5: Simple AND with last 2 keywords
    if (keywords.length >= 2) {
      const lastTwo = keywords.slice(-2).map(k => `"${k}"`).join(' AND ');
      examples.push(lastTwo);
    }
    
    return examples;
  };

  // --- Typewriter animation effect (removed - keywords will appear one by one instead) ---
  const showKeywordsSequentially = async (keywords: string[]) => {
    setVisibleKeywordsCount(0);
    
    // Show keywords one by one
    for (let i = 0; i < keywords.length; i++) {
      setVisibleKeywordsCount(i + 1);
      await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay between each keyword
    }
  };

  // --- Character-by-character typewriter for stage text ---
  const typewriterText = async (text: string, callback: (partial: string) => void) => {
    for (let i = 0; i <= text.length; i++) {
      callback(text.substring(0, i));
      await new Promise(resolve => setTimeout(resolve, 20)); // 20ms per character
    }
  };

  // --- Multi-stage analysis animation ---
  const runAnalysisStages = async (keywords: string[]) => {
    const stages = [
      {
        stage: 'analyzing',
        title: 'Analyzing Job Description',
        description: 'AI is reading and understanding the job requirements...',
      
        isComplete: false,
      },
      {
        stage: 'extracting',
        title: 'Extracting Key Information',
        description: 'Identifying critical skills, qualifications, and experience needed...',
    
        isComplete: false,
      },
      {
        stage: 'processing',
        title: 'Processing Keywords',
        description: `Found ${keywords.length} relevant keywords for your search...`,
   
        isComplete: false,
      },
    ];

    setAnalysisStages([]);
    setCurrentStageIndex(-1);
    setShowStages(true); // Show stages

    // Animate each stage
    for (let i = 0; i < stages.length; i++) {
      setCurrentStageIndex(i);
      
      // Add stage with empty text
      const newStage = { ...stages[i], title: '', description: '' };
      setAnalysisStages(prev => [...prev, newStage]);
      
      // Animate title
      await typewriterText(stages[i].title, (partial) => {
        setAnalysisStages(prev => {
          const updated = [...prev];
          updated[i] = { ...updated[i], title: partial };
          return updated;
        });
      });
      
      // Small pause before description
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Animate description
      await typewriterText(stages[i].description, (partial) => {
        setAnalysisStages(prev => {
          const updated = [...prev];
          updated[i] = { ...updated[i], description: partial };
          return updated;
        });
      });
      
      // Mark stage as complete
      setAnalysisStages(prev => {
        const updated = [...prev];
        updated[i] = { ...updated[i], isComplete: true };
        return updated;
      });
      
      // Pause before next stage (except for last stage)
      if (i < stages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Pause before hiding stages
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Hide stages - they will fade out
    setShowStages(false);
    
    // Wait for fade out animation
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Clear stages completely
    setAnalysisStages([]);
    setCurrentStageIndex(-1);
  };

  // --- AI GENERATION LOGIC ---
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
      
      // Save to history after successful generation
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

  // --- Handle clicking a suggestion tag ---
  const handleAddAiTag = (tagToAdd: string) => {
    // When Boolean mode is ON, add as a Boolean pattern tag
    if (isBooleanKeywords) {
      setSelectedBooleanPatterns(prev => {
        const exists = prev.some(t => t.value === tagToAdd);
        if (exists) return prev;
        return [...prev, { value: tagToAdd, mandatory: false }];
      });
      // Remove from suggestions after adding
      setAiSuggestedTags(prev => {
        // If this was a generated Boolean pattern, keep the original keywords
        // So we don't remove from displayTags
        return prev;
      });
      return;
    }
    
    // When Boolean mode is OFF, add to keywords array
    setKeywords(prev => {
      const exists = prev.some(t => t.value.toLowerCase() === tagToAdd.toLowerCase());
      if (exists) return prev;
      return [...prev, { value: tagToAdd, mandatory: false }];
    });
    
    // Only remove the specific tag that was clicked in normal mode
    setAiSuggestedTags(prev => prev.filter(t => t !== tagToAdd));
  };

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();

  let finalKeywords = keywords;
  if (isBooleanKeywords) {
    // When Boolean mode is ON, use selected Boolean patterns
    if (selectedBooleanPatterns.length > 0) {
      // If multiple patterns selected, combine them with OR
      if (selectedBooleanPatterns.length === 1) {
        finalKeywords = [{ value: selectedBooleanPatterns[0].value, mandatory: true }];
      } else {
        // Combine multiple Boolean patterns with OR logic
        const combinedPattern = selectedBooleanPatterns
          .map(p => `(${p.value})`)
          .join(' OR ');
        finalKeywords = [{ value: combinedPattern, mandatory: true }];
      }
    } else if (booleanKeywords.trim()) {
      // Fallback: if manual text was entered in text field (backward compatibility)
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
    // Add JD-related metadata
    jd_text: jdText,
    jd_job_title: aiSuggestedJobTitle,
    jd_selected_job_id: selectedJobId,
    jd_generated_keywords: aiSuggestedTags,
    jd_is_boolean_mode: isBooleanKeywords,
  });
};

  // --- Compute display tags based on boolean mode and visible count ---
  const displayTags = useMemo(() => {
    if (aiSuggestedTags.length === 0) return [];
    
    // Determine what to show based on boolean mode
    const tagsToShow = isBooleanKeywords 
      ? generateBooleanExamples(aiSuggestedTags)
      : aiSuggestedTags;
    
    // Return only the visible keywords (for sequential animation)
    return tagsToShow.slice(0, visibleKeywordsCount);
  }, [aiSuggestedTags, isBooleanKeywords, visibleKeywordsCount]);


  return (
    <form onSubmit={handleSubmit} className="max-w-full zive-x-filters-container relative">
      <style>{`
        /* --- SCOPED CSS --- */
        .zive-x-filters-container *:focus, 
        .zive-x-filters-container *:focus-visible, 
        .zive-x-filters-container *:focus-within {
          outline: none !important;
        }

        .zive-x-filters-container input:focus, 
        .zive-x-filters-container input:focus-visible,
        .zive-x-filters-container select:focus, 
        .zive-x-filters-container select:focus-visible,
        .zive-x-filters-container textarea:focus,
        .zive-x-filters-container button:focus,
        .zive-x-filters-container button:focus-visible {
          border-color: ${BRAND_COLOR} !important;
          outline: none !important;
        }

        .mandatory-tag-wrapper { position: relative; transition: all 0.2s ease; }
        .zive-x-filters-container .mandatory-tag-wrapper input { box-shadow: none !important; border: none !important; outline: none !important; background: transparent !important; }
        .zive-x-filters-container .mandatory-tag-wrapper:focus-within { border-color: ${BRAND_COLOR} !important; box-shadow: 0 0 0 2px ${BRAND_COLOR} !important; }

        .naukri-input { height: 48px; border-radius: 8px; border: 1px solid #d1d5db; padding: 12px 16px; font-size: 15px; transition: all 0.2s ease; background: white; }
        .naukri-input:hover { border-color: ${BRAND_COLOR}; }
        .naukri-input:focus, .naukri-input:focus-visible { border-color: ${BRAND_COLOR} !important; box-shadow: 0 0 0 2px ${BRAND_COLOR} !important; outline: none !important; }
        
        .naukri-label { font-size: 15px; font-weight: 500; color: #1f2937; margin-bottom: 8px; display: block; transition: color 0.2s ease; }
        .naukri-section { background: white; border-radius: 12px; border: 1px solid #e5e7eb; margin-bottom: 24px; overflow: hidden; }
        .naukri-section-header { padding: 20px 24px; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: background 0.2s ease; user-select: none; }
        .naukri-section-header:hover { background: #f9fafb; }
        .naukri-section-header h3 { font-size: 18px; font-weight: 600; color: #111827; margin: 0; }
        .naukri-section-content { padding: 24px; }
        
        .naukri-toggle-button { height: 40px; padding: 8px 20px; border-radius: 20px; border: 1px solid #d1d5db; background: white; font-size: 14px; font-weight: 500; color: #4b5563; transition: all 0.2s ease; cursor: pointer; }
        .naukri-toggle-button:hover { border-color: ${BRAND_COLOR}; background: #f3e8ff; }
        .naukri-toggle-button[data-state="on"] { background: ${BRAND_COLOR} !important; color: white !important; border-color: ${BRAND_COLOR} !important; }
        
        .naukri-info-box { background: #f3e8ff; border: 1px solid #d8b4fe; border-radius: 8px; padding: 12px 16px; display: flex; gap: 10px; align-items: flex-start; margin-top: 12px; }
        .naukri-info-box .info-icon { color: ${BRAND_COLOR}; flex-shrink: 0; margin-top: 2px; }
        .naukri-info-box p { color: ${BRAND_COLOR}; font-size: 14px; margin: 0; line-height: 1.5; }

        /* Boolean Toggle */
        .boolean-toggle-wrapper { display: flex; align-items: center; gap: 8px; }
        .boolean-label { font-size: 12px; font-weight: 600; color: #6b7280; transition: color 0.2s; }
        .boolean-label.active { color: ${BRAND_COLOR}; }
        
        .toggle-switch { position: relative; display: inline-block; width: 34px; height: 18px; }
        .toggle-switch input { opacity: 0; width: 0; height: 0; }
        .toggle-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .4s; border-radius: 34px; }
        .toggle-slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 2px; bottom: 2px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .toggle-slider { background-color: ${BRAND_COLOR}; }
        input:checked + .toggle-slider:before { transform: translateX(16px); }

        /* Combined AI JD Card */
        .ai-jd-combined-card {
          background: linear-gradient(135deg, #f3e8ff 0%, #faf5ff 100%);
          border: 2px solid #e9d5ff;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
          transition: all 0.3s ease-in-out;
          overflow: hidden; 
        }
        
        /* Card Header */
        .ai-jd-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid #e9d5ff;
          gap: 16px;
        }
        .ai-jd-card-title {
          font-size: 18px;
          font-weight: 600;
          color: ${BRAND_COLOR};
        }
        .ai-jd-header-dropdown {
          flex-shrink: 0;
          min-width: 200px;
        }
        .ai-jd-header-dropdown-btn {
          height: 40px;
          border: 2px solid #e9d5ff;
          background: white;
          font-size: 13px;
          color: #374151;
          transition: all 0.2s;
          padding: 0 12px;
        }
        .ai-jd-header-dropdown-btn:hover {
          border-color: ${BRAND_COLOR};
          background: white;
        }
        .ai-jd-header-dropdown-btn:focus {
          border-color: ${BRAND_COLOR};
          box-shadow: 0 0 0 3px rgba(119, 49, 232, 0.1);
        }
        
        /* Card Body */
        .ai-jd-card-body {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        /* Textarea Wrapper */
        .ai-jd-textarea-wrapper {
          position: relative;
        }
        .ai-jd-textarea {
          width: 100%;
          min-height: 120px;
          padding: 16px;
          border: 2px solid #e9d5ff;
          border-radius: 12px;
          font-size: 14px;
          font-family: inherit;
          line-height: 1.6;
          color: #1f2937;
          background: white;
          resize: vertical;
          transition: all 0.2s ease;
        }
        .ai-jd-textarea:hover {
          border-color: ${BRAND_COLOR};
        }
        .ai-jd-textarea:focus {
          border-color: ${BRAND_COLOR};
          outline: none;
          box-shadow: 0 0 0 3px rgba(119, 49, 232, 0.1);
        }
        .ai-jd-textarea::placeholder {
          color: #9ca3af;
        }
        .ai-jd-clear-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          padding: 6px;
          border-radius: 6px;
          background: #f3f4f6;
          color: #6b7280;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ai-jd-clear-btn:hover {
          background: #fee2e2;
          color: #ef4444;
        }

        /* --- CHAT BOT STYLES --- */
        .chat-container {
            display: flex;
            flex-direction: column;
            height: 400px;
            background: rgba(255,255,255,0.7);
            border-radius: 12px;
            border: 1px solid #e9d5ff;
            overflow: hidden;
        }
        .chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .chat-bubble {
            max-width: 85%;
            padding: 10px 14px;
            border-radius: 12px;
            font-size: 14px;
            line-height: 1.5;
            position: relative;
            animation: fadeIn 0.3s ease;
        }
        .chat-bubble.bot {
            align-self: flex-start;
            background: white;
            color: #374151;
            border: 1px solid #e9d5ff;
            border-bottom-left-radius: 2px;
        }
        .chat-bubble.user {
            align-self: flex-end;
            background: ${BRAND_COLOR};
            color: white;
            border-bottom-right-radius: 2px;
        }
        .chat-input-area {
            padding: 12px;
            background: white;
            border-top: 1px solid #e9d5ff;
            display: flex;
            gap: 8px;
            align-items: center;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .ai-jd-card-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          .ai-jd-header-dropdown {
            width: 100%;
            min-width: 100%;
          }
          .ai-jd-combined-card {
            padding: 16px;
          }
        }

        /* Typewriter cursor animation */
        @keyframes blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        
        .typewriter-cursor {
          display: inline-block;
          width: 2px;
          height: 14px;
          background-color: ${BRAND_COLOR};
          margin-left: 2px;
          animation: blink 1s infinite;
          vertical-align: middle;
        }

        /* Analysis stages styling */
        .analysis-stage {
          background: white;
          border-left: 3px solid #e9d5ff;
          padding: 12px 16px;
          margin-bottom: 12px;
          border-radius: 8px;
          transition: all 0.3s ease;
        }
        
        .analysis-stage.complete {
          border-left-color: ${BRAND_COLOR};
        }
        
        .analysis-stage-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 6px;
        }
        
        .analysis-stage-icon {
          font-size: 20px;
          line-height: 1;
        }
        
        .analysis-stage-title {
          font-size: 14px;
          font-weight: 600;
          color: #5b21b6;  /* Dark purple for heading */
          flex: 1;
        }
        
        .analysis-stage-description {
          font-size: 13px;
          color: ${BRAND_COLOR};  /* Normal purple (#7731E8) for description */
          line-height: 1.5;
          padding-left: 30px;
        }
        
        @keyframes slideInFromLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes fadeOut {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(-10px);
          }
        }
        
        .analysis-stage {
          animation: slideInFromLeft 0.3s ease-out;
        }
        
        .stages-container {
          transition: opacity 0.3s ease, transform 0.3s ease;
        }
        
        .stages-container.hiding {
          animation: fadeOut 0.3s ease-out forwards;
        }
        
        /* Keyword appearance animation */
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .keyword-appear {
          animation: slideInUp 0.3s ease-out;
        }

        /* Job Dropdown Purple Theme */
        .zive-x-filters-container [cmdk-root] {
          background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
          border: 1px solid #e9d5ff;
        }
        .zive-x-filters-container [cmdk-input] {
          background: white;
          border: 2px solid #e9d5ff;
          color: #374151;
        }
        .zive-x-filters-container [cmdk-input]:focus {
          border-color: ${BRAND_COLOR};
          outline: none;
          box-shadow: 0 0 0 3px rgba(119, 49, 232, 0.1);
        }
        .zive-x-filters-container [cmdk-item] {
          color: #374151;
          border-radius: 6px;
          margin: 2px 4px;
        }
        .zive-x-filters-container [cmdk-item]:hover {
          background: #f3e8ff;
          color: #7731E8;
        }
        .zive-x-filters-container [cmdk-group-heading] {
          color: #7731E8;
          font-weight: 600;
        }
        .zive-x-filters-container [cmdk-empty] {
          color: #9ca3af;
        }
      `}</style>

      {/* Basic Search Section */}
      <div className="naukri-section">
        <div className="naukri-section-content">
          <div className="space-y-6">
            
            {/* --- COMBINED AI ASSISTANT CARD --- */}
            <div className="ai-jd-combined-card">
              {/* Header with Dropdown */}
              <div className="ai-jd-card-header">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#7731E8]" />
                  <span className="ai-jd-card-title">
                    {isChatMode ? 'AI Job Description Builder' : 'Paste Job Description'}
                  </span>
                </div>
                
                {/* Dropdown in Header - Right Side */}
                <div className="ai-jd-header-dropdown">
                  <Popover open={openJobCombobox} onOpenChange={setOpenJobCombobox}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openJobCombobox}
                        className="ai-jd-header-dropdown-btn w-full justify-between"
                        disabled={isChatMode} // Disable dropdown while chatting
                      >
                        <span className="truncate flex items-center gap-2">
                          {isAnalyzingJD && (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          )}
                          {aiSuggestedJobTitle ? (
                            <>
                              <Sparkles className="w-3 h-3 text-[#7731E8]" />
                              {aiSuggestedJobTitle}
                            </>
                          ) : selectedJobId ? (
                            jobs.find((job: any) => job.id === selectedJobId)?.title
                          ) : (
                            "Select a job..."
                          )}
                        </span>
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200" align="end">
                      <Command className="bg-transparent">
                        <CommandInput placeholder="Search for a job..." className="border-b-2 border-purple-200" />
                        <CommandList> 
                          <CommandEmpty>No jobs found.</CommandEmpty>
                          <CommandGroup className="max-h-[300px] overflow-y-auto p-3">
                            {/* AI-analyzed job title (if exists) */}
                            {aiSuggestedJobTitle && (
                              <CommandItem
                                value={aiSuggestedJobTitle}
                                onSelect={() => {
                                  setSelectedJobId('');
                                  setOpenJobCombobox(false);
                                }}
                                className="group cursor-pointer bg-purple-100 border-2 border-[#7731E8] hover:bg-[#7731E8] hover:text-white min-h-[48px] py-3 px-3 rounded-md transition-colors mb-2"
                                style={{
                                  wordBreak: 'normal',
                                  overflowWrap: 'break-word',
                                  whiteSpace: 'normal'
                                }}
                              >
                                <Sparkles className="mr-2 h-4 w-4 flex-shrink-0 self-start mt-0.5 text-[#7731E8] group-hover:text-white" />
                                <span className="flex-1 leading-relaxed font-semibold">
                                  {aiSuggestedJobTitle}
                                  <span className="block text-xs font-normal mt-1 opacity-75">
                                    AI-analyzed from your pasted description
                                  </span>
                                </span>
                              </CommandItem>
                            )}
                            
                            {/* Database jobs */}
                            {jobs.map((job: any) => (
                              <CommandItem
                                key={job.id}
                                value={job.title}
                                onSelect={() => {
                                  const selectedJob = jobs.find(j => j.id === job.id);
                                  if (selectedJob) {
                                    setSelectedJobId(job.id);
                                    setJdText(selectedJob.description || '');
                                    setAiSuggestedJobTitle(''); // Clear AI suggestion
                                    setOpenJobCombobox(false);
                                  }
                                }}
                                className="group cursor-pointer aria-selected:bg-[#f3e8ff] aria-selected:text-[#7731E8] hover:bg-[#7731E8] hover:text-white min-h-[48px] py-3 px-3 rounded-md transition-colors"
                                style={{
                                  wordBreak: 'normal',
                                  overflowWrap: 'break-word',
                                  whiteSpace: 'normal'
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4 flex-shrink-0 self-start mt-0.5 group-hover:text-white transition-colors",
                                    selectedJobId === job.id ? "opacity-100 text-[#7731E8]" : "opacity-0"
                                  )}
                                />
                                <span className="flex-1 leading-relaxed">{job.title}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Content Area */}
              <div className="ai-jd-card-body">
                
                {/* --- VIEW MODE 1: CHAT INTERFACE --- */}
                {isChatMode ? (
                  <div className="chat-container">
                    {/* Header/Close Chat */}
                    <div className="flex justify-between items-center p-3 bg-purple-50 border-b border-purple-100">
                      <span className="text-xs font-bold text-[#7731E8] uppercase tracking-wide flex items-center gap-2">
                        <Bot className="w-4 h-4" /> AI Assistant
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => setIsChatMode(false)} className="h-6 w-6 p-0 hover:bg-purple-200 rounded-full">
                        <X className="w-4 h-4 text-purple-700" />
                      </Button>
                    </div>

                    {/* Messages */}
      {/* Messages */}
                    <div className="chat-messages" ref={chatContainerRef}> {/* <--- ADD REF HERE */}
                       {chatMessages.map((msg) => (
                         <div key={msg.id} className={cn("chat-bubble", msg.role === 'assistant' ? "bot" : "user")}>
                            {msg.role === 'assistant' && <Bot className="w-3 h-3 absolute -left-5 top-1 text-gray-400" />}
                            {msg.role === 'user' && <User className="w-3 h-3 absolute -right-5 top-1 text-gray-400" />}
                            {msg.content}
                         </div>
                       ))}
                       {isGeneratingFullJD && (
                         <div className="chat-bubble bot flex items-center gap-2">
                           <Loader2 className="w-3 h-3 animate-spin" />
                           Generating comprehensive Job Description...
                         </div>
                       )}
                       {/* You can keep chatEndRef here or remove it, it's no longer strictly needed for scrolling */}
                       <div ref={chatEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="chat-input-area">
                    <Input 
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault(); // This stops the form from submitting
                              if (chatInput.trim() && !isGeneratingFullJD) {
                                handleChatSubmit(false);
                              }
                            }
                          }}
                          placeholder={JD_CHAT_QUESTIONS[currentQuestionIdx]?.placeholder || "Type your answer..."}
                          className="flex-1 border-purple-200 focus-visible:ring-purple-400"
                          disabled={isGeneratingFullJD}
                        />
                        <Button 
                          type="button" 
                          variant="ghost" 
                          className="text-gray-500 hover:text-purple-600"
                          onClick={() => handleChatSubmit(true)}
                          title="Skip this question"
                          disabled={isGeneratingFullJD}
                        >
                          <SkipForward className="w-4 h-4" />
                        </Button>
                        <Button 
                          type="button" 
                          onClick={() => handleChatSubmit(false)}
                          className="bg-[#7731E8] hover:bg-[#6228c2] text-white"
                          disabled={!chatInput.trim() || isGeneratingFullJD}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                    </div>
                  </div>
                ) : (
                  /* --- VIEW MODE 2: TEXTAREA (DEFAULT) --- */
                  <div className="ai-jd-textarea-wrapper">
                    <textarea
                      value={jdText}
                      onChange={(e) => setJdText(e.target.value)}
                      placeholder="Paste your job description here or select from database below..."
                      className="ai-jd-textarea"
                      rows={10}
                    />
                    {jdText && (
                      <button
                        type="button"
                        onClick={() => {
                          setJdText('');
                          setAiSuggestedJobTitle('');
                          setShowJDSuggestion(false);
                          setAiSuggestedTags([]);
                          setAnimatedTags([]);
                        }}
                        className="ai-jd-clear-btn"
                        title="Clear text"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}

                {/* AI JD Suggestion Banner (Modified for Chat) */}
                {showJDSuggestion && !isChatMode && (
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-amber-900 mb-1">
                          Short Job Description Detected
                        </p>
                        <p className="text-sm text-amber-700 mb-3">
                          Your description seems brief ({countWords(jdText)} words). Our AI can help you build a complete, professional job description by asking a few simple questions.
                        </p>
                        <Button
                          type="button"
                          onClick={startJDChat}
                          className="bg-amber-600 hover:bg-amber-700 text-white text-sm h-9"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Start AI Interview to Draft JD
                        </Button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowJDSuggestion(false)}
                        className="text-amber-400 hover:text-amber-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Generate Keywords Button */}
                <div className="flex justify-between items-center mt-4">
                  {/* Option to start chat manually even if not short */}
                  {!isChatMode && !showJDSuggestion && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={startJDChat}
                      className="text-xs text-[#7731E8] hover:bg-purple-50 px-2"
                    >
                      <Bot className="w-3 h-3 mr-1" /> Help me write a JD
                    </Button>
                  )}
                  
                  {/* Spacer if button not shown */}
                  {isChatMode || showJDSuggestion ? <div></div> : null}

                  <Button
                    type="button"
                    onClick={handleGenerateBoolean}
                    disabled={!jdText.trim() || isGeneratingBoolean || isChatMode}
                    className="bg-[#7731E8] hover:bg-[#6228c2] text-white ml-auto"
                  >
                    {isGeneratingBoolean ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Keywords
                      </>
                    )}
                  </Button>
                </div>

                {/* ============================================================================== */}
                {/* AI ANALYSIS STAGES & SUGGESTION TAGS (RESULTS)                                 */}
                {/* ============================================================================== */}
                {(isGeneratingBoolean || (showStages && analysisStages.length > 0) || displayTags.length > 0) && (
                  <div className="mt-4 pt-4 border-t border-purple-200 animate-in fade-in slide-in-from-top-2">
                      <div className="bg-white/60 rounded-xl p-4 shadow-sm border border-purple-100">
                          <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-2">
                                  <Sparkles className="w-4 h-4 text-[#7731E8]" />
                                  <span className="text-sm font-semibold text-[#7731E8]">
                                    {showStages && analysisStages.length > 0 
                                      ? 'AI Analysis Insights' 
                                      : displayTags.length > 0 
                                        ? 'Generated Keywords (Click to add)' 
                                        : 'AI Analysis Insights'}
                                  </span>
                              </div>
                              {!isGeneratingBoolean && !isAnimating && displayTags.length > 0 && (
                                <button 
                                    onClick={() => {
                                      setAiSuggestedTags([]);
                                      setAnimatedTags([]);
                                      setIsAnimating(false);
                                      setAnalysisStages([]);
                                      setCurrentStageIndex(-1);
                                      setShowStages(true);
                                      setVisibleKeywordsCount(0);
                                    }} 
                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                    type="button"
                                    title="Close results"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                              )}
                          </div>
                          
                          {/* Loading State - Before Analysis Stages */}
                          {isGeneratingBoolean && analysisStages.length === 0 && (
                            <div className="flex items-center justify-center py-6">
                              <div className="flex items-center gap-3 text-[#7731E8]">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span className="text-sm font-medium">Processing job description...</span>
                              </div>
                            </div>
                          )}
                          
                          {/* Analysis Stages - Only show when showStages is true */}
                          {showStages && analysisStages.length > 0 && (
                            <div className={`stages-container space-y-3 ${!showStages ? 'hiding' : ''}`}>
                              {analysisStages.map((stage, idx) => (
                                <div 
                                  key={idx}
                                  className={`analysis-stage ${stage.isComplete ? 'complete' : ''} bg-white`}
                                >
                                  <div className="analysis-stage-header">
                                    <span className="analysis-stage-icon">{stage.icon}</span>
                                    <div className="analysis-stage-title">
                                      {stage.title}
                                      {/* Show cursor on current stage's title if not complete */}
                                      {idx === currentStageIndex && !stage.isComplete && stage.title.length > 0 && (
                                        <span className="typewriter-cursor"></span>
                                      )}
                                    </div>
                                  </div>
                                  {stage.description && (
                                    <div className="analysis-stage-description">
                                      {stage.description}
                                      {idx === currentStageIndex && !stage.isComplete && stage.description.length > 0 && (
                                        <span className="typewriter-cursor"></span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Keywords Display - Only show after stages disappear */}
                          {!showStages && displayTags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {displayTags.map((tag, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleAddAiTag(tag)}
                                        className="keyword-appear group flex items-center gap-1 text-sm bg-white text-gray-700 border border-purple-200 hover:border-[#7731E8] hover:text-[#7731E8] hover:bg-purple-50 px-3 py-1.5 rounded-full transition-all shadow-sm"
                                    >
                                        <span className="font-mono text-xs">{tag}</span>
                                        <span className="opacity-0 group-hover:opacity-100 text-[10px] ml-1 font-bold">
                                          {isBooleanKeywords ? '→' : '+'}
                                        </span>
                                    </button>
                                ))}
                            </div>
                          )}
                      </div>
                  </div>
                )}
                
              </div>
            </div>

            {/* Keywords Field */}
            <div className="group">
              <div className="flex justify-between items-center mb-2">
                <label className="naukri-label group-focus-within:text-[#7731E8] transition-colors mb-0">Keywords</label>
                
                {/* Boolean Toggle */}
                <div className="boolean-toggle-wrapper">
                    <span 
                        className={`boolean-label ${isBooleanKeywords ? 'active' : ''}`}
                        title="Use AND, OR, NOT logic to refine your search"
                    >
                        Boolean Search
                    </span>
                    <label className="toggle-switch">
                        <input 
                            type="checkbox" 
                            checked={isBooleanKeywords} 
                            onChange={(e) => {
                              setIsBooleanKeywords(e.target.checked);
                              // Clear selected patterns when toggling to avoid confusion
                              if (!e.target.checked) {
                                setSelectedBooleanPatterns([]);
                              }
                            }} 
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>
              </div>

              {/* Conditional Input Rendering */}
              {isBooleanKeywords ? (
                  <div className="mandatory-tag-wrapper rounded-lg border border-gray-300 transition-all">
                    <MandatoryTagSelector 
                      value={selectedBooleanPatterns} 
                      onChange={setSelectedBooleanPatterns} 
                      placeholder="Select Boolean patterns from suggestions above or type your own..." 
                      disableSuggestions={true}
                    />
                  </div>
              ) : (
                  <div className="mandatory-tag-wrapper rounded-lg border border-gray-300 transition-all">
                    <MandatoryTagSelector 
                      value={keywords} 
                      onChange={setKeywords} 
                      placeholder="Enter keywords like skills, designation and company" 
                      disableSuggestions={true} 
                    />
                  </div>
              )}
            </div>
            
            {/* ... Rest of the form (Experience, Location, etc.) ... */}
            {/* IT Skills Info */}
            <div className="naukri-info-box">
              <Info className="info-icon w-5 h-5" />
              <p>
                Many candidates skip adding their IT skills to their profiles, which can result in fewer matches when searching by specific technical skills.
              </p>
            </div>
            
            {/* Experience */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="group">
                <label className="naukri-label group-focus-within:text-[#7731E8] transition-colors">Min experience</label>
                <Select value={minExp} onValueChange={setMinExp}>
                  <SelectTrigger className="naukri-input">
                    <SelectValue placeholder="Years" />
                  </SelectTrigger>
                  <SelectContent>
                    {experienceOptions.map(y => (
                      <SelectItem key={y} value={y.toString()}>
                        {y} {y === 1 ? 'Year' : 'Years'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="group">
                <label className="naukri-label group-focus-within:text-[#7731E8] transition-colors">Max experience</label>
                <Select value={maxExp} onValueChange={setMaxExp}>
                  <SelectTrigger className="naukri-input">
                    <SelectValue placeholder="Years" />
                  </SelectTrigger>
                  <SelectContent>
                    {experienceOptions.map(y => (
                      <SelectItem key={y} value={y.toString()}>
                        {y} {y === 1 ? 'Year' : 'Years'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Current Location */}
            <div className="group">
              <label className="naukri-label group-focus-within:text-[#7731E8] transition-colors">Current location of candidate</label>
              <div className="mandatory-tag-wrapper rounded-lg border border-gray-300">
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
        </div>
      </div>

      {/* Employment Details Section */}
      <div className="naukri-section">
        <div className="naukri-section-header" onClick={() => setShowEmployment(!showEmployment)}>
          <h3>Employment Details</h3>
          {showEmployment ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
        </div>
        
        {showEmployment && (
          <div className="naukri-section-content">
            <div className="space-y-6">
              {/* Skills */}
              <div className="group">
                <label className="naukri-label group-focus-within:text-[#7731E8] transition-colors">Skills</label>
                <div className="mandatory-tag-wrapper rounded-lg border border-gray-300">
                  <MandatoryTagSelector 
                    value={skills} 
                    onChange={setSkills} 
                    placeholder="Filter by specific skills..." 
                    fetchSuggestions={fetchSkillSuggestions} 
                    queryKey="skillSuggestions" 
                  />
                </div>
              </div>
              
              <div className="space-y-6">
                {/* ROW 1: Current Company */}
                <div className="group">
                  <label className="naukri-label group-focus-within:text-[#7731E8] transition-colors">
                    Current Company
                  </label>
                  <Input 
                    placeholder="Add company name" 
                    value={currentCompany} 
                    onChange={e => setCurrentCompany(e.target.value)}
                    className="naukri-input"
                  />
                </div>
                
                {/* ROW 2: Current Designation */}
                <div className="group">
                  <div className="flex justify-between items-end mb-2">
                    <label className="naukri-label group-focus-within:text-[#7731E8] transition-colors mb-0">
                      Current Designation
                    </label>
                    
                    {/* Boolean Toggle */}
                    <div className="flex items-center gap-2">
                        <span 
                            className={`text-[10px] font-bold uppercase tracking-wide whitespace-nowrap transition-colors ${isBooleanDesignation ? 'text-[#7731E8]' : 'text-gray-400'}`}
                        >
                            Advanced Search
                        </span>
                        <label className="toggle-switch scale-75 origin-right">
                            <input 
                                type="checkbox" 
                                checked={isBooleanDesignation} 
                                onChange={(e) => setIsBooleanDesignation(e.target.checked)} 
                            />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>
                  </div>

                  {isBooleanDesignation ? (
                      <Input 
                        placeholder='("Software Engineer" OR "Developer")' 
                        value={booleanDesignation} 
                        onChange={e => setBooleanDesignation(e.target.value)}
                        className="naukri-input"
                      />
                  ) : (
                      <Input 
                        placeholder="Add designation" 
                        value={currentDesignation} 
                        onChange={e => setCurrentDesignation(e.target.value)}
                        className="naukri-input"
                      />
                  )}
                </div>
              </div>
              
              {/* Past Employment */}
              <div className="group">
                <label className="naukri-label group-focus-within:text-[#7731E8] transition-colors">Past Employment</label>
                <div className="mandatory-tag-wrapper rounded-lg border border-gray-300">
                  <MandatoryTagSelector 
                    value={pastCompanies} 
                    onChange={setPastCompanies} 
                    placeholder="Filter by past companies..." 
                    fetchSuggestions={fetchCompanySuggestions} 
                    queryKey="companySuggestions" 
                  />
                </div>
              </div>
              
              {/* Notice Period */}
              <div>
                <label className="naukri-label">Notice Period/ Availability to join</label>
                <ToggleGroup 
                  type="multiple" 
                  value={noticePeriod} 
                  onValueChange={setNoticePeriod} 
                  className="flex flex-wrap justify-start gap-3 mt-2"
                >
                  <ToggleGroupItem value="Immediate" className="naukri-toggle-button">
                    Immediate
                  </ToggleGroupItem>
                  <ToggleGroupItem value="15 Days" className="naukri-toggle-button">
                    15 Days
                  </ToggleGroupItem>
                  <ToggleGroupItem value="1 Month" className="naukri-toggle-button">
                    1 Month
                  </ToggleGroupItem>
                  <ToggleGroupItem value="2 Months" className="naukri-toggle-button">
                    2 Months
                  </ToggleGroupItem>
                  <ToggleGroupItem value="3 Months+" className="naukri-toggle-button">
                    More than 3 months
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Education Details Section */}
      <div className="naukri-section">
        <div className="naukri-section-header" onClick={() => setShowEducation(!showEducation)}>
          <h3>Education Details</h3>
          {showEducation ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
        </div>
        
        {showEducation && (
          <div className="naukri-section-content">
            <div className="group">
              <label className="naukri-label group-focus-within:text-[#7731E8] transition-colors">Education</label>
              <div className="mandatory-tag-wrapper rounded-lg border border-gray-300">
                <MandatoryTagSelector 
                  value={educations} 
                  onChange={setEducations} 
                  placeholder="Filter by degree or institution..." 
                  fetchSuggestions={fetchEducationSuggestions} 
                  queryKey="educationSuggestions" 
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Compensation & Availability Section */}
      <div className="naukri-section">
        <div className="naukri-section-header" onClick={() => setShowCompensation(!showCompensation)}>
          <h3>Compensation & Availability</h3>
          {showCompensation ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
        </div>
        
        {showCompensation && (
          <div className="naukri-section-content">
            <div className="space-y-6">
              {/* Current Salary */}
              <div className="group">
                <label className="naukri-label group-focus-within:text-[#7731E8] transition-colors">Current Salary</label>
                <div className="grid grid-cols-2 gap-4 items-center">
                  <div className="flex gap-2 items-center">
                    <span className="text-sm text-gray-500 whitespace-nowrap">INR</span>
                    <Input 
                      type="number" 
                      placeholder="Min salary" 
                      value={minCurrentSalary} 
                      onChange={e => setMinCurrentSalary(e.target.value)}
                      className="naukri-input"
                    />
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="text-sm text-gray-500">to</span>
                    <Input 
                      type="number" 
                      placeholder="Max salary" 
                      value={maxCurrentSalary} 
                      onChange={e => setMaxCurrentSalary(e.target.value)}
                      className="naukri-input"
                    />
                    <span className="text-sm text-gray-500 whitespace-nowrap">Lacs</span>
                  </div>
                </div>
              </div>
              
              {/* Expected Salary */}
              <div className="group">
                <label className="naukri-label group-focus-within:text-[#7731E8] transition-colors">Expected Salary</label>
                <div className="grid grid-cols-2 gap-4 items-center">
                  <div className="flex gap-2 items-center">
                    <span className="text-sm text-gray-500 whitespace-nowrap">INR</span>
                    <Input 
                      type="number" 
                      placeholder="Min salary" 
                      value={minExpectedSalary} 
                      onChange={e => setMinExpectedSalary(e.target.value)}
                      className="naukri-input"
                    />
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="text-sm text-gray-500">to</span>
                    <Input 
                      type="number" 
                      placeholder="Max salary" 
                      value={maxExpectedSalary} 
                      onChange={e => setMaxExpectedSalary(e.target.value)}
                      className="naukri-input"
                    />
                    <span className="text-sm text-gray-500 whitespace-nowrap">Lacs</span>
                  </div>
                </div>
              </div>
              
              {/* Date Posted */}
              <div>
                <label className="naukri-label">Active in</label>
                <ToggleGroup 
                  type="single" 
                  value={datePosted} 
                  onValueChange={val => { if (val) setDatePosted(val); }} 
                  defaultValue="all_time" 
                  className="flex flex-wrap gap-3 mt-2"
                >
                  <ToggleGroupItem value="all_time" className="naukri-toggle-button">
                    All Time
                  </ToggleGroupItem>
                  <ToggleGroupItem value="last_24_hours" className="naukri-toggle-button">
                    24h
                  </ToggleGroupItem>
                  <ToggleGroupItem value="last_7_days" className="naukri-toggle-button">
                    7d
                  </ToggleGroupItem>
                  <ToggleGroupItem value="last_14_days" className="naukri-toggle-button">
                    14d
                  </ToggleGroupItem>
                  <ToggleGroupItem value="last_30_days" className="naukri-toggle-button">
                    30d
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search Button */}
      <div className="flex justify-end pt-4">
        <Button 
          type="submit" 
          disabled={isSearching}
          className="h-12 px-8 rounded-lg bg-[#7731E8] hover:bg-[#6228c2] text-white font-semibold text-base shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSearching ? 'Searching candidates...' : 'Search candidates'}
        </Button>
      </div>
    </form>
  );
};

export default CandidateSearchFilters;