
import React from "react";
import { Button } from "@/components/ui/button";
import { DocumentList } from "./DocumentList";
import { Pencil } from "lucide-react";

interface Document {
  name: string;
  url: string;
  type: string;
}

interface EducationViewProps {
  documents: Document[];
  onEdit: () => void;
  onViewDocument: (document: Document) => void;
  onDownloadDocument: (document: Document) => void;
}

export const EducationView: React.FC<EducationViewProps> = ({
  documents,
  onEdit,
  onViewDocument,
  onDownloadDocument,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Documents</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="h-6 w-6 text-gray-500 hover:text-gray-700"
        >
          <Pencil className="h-3 w-3" />
        </Button>
      </div>
      <DocumentList
        documents={documents}
        onView={onViewDocument}
        onDownload={onDownloadDocument}
      />
    </div>
  );
};
