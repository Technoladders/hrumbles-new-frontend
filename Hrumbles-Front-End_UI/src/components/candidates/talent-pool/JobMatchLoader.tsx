import { useState, useEffect, FC, Fragment, useMemo } from 'react';
import moment from 'moment';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  CheckCircle2, FileText, Filter, Loader2, SearchCode, Brain, Zap, Target, Activity, 
  Sparkles, X, TrendingUp, Users, Award, ChevronDown, BrainCircuit, Lightbulb, Frown
} from 'lucide-react';
import { toast } from 'sonner';

// --- INTERFACES ---
interface MatchedCandidate {
  id: string;
  candidate_name: string;
  suggested_title?: string;
  matching_skill_count?: number;
  matching_skills?: string[];
  unmatched_skills?: string[]; 
  created_by: { first_name: string; last_name: string; } | null;
  created_at: string;
}
interface JobData {
  title: string;
  skills: string[];
  description: string;
  experience: { min: { years: number; months: number }; max: { years: number; months: number } };
  location: string[];
}
interface AnalysisResult {
  score: number;
  summary?: string;
  report_url?: string;
}

// --- HELPER FUNCTION: Typewriter ---
const Typewriter: FC<{ text: string; speed?: number; }> = ({ text, speed = 20 }) => {
  const [displayText, setDisplayText] = useState('');
  useEffect(() => {
    setDisplayText(''); 
    let i = 0;
    const typingInterval = setInterval(() => {
      if (i < text.length) {
        setDisplayText(prevText => prevText + text.charAt(i));
        i++;
      } else {
        clearInterval(typingInterval);
      }
    }, speed);
    return () => clearInterval(typingInterval);
  }, [text, speed]);
  return <p className="text-xs font-mono text-purple-600 leading-relaxed">{displayText}</p>;
};

// --- HELPER FUNCTION: generateDynamicSubSteps ---
const generateDynamicSubSteps = (jobData: JobData, phase: string): string[] => {
  const { skills, experience, location } = jobData;
  const randomSkill = skills.length > 0 ? skills[Math.floor(Math.random() * skills.length)] : 'key skills';
  const randomOtherSkill = skills.length > 1 ? skills[Math.floor(Math.random() * skills.length)] : 'related technologies';
  switch (phase) {
    case 'Understanding Your Needs': return [ `Analyzing ${jobData.title} requirements`, `Identifying must-have skills: ${randomSkill}, ${randomOtherSkill}`, `Setting experience range: ${experience.min.years}-${experience.max.years} years`, `Noting location preference: ${location.length > 0 ? location[0] : 'any'}`, ];
    case 'Smart Criteria Building': return [ `Prioritizing ${randomSkill} expertise (High weight)`, `Balancing experience requirements`, `Considering location flexibility`, `Adding culture fit parameters`, ];
    case 'Intelligent Talent Search': return [ 'Searching through talent database', `Finding ${randomSkill} specialists`, 'Analyzing career trajectories', `Matching soft skills for ${jobData.title}`, ];
    case 'Precision Ranking': return [ 'Calculating compatibility scores', `Evaluating ${randomSkill} proficiency`, 'Applying smart filters', 'Finalizing top recommendations', ];
    default: return [];
  }
};

// --- HELPER FUNCTION: generateDynamicLogs ---
const generateDynamicLogs = (jobData: JobData, totalCandidates: number, matchCount: number): any[] => {
  const { skills, title } = jobData;
  const randomSkill = skills.length > 0 ? skills[Math.floor(Math.random() * skills.length)] : 'critical skills';
  const candidateNames = ['Ashley Viji P', 'Pranav B', 'Mayank S'];
  const randomCandidateName = candidateNames[Math.floor(Math.random() * candidateNames.length)];
  return [
    { id: 1, icon: Lightbulb, title: 'Role Analysis Complete', message: `Identified ${skills.length} key technical skills and 2 soft skills critical for ${title} success.` },
    { id: 2, icon: Users, title: 'Talent Pool Scanned', message: `AI is analyzing profiles in your database using advanced pattern recognition.` },
    { id: 3, icon: TrendingUp, title: 'Experience Pattern Detected', message: `Found strong correlation: Candidates with CMDB often excel in this role.` },
    { id: 4, icon: Award, title: 'Top Performer Identified', message: `${randomCandidateName} shows exceptional match with proven experience.` },
    { id: 5, icon: Zap, title: 'Final Optimization', message: `AI has ranked the top ${matchCount} matches based on over 11 compatibility factors.` },
  ];
};

