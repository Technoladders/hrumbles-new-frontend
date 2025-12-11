// src/pages/jobs/ai/BgvVerificationSection.tsx

import { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Candidate } from '@/lib/types';
import { useBgvVerifications } from '@/hooks/bg-verification/useBgvVerifications';
import { VerificationMenuList } from './VerificationMenuList';
import { VerificationInputForm } from './VerificationInputForm';
import { isVerificationSuccessful } from '@/components/jobs/ai/utils/bgvUtils';
import { AllResultsDisplay } from './results/AllResultsDisplay';

const baseVerificationConfig = {
  fetchUan: {
    label: 'Fetch UAN',
    methods: {
      mobile_to_uan: { label: 'Fetch by Mobile', inputs: [{ name: 'mobile', placeholder: 'Enter 10-digit mobile', label: 'Mobile Number' }] },
      pan_to_uan: { label: 'Fetch by PAN', inputs: [{ name: 'pan', placeholder: 'Enter PAN', label: 'PAN Number' }] },
    }
  },
  fetchLatestUan: {
    label: 'Fetch Latest Employment (UAN)',
    isDirect: true,
    method: 'latest_employment_uan',
    inputs: [
      { name: 'uan', placeholder: 'Enter 12-digit UAN', label: 'Candidate UAN' }
    ]
  },
  // --- COMMENTED OUT: Fetch Latest Employment (Mobile) ---
  // fetchLatestMobile: {
  //   label: 'Fetch Latest Employment (Mobile)',
  //   isDirect: true,
  //   method: 'latest_employment_mobile',
  //   inputs: [
  //     { name: 'mobile', placeholder: 'Enter 10-digit mobile', label: 'Candidate Mobile Number' },
  //     { name: 'pan', placeholder: 'Enter PAN', label: 'Candidate PAN Number' }
  //   ]
  // },
  // --- COMMENTED OUT: Fetch EPFO Passbook (Without OTP) ---
  // fetchLatestPassbook: {
  //   label: 'Fetch EPFO Passbook (Without OTP)',
  //   isDirect: true,
  //   method: 'latest_passbook_mobile',
  //   inputs: [
  //     { name: 'mobile', placeholder: 'Enter 10-digit mobile', label: 'Candidate Mobile Number' },
  //     { name: 'pan', placeholder: 'Enter PAN (Optional)', label: 'Candidate PAN Number' }
  //   ]
  // },
};

