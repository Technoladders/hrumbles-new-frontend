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
    // This is a sub-menu item (e.g., 'mobile_to_uan')
    if (parentKey) {
      const resultArray = results[itemKey]; // This is now an array
      // Check if the array exists and if ANY item in it is successful
      return Array.isArray(resultArray) && resultArray.some(item => isVerificationSuccessful(item.data, itemKey));
    }
    
    const categoryConfig = config[itemKey];
    // This is for special, non-verification items like "View All Results"
    if (!categoryConfig) return false;

    // This is a main menu category item that has a direct method
    if (categoryConfig.isDirect) {
      const resultArray = results[categoryConfig.method]; // This is now an array
      // Check if the array exists and if ANY item in it is successful
      return Array.isArray(resultArray) && resultArray.some(item => isVerificationSuccessful(item.data, categoryConfig.method));
    } 
    // This is a main menu category item that has sub-methods (e.g., 'Fetch UAN')
    else {
      // Check if ANY sub-method under this category has ANY successful verification
      return Object.keys(categoryConfig.methods).some(methodKey => {
        const resultArray = results[methodKey]; // This is now an array
        return Array.isArray(resultArray) && resultArray.some(item => isVerificationSuccessful(item.data, methodKey));
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