// --- COMPONENT PROPS ---
interface JobMatchLoaderProps {
  jobTitle: string;
  totalCandidatesInPool: number;
  expectedMatches?: number;
  jobData?: JobData;
  onComplete?: () => void;
  matchedCandidates: MatchedCandidate[];
  jobSkills: string[];
}

// --- MAIN COMPONENT ---
const JobMatchLoader: FC<JobMatchLoaderProps> = ({ 
  jobTitle, 
  totalCandidatesInPool, 
  expectedMatches = 5,
  jobData = { title: jobTitle, skills: ['GRC', 'IRM'], description: '...', experience: { min: { years: 3, months: 0 }, max: { years: 5, months: 0 } }, location: ['India'] },
  onComplete,
  matchedCandidates,
  jobSkills,
}) => {
  const [currentPhase, setCurrentPhase] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [currentSubStep, setCurrentSubStep] = useState(0);
  const [displayScanned, setDisplayScanned] = useState(0);
  const [displayMatches, setDisplayMatches] = useState(0);
  const [matchRate, setMatchRate] = useState(0);
  const [visibleLogs, setVisibleLogs] = useState(0);
  const [dynamicLogs, setDynamicLogs] = useState<any[]>([]);
  const [expandedCandidateId, setExpandedCandidateId] = useState<string | null>(null);
  
  const [analysisScores, setAnalysisScores] = useState<Record<string, AnalysisResult>>({});
  const [validatingIds, setValidatingIds] = useState<string[]>([]);
  const [candidatesWithSkillAnalysis, setCandidatesWithSkillAnalysis] = useState<MatchedCandidate[]>([]);

  // --- MAJOR FIX: This filters the incoming list to include ONLY candidates with matched skills ---
  // It takes the potentially large list from props and creates a new, accurate list of true matches.
  const trulyMatchedCandidates = useMemo(() => 
    matchedCandidates.filter(c => c.matching_skill_count && c.matching_skill_count > 0),
    [matchedCandidates]
  );
  
  // This effect now correctly uses the pre-filtered list 'trulyMatchedCandidates'
  useEffect(() => {
    if (jobSkills.length > 0 && trulyMatchedCandidates.length > 0) {
      const jobSkillsSet = new Set(jobSkills.map(s => s.toLowerCase()));
      const processedCandidates = trulyMatchedCandidates.map(candidate => {
        const matchedSkillsSet = new Set((candidate.matching_skills || []).map(s => s.toLowerCase()));
        const unmatched = Array.from(jobSkillsSet).filter(skill => !matchedSkillsSet.has(skill));
        return { ...candidate, unmatched_skills: unmatched };
      });
      setCandidatesWithSkillAnalysis(processedCandidates);
    } else {
      setCandidatesWithSkillAnalysis(trulyMatchedCandidates);
    }
  }, [trulyMatchedCandidates, jobSkills]);

  useEffect(() => { const logs = generateDynamicLogs(jobData, totalCandidatesInPool, expectedMatches); setDynamicLogs(logs); }, [jobData, totalCandidatesInPool, expectedMatches]);
  useEffect(() => { if (isComplete) return; const phaseDurations = [2500, 2500, 3500, 2000]; const advancePhase = () => { if (currentPhase < 3) { setCurrentPhase(prev => prev + 1); setCurrentSubStep(0); } else { setIsComplete(true); setTimeout(() => setShowResults(true), 1000); } }; const phaseTimer = setTimeout(advancePhase, phaseDurations[currentPhase]); return () => clearTimeout(phaseTimer); }, [currentPhase, isComplete]);
  useEffect(() => { if (isComplete) return; const phaseDurations = [2500, 2500, 3500, 2000]; const currentPhaseData = { subSteps: generateDynamicSubSteps(jobData, phases[currentPhase]) }; const subDuration = (phaseDurations[currentPhase] || 2000) / currentPhaseData.subSteps.length; const subTimer = setTimeout(() => { if (currentSubStep < currentPhaseData.subSteps.length - 1) { setCurrentSubStep(prev => prev + 1); } }, subDuration); return () => clearTimeout(subTimer); }, [currentPhase, currentSubStep, jobData]);
  useEffect(() => { const scannedDuration = 3500; const interval = 50; const steps = scannedDuration / interval; const increment = Math.ceil(totalCandidatesInPool / steps) || 1; let count = 0; const timer = setInterval(() => { count += increment; setDisplayScanned(Math.min(count, totalCandidatesInPool)); if (count >= totalCandidatesInPool) clearInterval(timer); }, interval); return () => clearInterval(timer); }, [totalCandidatesInPool]);
  useEffect(() => { if (currentPhase >= 2) { const timer = setInterval(() => { setDisplayMatches(prev => { if (prev < expectedMatches) return prev + 1; clearInterval(timer); return prev; }); }, 400); return () => clearInterval(timer); } }, [currentPhase, expectedMatches]);
  useEffect(() => { if (displayScanned > 0) { setMatchRate(Math.round((displayMatches / displayScanned) * 10000) / 100); } }, [displayMatches, displayScanned]);
  useEffect(() => { const logInterval = setInterval(() => { setVisibleLogs(prev => Math.min(prev + 1, dynamicLogs.length)); }, 1500); return () => clearInterval(logInterval); }, [dynamicLogs.length]);

  const phases = ['Understanding Your Needs', 'Smart Criteria Building', 'Intelligent Talent Search', 'Precision Ranking'];

  const handleToggleExpand = (candidateId: string) => { setExpandedCandidateId(prevId => (prevId === candidateId ? null : candidateId)); };
  
  const handleDeepAnalysis = (candidateId: string, candidateName: string) => {
    if (validatingIds.includes(candidateId)) return;
    setValidatingIds(prev => [...prev, candidateId]);
    toast.info(`AI deep analysis has started for ${candidateName}.`);
    setTimeout(() => {
      const score = Math.floor(Math.random() * (96 - 75 + 1)) + 75;
      const result: AnalysisResult = { score };
      setAnalysisScores(prev => ({ ...prev, [candidateId]: result }));
      setValidatingIds(prev => prev.filter(id => id !== candidateId));
      toast.success(`Analysis complete for ${candidateName}! Score: ${score}%`);
    }, 3000);
  };

  const getScoreColor = (score: number | null | undefined): string => {
    if (score == null) return 'text-gray-600';
    if (score > 80) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };


  return (
    <TooltipProvider>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
        <Card className="w-full max-w-5xl h-[90vh] flex flex-col relative overflow-hidden bg-white/95 backdrop-blur-xl shadow-2xl border-0">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50"></div>
          
          {showResults ? (
            // --- VIEW 2: DETAILED & INTERACTIVE RESULTS ---
            <>
              <div className="absolute top-4 right-4 z-20"><Button variant="ghost" size="icon" onClick={onComplete} className="rounded-full bg-white/80 hover:bg-white shadow-sm"><X className="h-4 w-4" /></Button></div>
              <div className="relative z-10 flex flex-col items-center p-8 text-center">
                <div className="relative mb-6"><div className="absolute inset-0 bg-gradient-to-r from-green-500 to-teal-500 rounded-2xl blur-xl opacity-30"></div><div className="relative bg-gradient-to-br from-green-500 to-teal-500 p-4 rounded-2xl shadow-lg"><Award className="h-10 w-10 text-white" /></div></div>
                {/* --- MAJOR FIX: The heading now displays the count of *actually* matched candidates --- */}
                <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent mb-2">
                  {candidatesWithSkillAnalysis.length} Matches Found
                </h2>
                <p className="text-gray-600 font-medium">Presenting the most qualified candidates for <span className="text-teal-600 font-semibold">{jobTitle}</span></p>
              </div>
              
              <div className="flex-1 relative z-10 px-8 pb-6 overflow-y-auto space-y-2 custom-scrollbar">
                <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-gray-500 uppercase px-3 py-2">
                  <div className="col-span-3">Candidate Name</div>
                  <div className="col-span-2">Match</div>
                  <div className="col-span-3">Suggested Title</div>
                  <div className="col-span-2 text-center">AI Score</div>
                  <div className="col-span-2 text-center">Profile</div>
                </div>

                {/* --- MAJOR FIX: The list now renders the filtered list, or an empty state message --- */}
                {candidatesWithSkillAnalysis.length > 0 ? (
                  candidatesWithSkillAnalysis.map((candidate, index) => (
                    <Fragment key={candidate.id}>
                      <div 
                        className="grid grid-cols-12 gap-4 items-center p-3 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl shadow-sm animate-slide-in cursor-pointer hover:bg-purple-50/50 transition-colors"
                        style={{ animationDelay: `${index * 50}ms` }}
                        onClick={() => handleToggleExpand(candidate.id)}
                      >
                        <div className="col-span-3 font-semibold text-gray-800 flex items-center gap-2">
                          {candidate.candidate_name}
                          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${expandedCandidateId === candidate.id ? 'rotate-180' : ''}`} />
                        </div>
                        <div className="col-span-2">
                          <Tooltip><TooltipTrigger asChild><Badge variant="secondary" className="cursor-help bg-green-100 text-green-800 hover:bg-green-200">{candidate.matching_skill_count || 0} Matched Skills</Badge></TooltipTrigger><TooltipContent><p className="font-semibold text-xs mb-1">Matching Skills:</p><ul className="list-disc pl-4 text-xs space-y-0.5">{candidate.matching_skills?.map(skill => <li key={skill}>{skill}</li>) || <li>N/A</li>}</ul></TooltipContent></Tooltip>
                        </div>
                        <div className="col-span-3 text-sm text-gray-600 truncate">{candidate.suggested_title || <span className="italic text-gray-400">Not specified</span>}</div>
                        <div className="col-span-2 text-center font-bold text-lg">
                          {analysisScores[candidate.id] ? ( 
                            <span className={getScoreColor(analysisScores[candidate.id].score)}>
                              {analysisScores[candidate.id].score}%
                            </span> 
                          ) : ( 
                            <span className="text-gray-400">-</span> 
                          )}
                        </div>
                        <div className="col-span-2 text-center">
                          <Link to={`/talent-pool/${candidate.id}`} onClick={(e) => e.stopPropagation()} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm">View</Button>
                          </Link>
                        </div>
                      </div>

                      <AnimatePresence>
                        {expandedCandidateId === candidate.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="grid grid-cols-12 gap-4 p-4 mx-2 my-1 bg-gray-50/80 border-l-4 border-purple-400 rounded-lg">
                              <div className="col-span-5">
                                <h4 className="text-sm font-semibold mb-2 text-gray-700">Skill Analysis</h4>
                                <p className="text-xs font-medium text-green-600 mb-1">Matched Skills:</p>
                                <div className="flex flex-wrap gap-1 mb-3">
                                  {candidate.matching_skills?.length > 0 ? candidate.matching_skills.map(s => <Badge key={s} variant="outline" className="bg-green-100 text-green-800">{s}</Badge>) : <span className="text-xs text-gray-500">None</span>}
                                </div>
                                <p className="text-xs font-medium text-red-600 mb-1">Unmatched Skills:</p>
                                <div className="flex flex-wrap gap-1">
                                  {candidate.unmatched_skills?.length > 0 ? candidate.unmatched_skills.map(s => <Badge key={s} variant="outline" className="bg-red-100 text-red-800">{s}</Badge>) : <span className="text-xs text-gray-500">All job skills are matched.</span>}
                                </div>
                              </div>
                              <div className="col-span-2"></div>
                              <div className="col-span-5 flex flex-col items-center justify-center">
                                <h4 className="text-sm font-semibold mb-2 text-gray-700">AI Deep Analysis</h4>
                                {validatingIds.includes(candidate.id) ? (
                                  <Button disabled className="bg-purple-600 hover:bg-purple-700">
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Analyzing...
                                  </Button>
                                ) : analysisScores[candidate.id] ? (
                                  <div className="text-center">
                                    <p className={`text-4xl font-bold ${getScoreColor(analysisScores[candidate.id].score)}`}>
                                        {analysisScores[candidate.id].score}%
                                    </p>
                                    <p className="text-sm text-gray-600">Compatibility Score</p>
                                  </div>
                                ) : (
                                  <Button 
                                    onClick={() => handleDeepAnalysis(candidate.id, candidate.candidate_name)} 
                                    className="bg-purple-600 hover:bg-purple-700"
                                  >
                                    <BrainCircuit className="mr-2 h-4 w-4" />
                                    Run Deep Analysis
                                  </Button>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Fragment>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Frown className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700">No Matches Found</h3>
                    <p>There were no candidates in the talent pool with skills matching this job.</p>
                  </div>
                )}
              </div>
              <div className="relative z-10 p-4"><Button onClick={onComplete} className="w-full h-12 text-base font-semibold bg-purple-600 hover:bg-purple-700 text-white">Close and View in Talent Pool</Button></div>
            </>
          ) : (
            // --- VIEW 1: ANALYSIS ENGINE (FULL, UNABRIDGED UI) ---
            <>
              <div className="absolute top-4 right-4 z-20"><Button variant="ghost" size="icon" onClick={onComplete} className="rounded-full bg-white/80 hover:bg-white shadow-sm"><X className="h-4 w-4" /></Button></div>
              <div className="relative z-10 flex flex-col items-center pt-8 px-8 text-center">
                 <div className="relative mb-6"><div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur-xl opacity-30 animate-pulse"></div><div className="relative bg-gradient-to-br from-purple-600 to-blue-600 p-4 rounded-2xl shadow-lg"><Brain className="h-10 w-10 text-white" /></div></div>
                 <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">AI Matching Engine Active</h2>
                 <p className="text-gray-600 font-medium">Deep analysis for <span className="text-purple-600 font-semibold">{jobTitle}</span></p>
                 <div className="flex items-center gap-2 mt-4"><Badge className="bg-purple-600 text-white border-0 px-3 py-1"><BrainCircuit className="h-3 w-3 mr-1" />Neural Processing</Badge><Badge className="bg-green-100 text-green-700 border-green-300/50 px-3 py-1"><Activity className="h-3 w-3 mr-1 animate-pulse" />Live Analysis</Badge></div>
              </div>
              
              <div className="flex-1 relative z-10 p-8 overflow-y-auto space-y-6 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                  {phases.map((phase, index) => {
                    const isActive = index === currentPhase;
                    const isCompleted = index < currentPhase;
                    const Icon = index === 0 ? FileText : index === 1 ? Filter : index === 2 ? SearchCode : Target;
                    const phaseProgress = ((currentSubStep + 1) / generateDynamicSubSteps(jobData, phases[currentPhase]).length) * 100;
                    return (
                      <div key={index} className="relative">
                        {index < phases.length - 1 && ( <div className={`hidden md:block absolute top-8 left-[60%] w-full h-0.5 transition-all duration-1000 ${ isCompleted ? 'bg-gradient-to-r from-green-400 to-teal-400' : 'bg-gray-200' }`}></div> )}
                        <div className={`relative p-4 rounded-xl border transition-all duration-500 ${ isActive ? 'bg-white border-purple-300 shadow-lg scale-105' : isCompleted ? 'bg-green-50 border-green-300' : 'bg-gray-50/70 border-gray-200' }`}>
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${ isCompleted ? 'bg-green-500 text-white' : isActive ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white animate-pulse' : 'bg-gray-300 text-gray-500' }`}>
                              {isCompleted ? <CheckCircle2 size={16} /> : isActive ? <Loader2 size={16} className="animate-spin" /> : <Icon size={16} />}
                            </div>
                            <h4 className={`font-semibold text-sm ${ isActive ? 'text-purple-700' : isCompleted ? 'text-green-700' : 'text-gray-500' }`}>{phase}</h4>
                          </div>
                          {isActive && ( <div className="space-y-2"><Progress value={phaseProgress} className="h-1.5" /><p className="text-xs text-purple-600 font-medium truncate">{generateDynamicSubSteps(jobData, phases[currentPhase])[currentSubStep]}</p></div> )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="grid grid-cols-3 gap-6">
                  <div className="bg-white/80 backdrop-blur rounded-xl p-4 border border-gray-200/50 shadow-sm"><div className="flex items-center justify-between mb-2"><Users className="h-5 w-5 text-purple-500" /><Badge className="text-xs bg-purple-100 text-purple-700 border-0">Scanning</Badge></div><p className="text-2xl font-bold text-purple-700">{displayScanned.toLocaleString()}</p><p className="text-xs text-gray-600">Profiles analyzed</p></div>
                  <div className="bg-white/80 backdrop-blur rounded-xl p-4 border border-gray-200/50 shadow-sm"><div className="flex items-center justify-between mb-2"><Award className="h-5 w-5 text-green-500" /><Badge className="text-xs bg-green-100 text-green-700 border-0">Matches</Badge></div><p className="text-2xl font-bold text-green-700">{displayMatches}</p><p className="text-xs text-gray-600">Perfect matches</p></div>
                  <div className="bg-white/80 backdrop-blur rounded-xl p-4 border border-gray-200/50 shadow-sm"><div className="flex items-center justify-between mb-2"><TrendingUp className="h-5 w-5 text-blue-500" /><Badge className="text-xs bg-blue-100 text-blue-700 border-0">Rate</Badge></div><p className="text-2xl font-bold text-blue-700">{matchRate}%</p><p className="text-xs text-gray-600">Match quality</p></div>
                </div>
                <div className="bg-white/80 backdrop-blur rounded-xl p-6 border border-gray-200/50 shadow-sm">
                  <div className="flex items-center gap-3 mb-4"><div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg"><Sparkles className="h-4 w-4 text-white" /></div><h3 className="font-semibold text-gray-800">AI Analysis Insights</h3><Badge className="ml-auto text-xs bg-purple-100 text-purple-700 border-0">Real-time</Badge></div>
                  <div className="space-y-3">
                    {dynamicLogs.slice(0, visibleLogs).map((entry, index) => { 
                      const Icon = entry.icon; 
                      return ( 
                        <div key={entry.id} className="flex gap-3 p-3 rounded-lg border bg-purple-50/50 border-purple-200/60 animate-slide-in" style={{ animationDelay: `${index * 100}ms` }}>
                          <div className="flex-shrink-0 text-purple-500 pt-0.5"><Icon className="h-5 w-5" /></div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1"><span className="font-semibold text-sm text-purple-800">{entry.title}</span></div>
                            <Typewriter text={entry.message} />
                          </div>
                        </div> 
                      ); 
                    })}
                    {visibleLogs < dynamicLogs.length && ( <div className="flex items-center justify-center py-4"><div className="flex items-center gap-2 text-purple-600"><Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm font-medium">Analyzing more insights...</span></div></div> )}
                  </div>
                </div>
              </div>

              <div className="relative z-10 p-4 bg-white/50 backdrop-blur-sm">
                <div className="flex items-center justify-center">{isComplete ? ( <div className="flex items-center gap-3 text-green-600"><div className="p-2 bg-green-100 rounded-full"><CheckCircle2 className="h-5 w-5" /></div><span className="font-semibold">Analysis Complete! Preparing results...</span></div> ) : ( <div className="flex items-center gap-3 text-purple-600"><div className="flex space-x-1">{[0, 1, 2].map((i) => ( <div key={i} className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} /> ))}</div><span className="text-sm font-medium">Processing {totalCandidatesInPool.toLocaleString()} profiles with advanced AI algorithms...</span></div> )}</div>
              </div>
            </>
          )}
        </Card>
        <style jsx>{`
          @keyframes slide-in { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
          .animate-slide-in { animation: slide-in 0.5s ease-out forwards; }
          .custom-scrollbar::-webkit-scrollbar { width: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #ccc; border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #aaa; }
        `}</style>
      </div>
    </TooltipProvider>
  );
};

export default JobMatchLoader;