export const BgvVerificationSection = ({ candidate }: { candidate: Candidate }) => {
  const [view, setView] = useState<'main' | 'submenu' | 'form'>('main');
  const [activeCategory, setActiveCategory] = useState<any | null>(null);
  const [activeMethod, setActiveMethod] = useState<any | null>(null);

  const organizationId = useSelector((state: any) => state.auth.organization_id);

  // --- Fetch Organization Verification Configuration ---
  const { data: orgConfig } = useQuery({
    queryKey: ['org-verification-config', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_organizations')
        .select('verification_check')
        .eq('id', organizationId)
        .single();
      
      if (error) {
        console.error("Error fetching org config:", error);
        return { verification_check: 'truthscreen' };
      }
      return data;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 30,
  });

  const dynamicVerificationConfig = useMemo(() => {
    const orderedConfig: any = {
      fetchUan: baseVerificationConfig.fetchUan,
      fetchLatestUan: baseVerificationConfig.fetchLatestUan,
    };

    const provider = orgConfig?.verification_check || 'truthscreen';
    console.log("provider:", provider);

    if (provider === 'gridlines') {
      orderedConfig.fetchHistory = {
        label: 'Fetch Employment History',
        isDirect: true,
        method: 'uan_full_history_gl',
        legacyKey: 'uan_full_history',
        inputs: [{ name: 'uan', placeholder: 'Enter 12-digit UAN', label: 'UAN Number' }]
      };
    } else {
      orderedConfig.fetchHistory = {
        label: 'Fetch Employment History',
        isDirect: true,
        method: 'uan_full_history',
        inputs: [{ name: 'uan', placeholder: 'Enter 12-digit UAN', label: 'UAN Number' }]
      };
    }

    // --- COMMENTED OUT: These menu items are disabled for now ---
    // orderedConfig.fetchLatestMobile = baseVerificationConfig.fetchLatestMobile;
    // orderedConfig.fetchLatestPassbook = baseVerificationConfig.fetchLatestPassbook;
    
    return orderedConfig;
  }, [orgConfig]);

  const { state, handleInputChange, handleVerify } = useBgvVerifications(candidate);

  // --- Handler for navigation from result buttons ---
  const handleNavigateToVerification = (verificationType: string, prefillData: any) => {
    console.log('Navigating to verification:', verificationType, 'with prefill data:', prefillData);
    
    // Find the matching category and method in config
    let targetCategory = null;
    let targetMethod = null;

    // Search through config to find the verification type
    Object.entries(dynamicVerificationConfig).forEach(([categoryKey, categoryValue]: [string, any]) => {
      if (categoryValue.isDirect && categoryValue.method === verificationType) {
        targetCategory = { key: categoryKey, ...categoryValue };
        targetMethod = { key: verificationType, ...categoryValue };
      } else if (categoryValue.methods) {
        Object.entries(categoryValue.methods).forEach(([methodKey, methodValue]: [string, any]) => {
          if (methodKey === verificationType) {
            targetCategory = { key: categoryKey, ...categoryValue };
            targetMethod = { key: methodKey, ...methodValue };
          }
        });
      }
    });

    if (!targetCategory || !targetMethod) {
      console.error('Could not find verification type in config:', verificationType);
      return;
    }

    // Pre-fill input data
    if (prefillData.uan) {
      handleInputChange('uan', prefillData.uan);
    }
    if (prefillData.mobile) {
      handleInputChange('mobile', prefillData.mobile);
    }
    if (prefillData.pan) {
      handleInputChange('pan', prefillData.pan);
    }

    // Update state to show the form
    setActiveCategory(targetCategory);
    setActiveMethod(targetMethod);
    setView('form');
  };

  const handleSelectCategory = (key: string) => {
    const category = (dynamicVerificationConfig as any)[key];
    setActiveCategory({ key, ...category });

    if (!category.isDirect) {
      const successfulMethodKey = Object.keys(category.methods).find(methodKey => {
        const methodConfig = category.methods[methodKey];
        
        const result = state.results[methodKey as keyof typeof state.results];
        const isNewVerified = result && isVerificationSuccessful(result.data, methodKey);
        if (isNewVerified) return true;

        if (methodConfig.legacyKey) {
          const legacyResult = state.results[methodConfig.legacyKey as keyof typeof state.results];
          if (legacyResult && isVerificationSuccessful(legacyResult.data, methodConfig.legacyKey)) return true;
        }

        return false;
      });

      if (successfulMethodKey) {
        setActiveMethod({ key: successfulMethodKey, ...category.methods[successfulMethodKey] });
        setView('form');
        return;
      }
    }

    if (category.isDirect) {
      setActiveMethod({ key: category.method, ...category });
      setView('form');
    } else {
      setView('submenu');
    }
  };

  const handleSelectMethod = (key: string) => {
    const method = activeCategory.methods[key];
    setActiveMethod({ key, ...method });
    setView('form');
  };

  const handleBack = () => {
    if (view === 'form') {
      const currentResult = state.results[activeMethod.key as keyof typeof state.results];
      const legacyResult = activeMethod.legacyKey ? state.results[activeMethod.legacyKey as keyof typeof state.results] : null;

      const isVerified = (currentResult && isVerificationSuccessful(currentResult.data, activeMethod.key)) ||
                         (legacyResult && isVerificationSuccessful(legacyResult.data, activeMethod.legacyKey));

      if (activeCategory.isDirect || isVerified) {
        setView('main');
        setActiveCategory(null);
        setActiveMethod(null);
      } else {
        setView('submenu');
        setActiveMethod(null);
      }
    } else if (view === 'submenu') {
      setView('main');
      setActiveCategory(null);
    }
  };

  let transformValue = 'translateX(0%)';
  if (view === 'submenu') transformValue = 'translateX(-33.333%)';
  if (view === 'form') transformValue = 'translateX(-66.666%)';

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-lg">
      <CardHeader className="flex-shrink-0 border-b">
        <CardTitle className="text-black-800">Background Verification</CardTitle>
      </CardHeader>
      
      <CardContent className="relative h-[calc(100vh-200px)] flex-grow overflow-hidden p-0 sm:p-4">
        <div 
          className="absolute top-0 left-0 w-[300%] h-full flex transition-transform duration-300 ease-in-out"
          style={{ transform: transformValue }}
        >
          {/* SLIDE 1: Main Menu + Results */}
          <div className="w-1/3 flex-shrink-0 p-6 h-full overflow-y-auto">
            <VerificationMenuList
              title="Select a Verification"
              items={Object.entries(dynamicVerificationConfig).map(([key, value]: [string, any]) => ({ key, label: value.label }))}
              onSelect={handleSelectCategory}
              results={state.results}
              config={dynamicVerificationConfig}
            />

            <div className="mt-8 pt-6 border-t border-gray-200">
               <h3 className="text-lg font-semibold mb-4 text-gray-900">Verification Results</h3>
               <AllResultsDisplay 
                  candidate={candidate}
                  results={state.results} 
                  onBack={() => {}} 
                  hideActions={true}
                  hideNavigationButtons={true}
               />
            </div>
          </div>
          
          {/* SLIDE 2: Submenu */}
          <div className="w-1/3 flex-shrink-0 p-6 h-full overflow-y-auto">
            {activeCategory && !activeCategory.isDirect && (
              <VerificationMenuList
                title={activeCategory.label}
                items={Object.entries(activeCategory.methods).map(([key, value]: [string, any]) => ({ key, label: value.label }))}
                onSelect={handleSelectMethod}
                onBack={handleBack}
                results={state.results}
                config={dynamicVerificationConfig}
                parentKey={activeCategory.key}
              />
            )}
          </div>
          
          {/* SLIDE 3: Input Form */}
          <div className="w-1/3 flex-shrink-0 p-6 h-full overflow-y-auto">
            {activeMethod && (
              <VerificationInputForm
                title={activeMethod.label}
                candidate={candidate}
                verificationType={activeMethod.key as keyof typeof state.inputs}
                legacyKey={activeMethod.legacyKey}
                inputs={activeMethod.inputs}
                state={state}
                onInputChange={handleInputChange}
                onVerify={handleVerify}
                onBack={handleBack}
                onNavigateToVerification={handleNavigateToVerification}
              />
            )}
          </div>
        </div>
      </CardContent>
    </div>
  );
};