
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";

interface InfoCardProps {
  title: string;
  icon: any;
  children: React.ReactNode;
  onEdit?: () => void;
  expandable?: boolean;
  headerAction?: React.ReactNode;
}

export const InfoCard: React.FC<InfoCardProps> = ({ 
  title, 
  icon: Icon, 
  children, 
  onEdit,
  expandable = false,
  headerAction
}) => {
  return (
    <Card className={`
      p-4 
      bg-white/80 
      backdrop-blur-sm 
      hover:shadow-lg 
      transition-all 
      duration-300 
      transform 
      hover:-translate-y-1 
      relative 
      group
      border border-gray-100
      before:absolute 
      before:inset-0 
      before:z-0 
      before:bg-gradient-to-r 
      before:from-white/50 
      before:to-transparent 
      before:opacity-0 
      before:transition-opacity 
      hover:before:opacity-100
    `}>
      <div className="relative z-10">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-brand-primary" />
            <h3 className="text-sm font-medium">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            {headerAction}
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
                className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100/50"
              >
                <Edit className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
        <div className="text-sm">{children}</div>
      </div>
    </Card>
  );
};
