import * as z from "zod";

// Skills array validation
const skillSchema = z.string().min(1, "Skill cannot be empty");

// Experience validation schema
export const experienceSchema = z.object({
  title: z.string().min(1, "Job title is required"),
  company: z.string().min(1, "Company name is required"),
  location: z.string().optional(),
  description: z.string().optional(),
  fromDate: z.string().min(1, "Start date is required"),
  toDate: z.string().optional(),
  currentlyWorking: z.boolean().default(false),
  skills: z.array(skillSchema).optional().default([]),
});

// Education validation schema
export const educationSchema = z.object({
  institute: z.string().min(1, "Institute name is required"),
  degree: z.string().min(1, "Degree is required"),
  percentage: z.string().optional(),
  fromDate: z.string().min(1, "Start date is required"),
  toDate: z.string().optional(),
});

// Personal info validation schema
export const personalInfoSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  location: z.string().min(1, "Location is required"),
  linkedin: z.string().optional(),
  github: z.string().optional(),
  availability: z.string().min(1, "Availability is required"),
});

// Full application form validation schema - we're keeping these for type safety
// but we won't use them for validation in our empty form
export const applicationFormSchema = z.object({
  personalInfo: personalInfoSchema,
  experiences: z.array(experienceSchema),
  education: z.array(educationSchema),
  resume: z.instanceof(File).optional().nullable(),
  coverLetter: z.string().optional(),
});

// Resume file validation
export const isValidResumeFile = (file: File | null): boolean => {
  if (!file) return true; // Resume is no longer required
  
  const validTypes = [
    'application/pdf',
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
  ];
  
  return validTypes.includes(file.type);
};
