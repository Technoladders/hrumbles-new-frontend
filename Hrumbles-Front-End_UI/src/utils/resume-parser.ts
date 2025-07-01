import { CandidateFormData } from "@/components/jobs/job/candidate/AddCandidateDrawer";

import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";


pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.7.349/pdf.worker.min.js`;

// Utility function to normalize text
const normalizeText = (text: string): string => {
  return text
    .replace(/\s+/g, " ")
    .replace(/\n+/g, " ")
    .trim()
    .toLowerCase();
};

// Regex patterns for extracting fields
const patterns = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  phone: /\+?\d{1,4}[-.\s]?\d{10,12}/,
  name: /(?:name\s*:?\s*|personal\s*details\s*:?\s*)?([a-zA-Z]+)\s+([a-zA-Z]+)/i,
  location: /(?:location|city|address)\s*:?\s*([a-zA-Z\s,]+)/i,
  experience: /(?:experience|work\s*history|professional\s*experience)\s*:?\s*(\d+\.?\d*)\s*(?:years?|yrs?)/i,
  skills: /(?:skills|technical\s*skills|expertise)\s*:?\s*([a-zA-Z\s,;-]+)/i,
  linkedin: /(?:linkedin|profile)\s*:?\s*(https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+)/i,
  noticePeriod: /(?:notice\s*period)\s*:?\s*(\d+\s*(?:days?|weeks?)|immediate)/i,
};

// Function to parse PDF files
const parsePDFFile = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
      fullText += pageText + " ";
    }

    return normalizeText(fullText);
  } catch (error) {
    console.error("Error parsing PDF:", error);
    throw new Error("Failed to parse PDF resume. Please ensure the file is valid or fill the form manually.");
  }
};

// Function to parse Word files
const parseWordFile = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return normalizeText(result.value);
  } catch (error) {
    console.error("Error parsing Word document:", error);
    throw new Error("Failed to parse Word resume. Please ensure the file is valid or fill the form manually.");
  }
};

// Main parsing function
export const parseResume = async (file: File): Promise<Partial<CandidateFormData>> => {
  try {
    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "doc", "docx"].includes(fileExtension || "")) {
      throw new Error("Unsupported file format. Only PDF and Word (.doc, .docx) are allowed.");
    }

    // Extract text based on file type
    const text = fileExtension === "pdf" ? await parsePDFFile(file) : await parseWordFile(file);

    // Log extracted text for debugging
    console.log("Extracted resume text:", text);

    // Initialize result object
    const parsedData: Partial<CandidateFormData> = {};

    // Extract name
    const nameMatch = text.match(patterns.name);
    if (nameMatch) {
      parsedData.firstName = nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1);
      parsedData.lastName = nameMatch[2].charAt(0).toUpperCase() + nameMatch[2].slice(1);
    }

    // Extract email
    const emailMatch = text.match(patterns.email);
    if (emailMatch) {
      parsedData.email = emailMatch[0];
    }

    // Extract phone
    const phoneMatch = text.match(patterns.phone);
    if (phoneMatch) {
      parsedData.phone = phoneMatch[0].replace(/[-.\s]/g, "");
    }

    // Extract current location
    const locationMatch = text.match(patterns.location);
    if (locationMatch) {
      const location = locationMatch[1].trim().split(",")[0]; // Take first part (e.g., city)
      parsedData.currentLocation = location.charAt(0).toUpperCase() + location.slice(1);
      parsedData.preferredLocations = [parsedData.currentLocation]; // Default to current location
    }

    // Extract total experience
    const experienceMatch = text.match(patterns.experience);
    if (experienceMatch) {
      const years = parseFloat(experienceMatch[1]);
      parsedData.totalExperience = Math.floor(years);
      parsedData.totalExperienceMonths = Math.round((years % 1) * 12);
      // Assume relevant experience is same as total for simplicity
      parsedData.relevantExperience = parsedData.totalExperience;
      parsedData.relevantExperienceMonths = parsedData.totalExperienceMonths;
    }

    // Extract skills
    const skillsMatch = text.match(patterns.skills);
    if (skillsMatch) {
      const skillsList = skillsMatch[1]
        .split(/[,;-]/)
        .map(skill => skill.trim())
        .filter(skill => skill.length > 0)
        .map(skill => ({
          name: skill.charAt(0).toUpperCase() + skill.slice(1),
          rating: 0, // Ratings not available from resume
          experienceYears: 0,
          experienceMonths: 0,
        }));
      parsedData.skills = skillsList;
    }

    // Extract LinkedIn URL
    const linkedinMatch = text.match(patterns.linkedin);
    if (linkedinMatch) {
      parsedData.linkedInId = linkedinMatch[1];
    }

    // Extract notice period
    const noticePeriodMatch = text.match(patterns.noticePeriod);
    if (noticePeriodMatch) {
      parsedData.noticePeriod = noticePeriodMatch[1].includes("immediate")
        ? "Immediate"
        : noticePeriodMatch[1];
    }

    // Optional fields not typically found in resumes
    parsedData.currentSalary = undefined;
    parsedData.expectedSalary = undefined;
    parsedData.lastWorkingDay = undefined;
    parsedData.hasOffers = undefined;
    parsedData.offerDetails = undefined;
    parsedData.uan = undefined;
    parsedData.pan = undefined;
    parsedData.pf = undefined;
    parsedData.esicNumber = undefined;

    return parsedData;
  } catch (error: any) {
    console.error("Error parsing resume:", error);
    throw new Error(error.message || "Failed to parse resume. Please fill the form manually.");
  }
};