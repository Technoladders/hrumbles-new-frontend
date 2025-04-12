
import React from "react";

interface Tab {
  id: string;
  label: string;
  isActive?: boolean;
}

interface TabNavigationProps {
  tabs: Tab[];
  onTabChange: (tabId: string) => void;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  onTabChange,
}) => {
  return (
    <div className="flex w-[573px] max-w-full items-stretch text-black flex-wrap">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`cursor-pointer ${
            tab.isActive
              ? "text-[rgba(221,1,1,1)] font-bold relative"
              : "text-black"
          }`}
        >
          <div className="gap-2.5 p-4">{tab.label}</div>
          {tab.isActive && (
            <div className="bg-[rgba(221,1,1,1)] border z-10 flex shrink-0 h-[3px] rounded-[8px_8px_0px_0px] border-[rgba(221,1,1,1)] border-solid" />
          )}
        </div>
      ))}
    </div>
  );
};
