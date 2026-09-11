import { jsPDF } from 'jspdf';
import { Question } from './types';

/**
 * jsPDF's default fonts (Helvetica, Courier) cannot render Devanagari or
 * extended Unicode glyphs. This helper strips/transliterates non-ASCII
 * characters so the PDF remains readable instead of showing garbled boxes.
 * For full Hindi rendering a custom .ttf font would need to be embedded,
 * but this graceful fallback keeps the content usable.
 */
function safeText(text: string): string {
  // Common Devanagari → Roman transliterations for readability
  const devanagariMap: Record<string, string> = {
    '\u0915': 'k', '\u0916': 'kh', '\u0917': 'g', '\u0918': 'gh', '\u0919': 'ng',
    '\u091A': 'ch', '\u091B': 'chh', '\u091C': 'j', '\u091D': 'jh', '\u091E': 'ny',
    '\u091F': 't', '\u0920': 'th', '\u0921': 'd', '\u0922': 'dh', '\u0923': 'n',
    '\u0924': 't', '\u0925': 'th', '\u0926': 'd', '\u0927': 'dh', '\u0928': 'n',
    '\u092A': 'p', '\u092B': 'ph', '\u092C': 'b', '\u092D': 'bh', '\u092E': 'm',
    '\u092F': 'y', '\u0930': 'r', '\u0932': 'l', '\u0935': 'v', '\u0936': 'sh',
    '\u0937': 'sh', '\u0938': 's', '\u0939': 'h',
    '\u0905': 'a', '\u0906': 'aa', '\u0907': 'i', '\u0908': 'ee', '\u0909': 'u',
    '\u090A': 'oo', '\u090F': 'e', '\u0910': 'ai', '\u0913': 'o', '\u0914': 'au',
    '\u093E': 'aa', '\u093F': 'i', '\u0940': 'ee', '\u0941': 'u', '\u0942': 'oo',
    '\u0947': 'e', '\u0948': 'ai', '\u094B': 'o', '\u094C': 'au',
    '\u094D': '', '\u0902': 'n', '\u0903': 'h', '\u0901': 'n',
    '\u0964': '.', '\u0965': '.',
  };

  let result = '';
  for (const char of text) {
    if (devanagariMap[char] !== undefined) {
      result += devanagariMap[char];
    } else if (char.charCodeAt(0) > 127) {
      // Skip other non-ASCII characters that can't be rendered
      result += '?';
    } else {
      result += char;
    }
  }
  return result;
}

