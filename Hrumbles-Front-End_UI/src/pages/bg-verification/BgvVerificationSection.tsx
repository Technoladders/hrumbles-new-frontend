// src/pages/jobs/ai/BgvVerificationSection.tsx

import { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Candidate } from '@/lib/types';
import { useBgvVerifications } from '@/hooks/bg-verification/useBgvVerifications';
import { VerificationMenuList } from './VerificationMenuList';
import { VerificationInputForm } from './VerificationInputForm';
import { isVerificationSuccessful } from '@/components/jobs/ai/utils/bgvUtils';
import { AllResultsDisplay } from './results/AllResultsDisplay';

const ASCENDION_ORGANIZATION_ID = "22068cb4-88fb-49e4-9fb8-4fa7ae9c23e5";

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
  fetchLatestMobile: {
    label: 'Fetch Latest Employment (Mobile)',
    isDirect: true,
    method: 'latest_employment_mobile',
    inputs: [
      { name: 'mobile', placeholder: 'Enter 10-digit mobile', label: 'Candidate Mobile Number' },
      { name: 'pan', placeholder: 'Enter PAN', label: 'Candidate PAN Number' }
    ]
  },
  fetchLatestPassbook: {
    label: 'Fetch EPFO Passbook (Without OTP)',
    isDirect: true,
    method: 'latest_passbook_mobile',
    inputs: [
      { name: 'mobile', placeholder: 'Enter 10-digit mobile', label: 'Candidate Mobile Number' },
      { name: 'pan', placeholder: 'Enter PAN (Optional)', label: 'Candidate PAN Number' }
    ]
  },
  viewAll: {
    label: 'View All Results',
    isDirect: true,
    method: 'view_all',
    inputs: [],
  },
};

export const BgvVerificationSection = ({ candidate }: { candidate: Candidate }) => {
  const [view, setView] = useState<'main' | 'submenu' | 'form' | 'all_results'>('main');
  const [activeCategory, setActiveCategory] = useState<any | null>(null);
  const [activeMethod, setActiveMethod] = useState<any | null>(null);

  const organizationId = useSelector((state: any) => state.auth.organization_id);

  const dynamicVerificationConfig = useMemo(() => {
    const orderedConfig: any = { // Use 'any' for easier dynamic insertion
      fetchUan: baseVerificationConfig.fetchUan,
      fetchLatestUan: baseVerificationConfig.fetchLatestUan,
    };

    if (organizationId === ASCENDION_ORGANIZATION_ID) {
      orderedConfig.fetchHistory = {
        label: 'Fetch Employment History',
        isDirect: true,
        method: 'uan_full_history_gl',
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

    orderedConfig.fetchLatestMobile = baseVerificationConfig.fetchLatestMobile;
    orderedConfig.fetchLatestPassbook = baseVerificationConfig.fetchLatestPassbook;
    orderedConfig.viewAll = baseVerificationConfig.viewAll;
    
    return orderedConfig;
  }, [organizationId]);


  const { state, handleInputChange, handleVerify } = useBgvVerifications(candidate);

  const handleSelectCategory = (key: string) => {
    if (key === 'viewAll') {
      setView('all_results');
      return;
    }

    const category = (dynamicVerificationConfig as any)[key];
    setActiveCategory({ key, ...category });

    if (!category.isDirect) {
      const successfulMethodKey = Object.keys(category.methods).find(methodKey => {
        const result = state.results[methodKey as keyof typeof state.results];
        return result && isVerificationSuccessful(result.data, methodKey);
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
    if (view === 'all_results') {
        setView('main');
        return;
    }
    if (view === 'form') {
      const currentResult = state.results[activeMethod.key as keyof typeof state.results];
      if (activeCategory.isDirect || isVerificationSuccessful(currentResult?.data, activeMethod.key)) {
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
     <CardContent className="relative h-[calc(100vh-200px)] flex-grow overflow-y-auto p-0 sm:p-4">
       {view === 'all_results' ? (
          <div className="p-6 animate-fade-in">
             <AllResultsDisplay 
                candidate={candidate}
                results={state.results} 
                onBack={handleBack} 
            />
          </div>
        ) : (
        <div 
          className="absolute top-0 left-0 w-[300%] h-full flex transition-transform duration-300 ease-in-out"
          style={{ transform: transformValue }}
        >
          <div className="w-1/3 flex-shrink-0 p-6">
            <VerificationMenuList
              title="Select a Verification"
              items={Object.entries(dynamicVerificationConfig).map(([key, value]: [string, any]) => ({ key, label: value.label }))}
              onSelect={handleSelectCategory}
              results={state.results}
              config={dynamicVerificationConfig}
            />
          </div>
          
          <div className="w-1/3 flex-shrink-0 p-6">
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
          
          <div className="w-1/3 flex-shrink-0 p-6">
            {activeMethod && (
              <VerificationInputForm
                title={activeMethod.label}
                candidate={candidate}
                verificationType={activeMethod.key as keyof typeof state.inputs}
                inputs={activeMethod.inputs}
                state={state}
                onInputChange={handleInputChange}
                onVerify={handleVerify}
                onBack={handleBack}
              />
            )}
          </div>
        </div>
        )}
      </CardContent>
    </div>
  );
};