// src/pages/jobs/ai/VerificationMenuList.tsx

import { Button } from '@/components/ui/button';
import { ChevronRight, ArrowLeft, User, History, BookOpen, ShieldCheck, CheckCircle, FileText } from 'lucide-react';
import { BGVState } from '@/hooks/bg-verification/useBgvVerifications';
import { isVerificationSuccessful } from '@/components/jobs/ai/utils/bgvUtils';

const iconMap: { [key: string]: React.ElementType } = {
  fetchUan: User,
  fetchLatestUan: User,
  fetchHistory: History,
  fetchLatestPassbook: BookOpen,
  fetchLatestMobile: BookOpen,
  mobile_to_uan: ShieldCheck,
  pan_to_uan: ShieldCheck,
  viewAll: FileText,
  uan_full_history: History,     
  uan_full_history_gl: History,  
};

interface Props {
  title: string;
  items: { key: string; label: string }[];
  onSelect: (key: string) => void;
  onBack?: () => void;
  results: BGVState['results'];
  config: any;
  parentKey?: string;
}

export const VerificationMenuList = ({ title, items, onSelect, onBack, results, config, parentKey }: Props) => {

  // --- THIS FUNCTION IS NOW FULLY CORRECTED ---
 const isItemVerified = (itemKey: string): boolean => {
    // --- Submenu Item ---
    if (parentKey) {
        // Need to check the config of this specific method to see if it has a legacyKey
        // config[parentKey] is the category. config[parentKey].methods[itemKey] is the method config.
        const methodConfig = config[parentKey]?.methods?.[itemKey];
        const legacyKey = methodConfig?.legacyKey;

        const resultArray = results[itemKey];
        const hasNew = Array.isArray(resultArray) && resultArray.some(item => isVerificationSuccessful(item.data, itemKey));
        
        if (hasNew) return true;

        if (legacyKey) {
            const legacyArray = results[legacyKey];
            const hasOld = Array.isArray(legacyArray) && legacyArray.some(item => isVerificationSuccessful(item.data, legacyKey));
            if (hasOld) return true;
        }
        return false;
    }
    
    // --- Main Menu Item ---
    const categoryConfig = config[itemKey];
    if (!categoryConfig) return false;

    // Direct Method (e.g. Fetch History)
    if (categoryConfig.isDirect) {
      const methodKey = categoryConfig.method;
      const legacyKey = categoryConfig.legacyKey;

      const resultArray = results[methodKey];
      const hasNew = Array.isArray(resultArray) && resultArray.some(item => isVerificationSuccessful(item.data, methodKey));
      
      if (hasNew) return true;

      if (legacyKey) {
          const legacyArray = results[legacyKey];
          const hasOld = Array.isArray(legacyArray) && legacyArray.some(item => isVerificationSuccessful(item.data, legacyKey));
          if (hasOld) return true;
      }
      return false;
    } 
    
    // Category with Sub-methods (e.g. Fetch UAN -> Mobile/PAN)
    else {
      return Object.keys(categoryConfig.methods).some(methodKey => {
        const methodConfig = categoryConfig.methods[methodKey];
        const legacyKey = methodConfig.legacyKey;

        const resultArray = results[methodKey]; 
        const hasNew = Array.isArray(resultArray) && resultArray.some(item => isVerificationSuccessful(item.data, methodKey));
        
        if (hasNew) return true;

        if (legacyKey) {
             const legacyArray = results[legacyKey];
             const hasOld = Array.isArray(legacyArray) && legacyArray.some(item => isVerificationSuccessful(item.data, legacyKey));
             if (hasOld) return true;
        }
        return false;
      });
    }
  };
  return (
    <div>
      <div className="flex items-center mb-6">
        {onBack && <Button variant="ghost" size="icon" onClick={onBack} className="mr-2 text-gray-500 hover:bg-gray-100"><ArrowLeft /></Button>}
        <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="space-y-3">
        {items.map(item => {
          // Special case to prevent "View All" from ever showing as verified
          const isViewAll = item.key === 'viewAll';
          const verified = isViewAll ? false : isItemVerified(item.key);
          const Icon = iconMap[item.key] || ChevronRight;

          return (
            <button
              key={item.key}
              onClick={() => onSelect(item.key)}
              className="group w-full text-left p-4 bg-white border border-gray-200 rounded-lg flex justify-between items-center hover:bg-indigo-50 hover:border-indigo-300 hover:shadow-sm transition-all duration-200"
            >
              <div className="flex items-center">
                <Icon className="h-5 w-5 mr-4 text-purple-500" />
                <span className="font-medium text-gray-700">{item.label}</span>
              </div>
              {verified ? (
                <div className="flex items-center gap-2 text-green-600">
                  <span className="text-sm font-semibold">View Result</span>
                  <CheckCircle size={16} />
                </div>
              ) : (
                <ChevronRight className="text-gray-400 group-hover:translate-x-1 transition-transform" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};