
import React from "react";
import { Button } from "@/components/ui/button";
import { FileText, Eye, Download } from "lucide-react";

interface Document {
  name: string;
  url: string;
  type: string;
}

interface DocumentListProps {
  documents: Document[];
  onView: (document: Document) => void;
  onDownload: (document: Document) => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  onView,
  onDownload,
}) => {
  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <div key={doc.type} className="flex items-center gap-2 text-sm text-gray-600 p-2 hover:bg-gray-50 rounded-lg">
          <FileText className="h-4 w-4" />
          <span>{doc.name}</span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-600 hover:text-gray-900"
              onClick={() => onView(doc)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-600 hover:text-gray-900"
              onClick={() => onDownload(doc)}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
