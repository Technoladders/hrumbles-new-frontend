import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  Header,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from "docx";
import { jsPDF } from "jspdf";
import { saveAs } from "file-saver";

// Define a type for the candidate data for type-safety
type Candidate = {
  candidate_name?: string;
  suggested_title?: string;
  email?: string; // ADD THIS
  phone?: string; // ADD THIS
  professional_summary?: string;
  certifications?: string[];
  education?: { year?: string | number; degree: string; institution?: string | null }[];
  top_skills?: string[];
  work_experience?: {
    company: string;
    duration: string;
    designation:string;
    responsibilities: string[];
  }[];
};

// --- Define document-wide styles ---
const FONT_FAMILY = "Calibri";

// --- SECTION STYLES ---
const sectionTitle = (text: string) => new Paragraph({
  children: [
    new TextRun({
      text: text.toUpperCase() + ":",
      bold: true,
      size: 24, // 12pt font
      font: FONT_FAMILY,
    }),
  ],
  spacing: { before: 200, after: 100 },
});

const bulletPoint = (text: string) => new Paragraph({
  bullet: { level: 0 }, // Use native DOCX bullets
  children: [
    new TextRun({
      text: text,
      size: 20, // 10pt font
      font: FONT_FAMILY,
    }),
  ],
  spacing: { before: 100, after: 100 },
});

// --- CV GENERATION LOGIC ---

export const generateDocx = async (candidate: Candidate) => {
  const summaryPoints = JSON.parse(candidate.professional_summary || '[]');
  const contactInfo = [candidate.email, candidate.phone].filter(Boolean).join(" | ");

  // --- Build the document sections dynamically ---
  const children = [
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
  ];

  // --- MODIFICATION: Technical Expertise with conditional two-column layout ---
  const skills = candidate.top_skills || [];
  if (skills.length > 0) {
    children.push(sectionTitle("Technical Expertise"));

    if (skills.length > 5) {
      const midpoint = Math.ceil(skills.length / 2);
      const table = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: { top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } },
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: skills.slice(0, midpoint).map(skill => bulletPoint(skill)), width: { size: 50, type: WidthType.PERCENTAGE } }),
              new TableCell({ children: skills.slice(midpoint).map(skill => bulletPoint(skill)), width: { size: 50, type: WidthType.PERCENTAGE } }),
            ],
          }),
        ],
      });
      children.push(table);
    } else {
      children.push(...skills.map(skill => bulletPoint(skill)));
    }
  }

  // --- MODIFICATION: Professional Experience with correct styling ---
  if (candidate.work_experience && candidate.work_experience.length > 0) {
    children.push(sectionTitle("Professional Experience"));
    candidate.work_experience.forEach((exp) => {
      children.push(
        new Paragraph({ children: [new TextRun({ text: `Duration:\t${exp.duration}`, bold: true, size: 20, font: FONT_FAMILY })], spacing: { after: 50 } }),
        new Paragraph({ children: [new TextRun({ text: `Company:\t${exp.company}`, bold: true, size: 20, font: FONT_FAMILY })], spacing: { after: 50 } }),
        new Paragraph({ children: [new TextRun({ text: `Role:\t\t${exp.designation || 'N/A'}`, bold: true, size: 20, font: FONT_FAMILY })], spacing: { after: 50 } }),
        new Paragraph({ children: [new TextRun({ text: "Responsibilities:", bold: true, size: 20, font: FONT_FAMILY })], spacing: { before: 100, after: 50 } }),
        ...exp.responsibilities.map(resp => bulletPoint(resp)) // FIX: This now uses the non-bold bulletPoint style
      );
    });
  }

  const doc = new Document({
    sections: [
      {
        // --- MODIFICATION: New Header (Left-aligned with contact info) ---
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [new TextRun({ text: (candidate.candidate_name || "Unnamed Candidate").toUpperCase(), bold: true, size: 32, font: FONT_FAMILY })],
                alignment: AlignmentType.LEFT,
              }),
              new Paragraph({
                children: [new TextRun({ text: (candidate.suggested_title || "Professional").toUpperCase(), bold: true, size: 24, font: FONT_FAMILY })],
                alignment: AlignmentType.LEFT,
                spacing: { after: 50 },
              }),
              new Paragraph({
                children: [new TextRun({ text: contactInfo, size: 20, font: FONT_FAMILY })],
                alignment: AlignmentType.LEFT,
                spacing: { after: 100 },
              }),
            ],
          }),
        },
        children: children, // Use the dynamically built children array
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

  // --- Best Practice: Define styles for easy changes ---
  const FONT_FAMILY = "helvetica"; // Use standard fonts: helvetica, times, courier
  const FONT_SIZE_BODY = 10;
  const LINE_HEIGHT_MULTIPLIER = 1.25;
  const BODY_LINE_HEIGHT = 6; // Correctly calculated

  const summaryPoints = JSON.parse(candidate.professional_summary || '[]');

  const addHeader = () => {
    // --- CHANGE: Header moved to the left side ---
    doc.setFont(FONT_FAMILY, "bold");
    doc.setFontSize(16);
    doc.text((candidate.candidate_name || "Unnamed Candidate").toUpperCase(), margin, y);
    y += 7;

    doc.setFontSize(12);
    doc.text((candidate.suggested_title || "Professional").toUpperCase(), margin, y);
    y += 5;

    // --- CHANGE: Added contact information ---
    doc.setFont(FONT_FAMILY, "normal");
    doc.setFontSize(FONT_SIZE_BODY);
    const contactInfo = [candidate.email, candidate.phone].filter(Boolean).join(" | ");
    if (contactInfo) {
      doc.text(contactInfo, margin, y);
      y += 10;
    }

    // Reset font state for body content
    doc.setFontSize(FONT_SIZE_BODY);
    doc.setFont(FONT_FAMILY, "normal");
  };

  const addPageIfNeeded = (extraSpace = 0) => {
    if (y + extraSpace > 280) { // Slightly increased page bottom margin
      doc.addPage();
      y = 20;
      // Note: We don't call addHeader() again on new pages to avoid repetition
      // but we do need to reset the font
      doc.setFontSize(FONT_SIZE_BODY);
      doc.setFont(FONT_FAMILY, "normal");
    }
  };

  const addSection = (title: string, content: () => void) => {
    addPageIfNeeded(20);
    doc.setFontSize(12);
    doc.setFont(FONT_FAMILY, "bold");
    doc.text(title.toUpperCase() + ":", margin, y);
    y += 8; // Space after heading

    doc.setFontSize(FONT_SIZE_BODY);
    doc.setFont(FONT_FAMILY, "normal");
    content();
    y += 5; // Spacer after section
  };
  
