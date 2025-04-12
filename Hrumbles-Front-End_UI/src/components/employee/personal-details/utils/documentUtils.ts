
import { Document } from "@/services/types/employee.types";
import { documentSchema } from "../documentValidation";

export const validateDocument = (type: keyof typeof documentSchema.shape, value: string) => {
  try {
    const validationType = {
      [type]: true
    };
    const validationObject = { [type]: value };
    const validationSchema = documentSchema.pick(validationType as any);
    validationSchema.parse(validationObject);
    return true;
  } catch (error) {
    if (error instanceof Error) {
      return false;
    }
    return false;
  }
};

export const getErrorMessage = (type: keyof typeof documentSchema.shape, value: string) => {
  const messages = {
    aadharNumber: "! Aadhar is invalid, enter 12 digit number",
    panNumber: "! PAN is invalid, enter like AABBC1234K",
    esicNumber: "! ESIC is invalid, enter 17 digit number",
    uanNumber: "! UAN is invalid, enter 12 digit number starting with 10"
  };

  if (!validateDocument(type, value)) {
    return messages[type];
  }
  return null;
};

export const getDocumentByType = (documents: Document[], type: Document['documentType']) => 
  documents.find(doc => doc.documentType === type);

export const getValidationType = (documentType: Document['documentType']): keyof typeof documentSchema.shape => {
  const types = {
    'aadhar': 'aadharNumber',
    'pan': 'panNumber',
    'uan': 'uanNumber',
    'esic': 'esicNumber'
  } as const;
  
  return types[documentType] as keyof typeof documentSchema.shape;
};
