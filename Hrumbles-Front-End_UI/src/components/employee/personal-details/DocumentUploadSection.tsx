
import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Document } from "@/services/types/employee.types";
import { uploadDocument } from "@/utils/uploadDocument";
import { validateDocument, getValidationType } from "./utils/documentUtils";
import { DocumentUploadPair } from "./components/DocumentUploadPair";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

interface DocumentUploadSectionProps {
  form: UseFormReturn<any>;
  documents: Document[];
  onDocumentsChange: (documents: Document[]) => void;
}

export const DocumentUploadSection: React.FC<DocumentUploadSectionProps> = ({
  form,
  documents,
  onDocumentsChange,
}) => {
  const handleFileUpload = (documentType: Document['documentType']) => async (file: File) => {
    try {
      const url = await uploadDocument(file, 'employee-documents', documentType);
      const updatedDocuments = [...documents];
      const existingIndex = documents.findIndex(doc => doc.documentType === documentType);
      
      const newDocument = {
        documentType,
        documentNumber: documents.find(doc => doc.documentType === documentType)?.documentNumber || '',
        documentUrl: url,
        fileName: file.name
      };

      if (existingIndex >= 0) {
        updatedDocuments[existingIndex] = newDocument;
      } else {
        updatedDocuments.push(newDocument);
      }
      
      onDocumentsChange(updatedDocuments);
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Error uploading document. Please try again.', {
        duration: 2000,
        icon: <AlertCircle className="h-4 w-4" />
      });
    }
  };

  const handleDocumentDelete = async (documentType: Document['documentType']) => {
    try {
      // Remove the document from the documents array
      const updatedDocuments = documents.filter(doc => doc.documentType !== documentType);
      onDocumentsChange(updatedDocuments);
      
      // Clear the document number from the form state
      const formField = `${documentType}Number`;
      form.setValue(formField, '');
      
      // Clear any other form fields related to this document
      form.setValue(`${documentType}Url`, '');
      form.setValue(`${documentType}FileName`, '');
      
      // Reset the form field validation state
      form.clearErrors(formField);
      
      // Clear the document from the parent component's state
      const existingDoc = documents.find(doc => doc.documentType === documentType);
      if (existingDoc) {
        existingDoc.documentUrl = '';
        existingDoc.documentNumber = '';
        existingDoc.fileName = '';
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error deleting document:', error);
      return Promise.reject(error);
    }
  };

  const updateDocumentNumber = (documentType: Document['documentType'], value: string) => {
    const validationType = getValidationType(documentType);
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

    // Validate after state update to not block input
    validateDocument(validationType, value);
  };

  return (
    <div>
      <div className="text-[rgba(48,64,159,1)] font-bold mb-4">Document Upload</div>
      <div className="text-[rgba(80,80,80,1)] text-xs mb-4">
        Upload your identity and verification documents here.
      </div>

      <div className="space-y-4">
        <DocumentUploadPair
          form={form}
          documentType="aadhar"
          documents={documents}
          label="Aadhar Number"
          required
          updateDocumentNumber={updateDocumentNumber}
          onUpload={handleFileUpload('aadhar')}
          onDelete={handleDocumentDelete}
        />

        <DocumentUploadPair
          form={form}
          documentType="pan"
          documents={documents}
          label="PAN Number"
          required
          updateDocumentNumber={updateDocumentNumber}
          onUpload={handleFileUpload('pan')}
          onDelete={handleDocumentDelete}
        />

        <DocumentUploadPair
          form={form}
          documentType="uan"
          documents={documents}
          label="UAN Number"
          updateDocumentNumber={updateDocumentNumber}
          onUpload={handleFileUpload('uan')}
          onDelete={handleDocumentDelete}
        />

        <DocumentUploadPair
          form={form}
          documentType="esic"
          documents={documents}
          label="ESIC Number"
          updateDocumentNumber={updateDocumentNumber}
          onUpload={handleFileUpload('esic')}
          onDelete={handleDocumentDelete}
        />
      </div>
    </div>
  );
};
