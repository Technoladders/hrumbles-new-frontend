// src/pages/jobs/ai/BgvVerificationSection.tsx

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Candidate } from '@/lib/types';
import { useBgvVerifications } from '@/hooks/bg-verification/useBgvVerifications'; // Corrected path
import { VerificationMenuList } from './VerificationMenuList';
import { VerificationInputForm } from './VerificationInputForm';
import { isVerificationSuccessful } from '@/components/jobs/ai/utils/bgvUtils';


const verificationConfig = {
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
  fetchHistory: {
    label: 'Fetch Employment History',
    isDirect: true,
    method: 'uan_full_history',
    inputs: [{ name: 'uan', placeholder: 'Enter 12-digit UAN', label: 'UAN Number' }]
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
};

export const BgvVerificationSection = ({ candidate }: { candidate: Candidate }) => {
  const [view, setView] = useState<'main' | 'submenu' | 'form'>('main');
  const [activeCategory, setActiveCategory] = useState<any | null>(null);
  const [activeMethod, setActiveMethod] = useState<any | null>(null);

  const { state, handleInputChange, handleVerify } = useBgvVerifications(candidate);

  const handleSelectCategory = (key: string) => {
    const category = verificationConfig[key];
    setActiveCategory({ key, ...category });

    // --- THIS IS THE NEW, SMART LOGIC ---
    // If the category is not direct (i.e., it has sub-methods)
    if (!category.isDirect) {
      // Find the key of the FIRST successful method within this category
      const successfulMethodKey = Object.keys(category.methods).find(methodKey => {
        const result = state.results[methodKey];
        return result && isVerificationSuccessful(result.data, methodKey);
      });

      // If we found a successful method, skip the sub-menu and go straight to the result!
      if (successfulMethodKey) {
        setActiveMethod({ key: successfulMethodKey, ...category.methods[successfulMethodKey] });
        setView('form');
        return; // Exit the function to prevent the default behavior
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
      // If we came directly from main menu, go back to main menu
      if (activeCategory.isDirect || isVerificationSuccessful(state.results[activeMethod.key]?.data, activeMethod.key)) {
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

  // The animation and rendering logic below remains the same
  let transformValue = 'translateX(0%)';
  if (view === 'submenu') transformValue = 'translateX(-33.333%)';
  if (view === 'form') transformValue = 'translateX(-66.666%)';

   return (
    <Card className="w-full shadow-md border-gray-200">
      <CardHeader><CardTitle className="text-gray-800">Background Verification</CardTitle></CardHeader>
     <CardContent className="relative h-[calc(100vh-200px)] overflow-y-auto p-0 sm:p-4 mb-4">
        <div 
          className="absolute top-0 left-0 w-[300%] h-full flex transition-transform duration-300 ease-in-out"
          style={{ transform: transformValue }}
        >
          {/* Panel 1: Main Menu */}
          <div className="w-1/3 flex-shrink-0 p-6">
            <VerificationMenuList
              title="Select a Verification"
              items={Object.entries(verificationConfig).map(([key, value]) => ({ key, label: value.label }))}
              onSelect={handleSelectCategory}
              results={state.results}
              config={verificationConfig}
            />
          </div>
          
          {/* Panel 2: Sub-Menu */}
          <div className="w-1/3 flex-shrink-0 p-6">
            {activeCategory && !activeCategory.isDirect && (
              <VerificationMenuList
                title={activeCategory.label}
                items={Object.entries(activeCategory.methods).map(([key, value]: [string, any]) => ({ key, label: value.label }))}
                onSelect={handleSelectMethod}
                onBack={handleBack}
                results={state.results}
                config={verificationConfig}
                parentKey={activeCategory.key}
              />
            )}
          </div>
          
          {/* Panel 3: Input Form & Result Display */}
          <div className="w-1/3 flex-shrink-0 p-6">
            {activeMethod && (
              <VerificationInputForm
                title={activeMethod.label}
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
      </CardContent>
    </Card>
  );
};
// 