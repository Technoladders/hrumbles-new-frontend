// src/pages/jobs/ai/VerificationMenuList.tsx

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ArrowLeft, User, History, BookOpen, Building, ShieldCheck, CheckCircle } from 'lucide-react';
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
};

interface Props {
  title: string;
  items: { key: string; label: string }[];
  onSelect: (key: string) => void;
  onBack?: () => void;
  // --- NEW PROPS to make the component aware of results ---
  results: BGVState['results'];
  config: any;
  parentKey?: string; // The key of the parent category for sub-menus
}

export const VerificationMenuList = ({ title, items, onSelect, onBack, results, config, parentKey }: Props) => {

  const isItemVerified = (itemKey: string): boolean => {
    // This is a sub-menu item (e.g., 'mobile_to_uan')
    if (parentKey) {
      const result = results[itemKey];
      return result && isVerificationSuccessful(result.data, itemKey);
    }
    
    // This is a main menu category item (e.g., 'fetchUan')
    const categoryConfig = config[itemKey];
    if (categoryConfig.isDirect) {
      const result = results[categoryConfig.method];
      return result && isVerificationSuccessful(result.data, categoryConfig.method);
    } else {
      // Check if ANY sub-method under this category is verified
      return Object.keys(categoryConfig.methods).some(methodKey => {
        const result = results[methodKey];
        return result && isVerificationSuccessful(result.data, methodKey);
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
          const Icon = iconMap[item.key] || ChevronRight;
          const verified = isItemVerified(item.key);
          return (
            <button
              key={item.key}
              onClick={() => onSelect(item.key)}
              className="group w-full text-left p-4 bg-white border border-gray-200 rounded-lg flex justify-between items-center hover:bg-indigo-50 hover:border-indigo-300 hover:shadow-sm transition-all duration-200"
            >
              <div className="flex items-center">
                <Icon className={`h-5 w-5 mr-4 ${verified ? 'text-green-500' : 'text-indigo-600'}`} />
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
// 