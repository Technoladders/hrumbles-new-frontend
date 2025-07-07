
import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Users, UserCheck, UserX, X } from "lucide-react";

interface BulkActionsBarProps {
  selectedCount: number;
  onActivate: () => void;
  onDeactivate: () => void;
  onClear: () => void;
}

const BulkActionsBar = ({ selectedCount, onActivate, onDeactivate, onClear }: BulkActionsBarProps) => {
  return (
    <Card className="p-3 mb-4 bg-blue-50 border-blue-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {selectedCount} selected
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onActivate}
              className="text-green-600 border-green-200 hover:bg-green-50"
            >
              <UserCheck className="h-4 w-4 mr-1" />
              Activate
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={onDeactivate}
              className="text-orange-600 border-orange-200 hover:bg-orange-50"
            >
              <UserX className="h-4 w-4 mr-1" />
              Deactivate
            </Button>
          </div>
        </div>
        
        <Button
          size="sm"
          variant="ghost"
          onClick={onClear}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};

export default BulkActionsBar;
