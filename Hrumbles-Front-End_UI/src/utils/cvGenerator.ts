import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  Header,
} from "docx";
import { jsPDF } from "jspdf";
import { saveAs } from "file-saver";

// Define a type for the candidate data for type-safety
type Candidate = {
  candidate_name?: string;
  suggested_title?: string;
  professional_summary?: string;
  certifications?: string[];
  education?: { year?: string | number; degree: string; institution?: string | null }[];
  top_skills?: string[];
  work_experience?: {
    company: string;
    duration: string;
    designation: string;
    responsibilities: string[];
  }[];
};

// --- SECTION STYLES ---
const sectionTitle = (text: string) => new Paragraph({
  children: [new TextRun({ text: text.toUpperCase() + ":", bold: true, size: 22 })],
  spacing: { before: 100, after: 50 },
});

const bulletPoint = (text: string) => new Paragraph({
  children: [new TextRun({ text: "• " + text, break: 1 })],
  spacing: { before: 50, after: 50 },
  indent: { left: 360, hanging: 360 },
});

// --- CV GENERATION LOGIC ---

export const generateDocx = async (candidate: Candidate) => {
  const summaryPoints = JSON.parse(candidate.professional_summary || '[]');

  const doc = new Document({
    sections: [
      {
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [new TextRun({ text: (candidate.candidate_name || "Unnamed Candidate").toUpperCase(), bold: true, size: 24 })],
                alignment: AlignmentType.RIGHT,
                spacing: { after: 50 },
              }),
              new Paragraph({
                children: [new TextRun({ text: (candidate.suggested_title || "Professional").toUpperCase(), bold: true, size: 20 })],
                alignment: AlignmentType.RIGHT,
                spacing: { after: 100 },
              }),
            ],
          }),
        },
        children: [
          // --- Professional Summary ---
          sectionTitle("Professional Summary"),
          ...summaryPoints.map((point: string) => bulletPoint(point)),

          // --- Certifications ---
          ...(candidate.certifications && candidate.certifications.length > 0 ? [
            sectionTitle("Certifications"),
            ...candidate.certifications.map(cert => bulletPoint(cert)),
          ] : []),

          // --- Education ---
          ...(candidate.education && candidate.education.length > 0 ? [
            sectionTitle("Education"),
            ...candidate.education.map(edu => bulletPoint(`${edu.degree}${edu.institution ? ` from ${edu.institution}` : ''}${edu.year ? `, ${edu.year}` : ''}`)),
          ] : []),

          // --- Technical Expertise (using top_skills as bullets) ---
          ...(candidate.top_skills && candidate.top_skills.length > 0 ? [
            sectionTitle("Technical Expertise"),
            ...candidate.top_skills.map(skill => bulletPoint(skill)),
          ] : []),

          // --- Professional Experience ---
          ...(candidate.work_experience && candidate.work_experience.length > 0 ? [
            sectionTitle("Professional Experience"),
            ...candidate.work_experience.flatMap((exp) => [
              new Paragraph({
                children: [new TextRun({ text: "Duration: " + exp.duration, bold: true, size: 20 })],
                spacing: { after: 50 },
              }),
              new Paragraph({
                children: [new TextRun({ text: "Company: " + exp.company, bold: true, size: 20 })],
                spacing: { after: 50 },
              }),
              new Paragraph({
                children: [new TextRun({ text: "Role: " + (exp.designation || 'N/A'), bold: true, size: 20 })],
                spacing: { after: 50 },
              }),
              new Paragraph({
                children: [new TextRun({ text: "Responsibilities:", bold: true, size: 20 })],
                spacing: { after: 50 },
              }),
              ...exp.responsibilities.map(resp => bulletPoint(resp)),
            ]),
          ] : []),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const fileName = `${(candidate.candidate_name || "candidate").replace(/\s+/g, '_')}_CV.docx`;
  saveAs(blob, fileName);
};

