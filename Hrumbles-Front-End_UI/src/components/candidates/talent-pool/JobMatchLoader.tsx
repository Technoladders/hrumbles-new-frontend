import { useState, useEffect, FC } from 'react';
import { Card } from '@/components/ui/card';
import { CheckCircle2, FileText, Filter, Loader2, SearchCode, UsersRound, Brain, Zap, Target, Clock, AlertTriangle, Activity, Pause, Sparkles, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

interface JobData {
  title: string;
  skills: string[];
  description: string;
  experience: { min: { years: number; months: number }; max: { years: number; months: number } };
  location: string[];
}

const generateDynamicSubSteps = (jobData: JobData, phase: string): string[] => {
  const { skills, experience, location } = jobData;
  const randomSkill = skills[Math.floor(Math.random() * skills.length)];
  const randomOtherSkill = skills[Math.floor(Math.random() * skills.length)];

  switch (phase) {
    case 'Extracting Job Requirements':
      return [
        `Parsing job description for ${jobData.title}...`,
        `Identifying key skills: ${randomSkill}, ${randomOtherSkill}...`,
        `Analyzing experience: ${experience.min.years}+ years required...`,
        `Extracting location: ${location[0]} preferred...`,
      ];
    case 'Building Matching Criteria':
      return [
        `Weighting skills match (${randomSkill}: 40%)...`,
        `Experience alignment (${experience.min.years}-${experience.max.years} years: 30%)...`,
        `Location proximity scoring (${location[0]}...`,
        `Cultural fit heuristics from description...`,
      ];
    case 'Scanning Candidate Pool':
      return [
        'Indexing full talent pool...',
        `Filtering by ${randomSkill} overlap...`,
        'Cross-referencing work history via NLP...',
        `Evaluating soft skills for ${jobData.title} role...`,
      ];
    case 'Scoring & Ranking':
      return [
        'Computing semantic match scores (0-100)...',
        `Ranking by ${randomSkill} relevance...`,
        'Applying diversity and recency filters...',
        'Generating top recommendations...',
      ];
    default:
      return [];
  }
};

const generateDynamicLogs = (jobData: JobData, totalCandidates: number, matchCount: number, currentDate: Date): { id: number; timestamp: string; message: string; type: 'info' | 'success' | 'warning' }[] => {
  const { skills, title } = jobData;
  const randomSkill = skills[Math.floor(Math.random() * skills.length)];
  const randomCandidateName = ['Ashley Viji Panicker', 'Pranav Badhe', 'Mayank Singh', 'Amel T Kavana', 'Srinivasan Nadaradjane'][Math.floor(Math.random() * 5)];
  const matchRate = Math.round((matchCount / totalCandidates) * 100);

  const baseTime = currentDate.getHours() * 3600 + currentDate.getMinutes() * 60 + currentDate.getSeconds();
  return [
    { id: 1, timestamp: new Date(currentDate.getTime() + 1000).toTimeString().slice(0, 8), message: `Initializing AI matching for ${title}...`, type: 'info' },
    { id: 2, timestamp: new Date(currentDate.getTime() + 2000).toTimeString().slice(0, 8), message: `Loaded requirements: ${randomSkill} expertise needed`, type: 'info' },
    { id: 3, timestamp: new Date(currentDate.getTime() + 5000).toTimeString().slice(0, 8), message: 'Skill embeddings computed. Vector space ready.', type: 'success' },
    { id: 4, timestamp: new Date(currentDate.getTime() + 8000).toTimeString().slice(0, 8), message: `Talent pool indexed: ${totalCandidates.toLocaleString()} profiles`, type: 'info' },
    { id: 5, timestamp: new Date(currentDate.getTime() + 12000).toTimeString().slice(0, 8), message: `Initial matches: ${matchCount} candidates (${matchRate}%)`, type: 'success' },
    { id: 6, timestamp: new Date(currentDate.getTime() + 15000).toTimeString().slice(0, 8), message: 'Applying recency and experience decay...', type: 'info' },
    { id: 7, timestamp: new Date(currentDate.getTime() + 18000).toTimeString().slice(0, 8), message: `⚠ Location mismatch for ${(matchRate * 0.23).toFixed(0)}% of pool`, type: 'warning' },
    { id: 8, timestamp: new Date(currentDate.getTime() + 22000).toTimeString().slice(0, 8), message: `Top match: ${randomCandidateName} (92% - Strong ${randomSkill})`, type: 'success' },
    { id: 9, timestamp: new Date(currentDate.getTime() + 25000).toTimeString().slice(0, 8), message: 'Refining with business process alignment...', type: 'info' },
    { id: 10, timestamp: new Date(currentDate.getTime() + 28000).toTimeString().slice(0, 8), message: `${matchCount} high-confidence recommendations generated`, type: 'success' },
    { id: 11, timestamp: new Date(currentDate.getTime() + 30000).toTimeString().slice(0, 8), message: 'Deep analysis complete. Optimizing final rank...', type: 'success' },
  ];
};

interface JobMatchLoaderProps {
  jobTitle: string;
  totalCandidatesInPool: number;
  expectedMatches?: number; // From RPC total_candidate_count, if available pre-load
  jobData?: JobData; // Full job details for dynamic content
  onComplete?: () => void; // Optional callback when animation ends
}

const JobMatchLoader: FC<JobMatchLoaderProps> = ({ 
  jobTitle, 
  totalCandidatesInPool, 
  expectedMatches = 5, // Default simulation
  jobData = { 
    title: jobTitle, 
    skills: ['Power Apps', 'Power Fx', 'Power Automate', 'SharePoint'], // From sample
    description: 'Power Apps Developer role...',
    experience: { min: { years: 3, months: 0 }, max: { years: 5, months: 0 } },
    location: ['Remote']
  },
  onComplete 
}) => {
  const [currentPhase, setCurrentPhase] = useState(0);
  const [currentSubStep, setCurrentSubStep] = useState(0);
  const [displayScanned, setDisplayScanned] = useState(0);
  const [displayMatches, setDisplayMatches] = useState(0);
  const [matchRate, setMatchRate] = useState(0);
  const [visibleLogs, setVisibleLogs] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [dynamicLogs, setDynamicLogs] = useState<{ id: number; timestamp: string; message: string; type: 'info' | 'success' | 'warning' }[]>([]);

  const currentDate = new Date('2025-11-19'); // Fixed for consistency

  // Generate dynamic content on mount
  useEffect(() => {
    const logs = generateDynamicLogs(jobData, totalCandidatesInPool, expectedMatches, currentDate);
    setDynamicLogs(logs);
  }, []);

  // Non-continuous phase progression with random pauses
  useEffect(() => {
    if (isComplete) return;

    const phaseDurations = [2000 + Math.random() * 2000, 1500 + Math.random() * 1000, 4000 + Math.random() * 3000, 2000 + Math.random() * 1500]; // Varied 2-6s per phase
    let phaseTimer: NodeJS.Timeout;

    const advancePhase = () => {
      if (currentPhase < 3) { // 4 phases indexed 0-3
        // Random pause simulation (10-30% chance)
        if (Math.random() < 0.2) {
          setIsPaused(true);
          const reasons = ['Deep semantic analysis...', 'Cross-validating experience...', 'Optimizing skill weights...', 'Considering location factors...'];
          setPauseReason(reasons[Math.floor(Math.random() * reasons.length)]);
          setTimeout(() => {
            setIsPaused(false);
            setCurrentPhase(prev => prev + 1);
            setCurrentSubStep(0);
          }, 1000 + Math.random() * 2000); // Pause 1-3s
          return;
        }
        setCurrentPhase(prev => prev + 1);
        setCurrentSubStep(0);
      } else {
        setIsComplete(true);
        onComplete?.();
      }
    };

    phaseTimer = setTimeout(advancePhase, phaseDurations[currentPhase]);

    return () => clearTimeout(phaseTimer);
  }, [currentPhase, isComplete, onComplete]);

  // Sub-steps with varied timing
  useEffect(() => {
    if (isComplete || isPaused) return;
     const phaseDurations = [2000 + Math.random() * 2000, 1500 + Math.random() * 1000, 4000 + Math.random() * 3000, 2000 + Math.random() * 1500]; // Varied 2-6s per phase

    const currentPhaseData = {
      phase: Object.keys({ 'Extracting Job Requirements': 0, 'Building Matching Criteria': 0, 'Scanning Candidate Pool': 0, 'Scoring & Ranking': 0 })[currentPhase],
      subSteps: generateDynamicSubSteps(jobData, Object.keys({ 'Extracting Job Requirements': 0, 'Building Matching Criteria': 0, 'Scanning Candidate Pool': 0, 'Scoring & Ranking': 0 })[currentPhase]),
    };
    const subDuration = (phaseDurations[currentPhase] || 2000) / currentPhaseData.subSteps.length;

    const subTimer = setTimeout(() => {
      if (currentSubStep < currentPhaseData.subSteps.length - 1) {
        setCurrentSubStep(prev => prev + 1);
      }
    }, subDuration);

    return () => clearTimeout(subTimer);
  }, [currentPhase, currentSubStep, isPaused]);

  // Gradual scanned count (starts immediately, ramps over 4s)
  useEffect(() => {
    const scannedDuration = 4000;
    const interval = 50;
    const steps = scannedDuration / interval;
    const increment = Math.ceil(totalCandidatesInPool / steps);
    let count = 0;

    const timer = setInterval(() => {
      count += increment;
      setDisplayScanned(Math.min(count, totalCandidatesInPool));
      if (count >= totalCandidatesInPool) clearInterval(timer);
    }, interval);

    return () => clearInterval(timer);
  }, [totalCandidatesInPool]);

  // Gradual matches ramp-up, tied to phases (e.g., 0→1→3→4→expectedMatches)
  useEffect(() => {
    const matchRamp = [0, 1, 3, 4, expectedMatches]; // Incremental per phase
    let phaseMatch = 0;

    const matchTimer = setInterval(() => {
      if (currentPhase < matchRamp.length) {
        const target = matchRamp[currentPhase];
        if (phaseMatch < target) {
          phaseMatch++;
          setDisplayMatches(phaseMatch);
          setMatchRate(Math.round((phaseMatch / totalCandidatesInPool) * 100));
        }
      }
      if (currentPhase >= matchRamp.length - 1 && phaseMatch >= expectedMatches) {
        clearInterval(matchTimer);
      }
    }, 800 + Math.random() * 400); // Varied 0.8-1.2s per increment

    return () => clearInterval(matchTimer);
  }, [currentPhase, expectedMatches, totalCandidatesInPool]);

  // Reveal logs gradually
  useEffect(() => {
    const logInterval = setInterval(() => {
      setVisibleLogs(prev => Math.min(prev + 1, dynamicLogs.length));
    }, 1500 + Math.random() * 1000); // Varied reveal

    return () => clearInterval(logInterval);
  }, [dynamicLogs.length]);

  const phases = ['Extracting Job Requirements', 'Building Matching Criteria', 'Scanning Candidate Pool', 'Scoring & Ranking'];
  const currentPhaseData = {
    phase: phases[currentPhase],
    subSteps: generateDynamicSubSteps(jobData, phases[currentPhase]),
  };
  const phaseProgress = ((currentSubStep + 1) / currentPhaseData.subSteps.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <Card className="w-full max-w-4xl h-[90vh] flex flex-col animate-fade-in relative overflow-hidden shadow-2xl">
        {/* Background particles/animation */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50"></div>
        <div className="absolute top-4 right-4 z-20">
          <Button variant="ghost" size="sm" onClick={() => { setIsComplete(true); onComplete?.(); }}>
            <X className="h-4 w-4" /> Cancel
          </Button>
        </div>

        {/* Header */}
        <div className="relative z-10 flex flex-col items-center p-6 pt-12 text-center border-b border-gray-200">
          <div className="relative h-16 w-16 mb-4">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-600 rounded-full animate-spin" style={{ animationDuration: '3s' }}></div>
            <Brain className="relative z-10 h-8 w-8 text-white drop-shadow-md" />
          </div>
          <h2 className="text-2xl font-bold mb-2">AI Matching Engine Active</h2>
          <p className="text-gray-600">Deep analysis for <strong>{jobTitle}</strong></p>
          <Badge variant="secondary" className="mt-2">
            <Activity className="h-3 w-3 mr-1 animate-pulse" />
            {isPaused ? 'Paused - Deep Thinking' : 'Live Processing'}
          </Badge>
        </div>

        <div className="flex-1 relative z-10 p-6 overflow-y-auto space-y-6">
          {/* Phase Steps - Full width */}
          <div className="space-y-4">
            {phases.map((phase, index) => {
              const isActive = index === currentPhase;
              const isCompleted = index < currentPhase;
              const Icon = index === 0 ? FileText : index === 1 ? Filter : index === 2 ? SearchCode : Target;

              return (
                <div key={index} className="flex items-start gap-4 transition-all duration-700">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center border-2 mt-1 transition-colors
                    ${isCompleted ? 'bg-green-100 border-green-300 text-green-600' : ''}
                    ${isActive ? 'bg-purple-100 border-purple-300 text-purple-600 animate-pulse' : ''}
                    ${!isCompleted && !isActive ? 'bg-gray-100 border-gray-300 text-gray-400' : ''}
                  `}>
                    {isCompleted ? <CheckCircle2 size={22} /> : 
                     isActive ? <Loader2 size={22} className="animate-spin" /> : 
                     <Icon size={22} />}
                  </div>
                  <div className="flex-1">
                    <p className={`
                      font-semibold transition-colors mb-2
                      ${isCompleted ? 'text-gray-800' : ''}
                      ${isActive ? 'text-purple-700' : 'text-gray-500'}
                    `}>
                      {phase}
                    </p>
                    {isActive && !isPaused && (
                      <div className="space-y-2">
                        <Progress value={phaseProgress} className="w-full h-2" indicatorClassName="bg-purple-600" />
                        <p className="text-sm text-purple-600 font-medium">
                          {currentPhaseData.subSteps[currentSubStep]}
                        </p>
                      </div>
                    )}
                    {isPaused && isActive && (
                      <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 p-3 rounded-lg">
                        <Pause className="h-4 w-4" />
                        <span className="text-sm font-medium">{pauseReason}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Metrics Dashboard */}
          {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white/70 rounded-xl">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Profiles Scanned</p>
              <p className="text-3xl font-bold text-purple-600">
                {displayScanned.toLocaleString()}
                <span className="text-lg font-normal">/{totalCandidatesInPool.toLocaleString()}</span>
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Matches Found</p>
              <p className="text-3xl font-bold text-green-600">{displayMatches}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Match Rate</p>
              <p className="text-3xl font-bold text-blue-600">{matchRate}%</p>
              <p className="text-xs text-gray-500">({displayMatches}/{totalCandidatesInPool})</p>
            </div>
          </div> */}

          {/* Log Console */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-gray-400 animate-pulse" />
              <p className="text-sm font-semibold text-gray-700">Real-Time Analysis Log</p>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-2 bg-gray-50 p-4 rounded-lg text-sm">
              {dynamicLogs.slice(0, visibleLogs).map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 pl-2 border-l-2 border-gray-200">
                  <span className="text-xs text-gray-400 min-w-[70px] font-mono">{entry.timestamp}</span>
                  <div className="flex-1">
                    <span className={`inline-block w-2 h-2 rounded-full mr-2
                      ${entry.type === 'success' ? 'bg-green-500' : entry.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'}
                    `}></span>
                    <span className={`
                      ${entry.type === 'success' ? 'text-green-700 font-medium' : entry.type === 'warning' ? 'text-yellow-700 font-medium' : 'text-blue-700'}
                    `}>
                      {entry.message}
                    </span>
                  </div>
                </div>
              ))}
              {visibleLogs < dynamicLogs.length && (
                <div className="text-center py-4 text-gray-400">Analyzing...</div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 p-4 border-t border-gray-200 bg-white flex justify-center">
          {isComplete ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5 animate-bounce" />
              <span className="font-semibold">Analysis Complete! Loading {displayMatches} Top Matches...</span>
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              Estimated time remaining: {isPaused ? 'Pausing for optimization...' : `${Math.round((4 - currentPhase) * 1.5)}s`}
            </div>
          )}
        </div>

        {/* Completion Overlay */}
        {/* {isComplete && (
          <div className="absolute inset-0 bg-green-50/80 flex items-center justify-center">
            <div className="text-center p-8">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4 animate-bounce" />
              <h3 className="text-2xl font-bold text-green-700 mb-2">Matching Optimized!</h3>
              <p className="text-gray-600">Prepared {displayMatches} candidates at {matchRate}% relevance</p>
            </div>
          </div>
        )} */}
      </Card>
    </div>
  );
};

export default JobMatchLoader;