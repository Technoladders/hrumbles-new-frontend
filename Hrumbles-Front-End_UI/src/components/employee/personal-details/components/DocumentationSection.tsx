
import React from "react";
import { Document } from "@/services/types/employee.types";
import { DocumentPair } from "./DocumentPair";
import { uploadDocument } from "@/utils/uploadDocument";
import { toast } from "sonner";

interface DocumentationSectionProps {
  documents: Document[];
  onDocumentsChange: (documents: Document[]) => void;
}

export const DocumentationSection: React.FC<DocumentationSectionProps> = ({
  documents,
  onDocumentsChange,
}) => {
  const handleUpload = async (documentType: Document['documentType'], file: File) => {
    try {
      const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
      if (!allowedTypes.includes(file.type)) {
        console.error("Only JPG, PNG, and PDF files are allowed.");
        return;
      }
  
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        console.error("File size should be less than 5MB.");
        return;
      }
  
      // Upload file to Supabase (bucket: employee-documents)
      const documentUrl = await uploadDocument(file, "employee-documents", documentType);
  
      if (!documentUrl) {
        throw new Error("File upload failed.");
      }
  
      const updatedDocuments = [...documents];
      const existingIndex = documents.findIndex((doc) => doc.documentType === documentType);
  
      const newDocument = {
        documentType,
        documentNumber: documents.find((doc) => doc.documentType === documentType)?.documentNumber || '',
        documentUrl,
        fileName: file.name
      };
  
      if (existingIndex >= 0) {
        updatedDocuments[existingIndex] = newDocument;
      } else {
        updatedDocuments.push(newDocument);
      }
  
      onDocumentsChange(updatedDocuments);
      console.log("Document uploaded successfully:", documentUrl);
    } catch (error) {
      console.error("Error uploading document:", error);
    }
  };
  

  const handleDelete = async (documentType: Document['documentType']) => {
    const updatedDocuments = documents.filter(doc => doc.documentType !== documentType);
    onDocumentsChange(updatedDocuments);
  };

  const updateDocumentNumber = (documentType: Document['documentType'], value: string) => {
    const updatedDocuments = [...documents];
    const existingIndex = documents.findIndex(doc => doc.documentType === documentType);
    
    if (existingIndex >= 0) {
      updatedDocuments[existingIndex] = {
        ...updatedDocuments[existingIndex],
        documentNumber: value
      };
    } else {
      updatedDocuments.push({
        documentType,
        documentNumber: value,
        documentUrl: '',
      });
    }
    
    onDocumentsChange(updatedDocuments);
  };

  return (
    <div className="space-y-6">
      <div className="text-[rgba(48,64,159,1)] font-bold">Documentation</div>
      <div className="text-[rgba(80,80,80,1)] text-xs mb-4">
        Upload your identity and verification documents here.
      </div>

      <div className="space-y-6">
        <DocumentPair
          documentType="aadhar"
          documents={documents}
          label="Aadhar Number"
          required
          updateDocumentNumber={updateDocumentNumber}
          onUpload={handleUpload}
          onDelete={handleDelete}
          placeholder="Enter 12-digit Aadhar number"
          pattern="\d{12}"
        />

        <DocumentPair
          documentType="pan"
          documents={documents}
          label="PAN Number"
          required
          updateDocumentNumber={updateDocumentNumber}
          onUpload={handleUpload}
          onDelete={handleDelete}
          placeholder="Enter PAN number"
          pattern="[A-Z]{5}[0-9]{4}[A-Z]"
        />

        <DocumentPair
          documentType="uan"
          documents={documents}
          label="UAN Number"
          updateDocumentNumber={updateDocumentNumber}
          onUpload={handleUpload}
          onDelete={handleDelete}
          placeholder="Enter 12-digit UAN number (optional)"
          pattern="\d{12}"
        />

        <DocumentPair
          documentType="esic"
          documents={documents}
          label="ESIC Number"
          updateDocumentNumber={updateDocumentNumber}
          onUpload={handleUpload}
          onDelete={handleDelete}
          placeholder="Enter 17-digit ESIC number (optional)"
          pattern="\d{17}"
        />
      </div>
    </div>
  );
};