export const generatePdf = (candidate: Candidate) => {
  const doc = new jsPDF();
  const margin = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // --- Best Practice: Define font sizes and line heights for easy changes ---
  const FONT_SIZE_BODY = 10;
  const LINE_HEIGHT_MULTIPLIER = 1.25;
  const BODY_LINE_HEIGHT = 6; // This will be 12.5

  const summaryPoints = JSON.parse(candidate.professional_summary || '[]');

  const addHeader = () => {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text((candidate.candidate_name || "Unnamed Candidate").toUpperCase(), pageWidth - margin, y, { align: "right" });
    y += 6;

    doc.setFontSize(12);
    doc.text((candidate.suggested_title || "Professional").toUpperCase(), pageWidth - margin, y, { align: "right" });
    y += 10;

    // FIX from previous issue: Reset font state for body content
    doc.setFontSize(FONT_SIZE_BODY);
    doc.setFont("helvetica", "normal");
  };

  const addPageIfNeeded = (extraSpace = 0) => {
    if (y + extraSpace > 275) {
      doc.addPage();
      y = 20;
      addHeader();
    }
  };

  // --- Section Helper ---
  const addSection = (title: string, content: () => void) => {
    addPageIfNeeded(5);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(title.toUpperCase() + ":", margin, y);

    // --- CHANGE 1: Increased space after section heading from 5 to 8 ---
    y += 5;

    doc.setFontSize(FONT_SIZE_BODY);
    doc.setFont("helvetica", "normal");
    content();
    y += 5; // Spacer after section
  };

  const addBulletList = (items: string[]) => {
    items.forEach(item => {
      addPageIfNeeded(BODY_LINE_HEIGHT);
      const lines = doc.splitTextToSize(item, pageWidth - margin * 2 - 5);
      doc.text("• ", margin, y);
      doc.text(lines, margin + 5, y);
      
      // --- CHANGE 2: Line height is now 1.25 * font size (10 * 1.25 = 12.5) ---
      y += lines.length * BODY_LINE_HEIGHT;
    });
  };

  const addSubSectionText = (label: string, value: string, isBoldLabel = false) => {
    addPageIfNeeded(BODY_LINE_HEIGHT);
    doc.setFont("helvetica", isBoldLabel ? "bold" : "normal");
    doc.text(label, margin, y);
    doc.setFont("helvetica", "normal");
    if (value) {
      doc.text(value, margin + (label.length * 2.5), y);
    }
    y += BODY_LINE_HEIGHT; // Use consistent line height
  };

  // Initial header
  addHeader();

  // --- Create Sections ---
  if (summaryPoints.length > 0) {
    addSection("Professional Summary", () => addBulletList(summaryPoints));
  }

  if (candidate.certifications && candidate.certifications.length > 0) {
    addSection("Certifications", () => addBulletList(candidate.certifications));
  }

  if (candidate.education && candidate.education.length > 0) {
    addSection("Education", () => {
      const eduItems = candidate.education!.map(edu => `${edu.degree}${edu.institution ? ` from ${edu.institution}` : ''}${edu.year ? `, ${edu.year}` : ''}`);
      addBulletList(eduItems);
    });
  }

  if (candidate.top_skills && candidate.top_skills.length > 0) {
    addSection("Technical Expertise", () => addBulletList(candidate.top_skills));
  }

  if (candidate.work_experience && candidate.work_experience.length > 0) {
    addSection("Professional Experience", () => {
      candidate.work_experience.forEach(exp => {
        addPageIfNeeded(10);
        addSubSectionText("Duration: ", exp.duration, true);
        addSubSectionText("Company: ", exp.company, true);
        addSubSectionText("Role: ", exp.designation || 'N/A', true);
        y += 3;
        addSubSectionText("Responsibilities: ", "", true);
        y+= 4; // Small space before bullets start
        addBulletList(exp.responsibilities);
        y += 3;
      });
    });
  }

  const fileName = `${(candidate.candidate_name || "candidate").replace(/\s+/g, '_')}_CV.pdf`;
  doc.save(fileName);
};