export function generateQuestionsPDF(
  topic: string,
  questions: Question[],
  includeAnswers: boolean = false
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const addHeader = (pageNum: number) => {
    // Header banner
    doc.setFillColor(24, 27, 38); // surface-50
    doc.rect(0, 0, pageWidth, 12, 'F');
    doc.setTextColor(200, 210, 255);
    doc.setFontSize(8);
    doc.text('AI QUESTION GENERATOR • 50 PROGRESSIVE QUESTIONS', margin, 8);
    doc.text(`Page ${pageNum}`, pageWidth - margin, 8, { align: 'right' });
  };

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 15) {
      doc.addPage();
      const pageNum = doc.getNumberOfPages();
      addHeader(pageNum);
      y = 20;
    }
  };

  // Title Page Banner
  addHeader(1);
  y = 22;

  // Title
  doc.setTextColor(20, 24, 39);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(safeText(topic), margin, y);
  y += 8;

  // Subtitle / metadata
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  const dateStr = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  doc.text(`Generated on: ${dateStr} • 50 Curated Questions • ${includeAnswers ? 'Questions + Answers' : 'Question Bank Only'}`, margin, y);
  y += 6;

  // Difficulty Distribution Summary Box
  doc.setFillColor(243, 244, 246);
  doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'F');
  doc.setFontSize(8.5);
  doc.setTextColor(55, 65, 81);
  doc.setFont('helvetica', 'bold');
  const distText = 'Distribution: 1-10 Beginner | 11-20 Intermediate | 21-35 Advanced | 36-45 Expert | 46-50 Challenge';
  doc.text(distText, margin + 4, y + 7.5);
  y += 18;

  // Render each question
  questions.forEach((q) => {
    checkPageBreak(includeAnswers ? 45 : 25);

    // Question Number & Badges
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(79, 70, 229); // brand-600
    doc.text(`Q${q.number.toString().padStart(2, '0')}`, margin, y);

    // Difficulty & Type Pill Text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    const badgeText = `[${q.difficulty.toUpperCase()} • ${q.type.toUpperCase()}]`;
    doc.text(badgeText, margin + 14, y);
    y += 5.5;

    // Question Text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(17, 24, 39);
    const splitQuestion = doc.splitTextToSize(safeText(q.question), contentWidth);
    doc.text(splitQuestion, margin, y);
    y += splitQuestion.length * 4.8 + 2;

    // Code Snippet if present
    if (q.codeSnippet && q.codeSnippet.trim().length > 0) {
      checkPageBreak(25);
      doc.setFillColor(248, 250, 252);
      doc.setFont('courier', 'normal');
      doc.setFontSize(8);
      const splitCode = doc.splitTextToSize(safeText(q.codeSnippet), contentWidth - 8);
      const boxHeight = splitCode.length * 3.8 + 4;
      doc.roundedRect(margin, y - 2, contentWidth, boxHeight, 1.5, 1.5, 'F');
      doc.setTextColor(51, 65, 85);
      doc.text(splitCode, margin + 4, y + 2.5);
      y += boxHeight + 3;
    }

    // MCQ Options
    if (q.options && q.options.length > 0) {
      q.options.forEach(opt => {
        checkPageBreak(8);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(75, 85, 99);
        const splitOpt = doc.splitTextToSize(safeText(opt), contentWidth - 6);
        doc.text(splitOpt, margin + 4, y);
        y += splitOpt.length * 4.2 + 1;
      });
      y += 2;
    }

    // Answers & Explanations (if requested)
    if (includeAnswers) {
      checkPageBreak(20);
      doc.setFillColor(240, 253, 244); // light emerald tint
      const ansLines = doc.splitTextToSize(safeText(`Answer: ${q.correctAnswer || 'See explanation'}`), contentWidth - 8);
      const expLines = doc.splitTextToSize(safeText(`Explanation: ${q.explanation}`), contentWidth - 8);
      const answerBoxHeight = (ansLines.length + expLines.length) * 4 + 8;
      
      doc.roundedRect(margin, y - 1, contentWidth, answerBoxHeight, 2, 2, 'F');
      
      // Answer Text
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(22, 101, 52); // dark emerald
      doc.text(ansLines, margin + 4, y + 3.5);
      y += ansLines.length * 4 + 2;

      // Explanation Text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(expLines, margin + 4, y + 2.5);
      y += expLines.length * 4 + 5;
    }

    // Divider line
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  });

  // Save the PDF
  const sanitizedTopic = topic.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const filename = `${sanitizedTopic}_50_questions_${includeAnswers ? 'with_answers' : 'questions_only'}.pdf`;
  doc.save(filename);
}

export function exportQuestionsJSON(topic: string, questions: Question[]): void {
  const jsonContent = JSON.stringify({
    topic,
    exportedAt: new Date().toISOString(),
    totalQuestions: questions.length,
    distribution: {
      beginner: '1-10',
      intermediate: '11-20',
      advanced: '21-35',
      expert: '36-45',
      challenge: '46-50'
    },
    questions
  }, null, 2);

  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', blobUrl);
  const sanitizedTopic = topic.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  downloadAnchor.setAttribute('download', `${sanitizedTopic}_50_questions.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
}

export function exportQuestionsMarkdown(topic: string, questions: Question[], includeAnswers: boolean = true): string {
  let md = `# 50 Progressive Questions: ${topic}\n\n`;
  md += `> Generated by AI Question Generator on ${new Date().toLocaleDateString()}\n\n`;
  md += `## Difficulty Progression\n- **1–10**: Beginner\n- **11–20**: Intermediate\n- **21–35**: Advanced\n- **36–45**: Expert\n- **46–50**: Challenge\n\n---\n\n`;

  questions.forEach(q => {
    md += `### Q${q.number}. ${q.question}\n`;
    md += `**Difficulty**: \`${q.difficulty}\` | **Type**: \`${q.type}\`\n\n`;

    if (q.codeSnippet) {
      md += `\`\`\`\n${q.codeSnippet}\n\`\`\`\n\n`;
    }

    if (q.options && q.options.length > 0) {
      q.options.forEach(opt => {
        md += `- ${opt}\n`;
      });
      md += '\n';
    }

    if (includeAnswers) {
      md += `> **Correct Answer**: ${q.correctAnswer}\n>\n`;
      md += `> **Explanation**: ${q.explanation}\n\n`;
    }

    md += `---\n\n`;
  });

  return md;
}