const addBulletList = (items: string[]) => {
    // --- Define indentation settings for clarity ---
    const bulletIndent = 5;
    const textBlockIndent = margin + bulletIndent;
    const textBlockWidth = pageWidth - textBlockIndent - margin;

    items.forEach(item => {
      const lines = doc.splitTextToSize(item, textBlockWidth);
      addPageIfNeeded(lines.length * BODY_LINE_HEIGHT);

      // --- Draw the bullet point once per item ---
      doc.text("•", margin, y);

      // --- Draw each line of text at the indented position ---
      // This ensures the first line and all wrapped lines are aligned.
      lines.forEach(line => {
        doc.text(line, textBlockIndent, y);
        y += BODY_LINE_HEIGHT; // Move y down for each line
      });
    });
  };

  // --- NEW: Function to render skills in two columns ---
  const addTwoColumnBulletList = (items: string[]) => {
    const midpoint = Math.ceil(items.length / 2);
    const columnWidth = (pageWidth - margin * 3) / 2; // Width for each column's text
    const col2x = margin + columnWidth + 15; // Starting x for the second column

    for (let i = 0; i < midpoint; i++) {
      // Left item
      const leftItem = "• " + items[i];
      const leftLines = doc.splitTextToSize(leftItem, columnWidth);
      
      // Right item (if it exists)
      const rightItemIndex = i + midpoint;
      let rightLines = [];
      if (rightItemIndex < items.length) {
        const rightItem = "• " + items[rightItemIndex];
        rightLines = doc.splitTextToSize(rightItem, columnWidth);
      }

      const maxLines = Math.max(leftLines.length, rightLines.length);
      addPageIfNeeded(maxLines * BODY_LINE_HEIGHT);
      
      // Render the text for both columns for the current row
      doc.text(leftLines, margin, y, { indent: 5 });
      if (rightLines.length > 0) {
        doc.text(rightLines, col2x, y, { indent: 5 });
      }

      y += maxLines * BODY_LINE_HEIGHT;
    }
  };

  const addSubSectionText = (label: string, value: string, isBoldLabel = false) => {
    addPageIfNeeded(BODY_LINE_HEIGHT);
    doc.setFont(FONT_FAMILY, isBoldLabel ? "bold" : "normal");
    doc.text(label, margin, y);
    doc.setFont(FONT_FAMILY, "normal");
    if (value) {
      doc.text(value, margin + (label.length * 2.5), y);
    }
    y += BODY_LINE_HEIGHT;
  };

  // --- CV Generation Starts Here ---

  addHeader();

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

  // --- CHANGE: Use two-column layout for skills if needed ---
  if (candidate.top_skills && candidate.top_skills.length > 0) {
    addSection("Technical Expertise", () => {
      if (candidate.top_skills!.length > 5) {
        addTwoColumnBulletList(candidate.top_skills!);
      } else {
        addBulletList(candidate.top_skills!);
      }
    });
  }

  if (candidate.work_experience && candidate.work_experience.length > 0) {
    addSection("Professional Experience", () => {
      candidate.work_experience!.forEach(exp => {
        addPageIfNeeded(30); // Reserve space for the experience block
        addSubSectionText("Duration: ", exp.duration, true);
        addSubSectionText("Company: ", exp.company, true);
        addSubSectionText("Role: ", exp.designation || 'N/A', true);
        y += 3;
        doc.setFont(FONT_FAMILY, "bold");
        doc.text("Responsibilities:", margin, y);
        y += BODY_LINE_HEIGHT;
         doc.setFont(FONT_FAMILY, "normal"); 
        addBulletList(exp.responsibilities);
        y += 3; // Space after an experience block
      });
    });
  }

  const fileName = `${(candidate.candidate_name || "candidate").replace(/\s+/g, '_')}_CV.pdf`;
  doc.save(fileName);
};