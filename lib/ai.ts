import OpenAI from 'openai';
import { DifficultyLevel, Question, QuestionType, ResponseLanguage } from './types';
import { isOllamaAvailable, ollamaGenerate, resolveBestOllamaModel } from './ollama';

// Initialize OpenAI client if API key is provided
function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  const lower = (apiKey || '').trim().toLowerCase();
  // Reject missing key or placeholder values
  if (!apiKey || lower === '' || lower.includes('your_api_key') || lower === 'your_key_here') {
    return null;
  }
  return new OpenAI({
    apiKey: apiKey.trim(),
  });
}

export function isAiConfigured(): boolean {
  return getOpenAIClient() !== null;
}

/** Check if Ollama is configured */
export function isOllamaConfigured(): boolean {
  return true;
}

/**
 * Detect language intent: English, Hindi, or Hinglish
 */
export function detectLanguage(text: string, preferred?: ResponseLanguage): ResponseLanguage {
  if (preferred && (preferred === 'English' || preferred === 'Hindi' || preferred === 'Hinglish')) {
    return preferred;
  }
  const lower = text.toLowerCase();

  // Devanagari script detection
  const hasDevanagari = /[\u0900-\u097F]/.test(text);
  if (hasDevanagari) {
    return 'Hindi';
  }

  // Hinglish keyword detection
  const hinglishMarkers = [
    'ke', 'ko', 'me', 'mein', 'se', 'tak', 'karo', 'kare', 'kaise', 'kya', 'hai', 'hain',
    'batao', 'samjhao', 'chahiye', 'kuch', 'hoga', 'wali', 'wale', 'banao', 'diye', 'karein',
    'karega', 'karna', 'sikhao', 'baare', 'samjha'
  ];
  const words = lower.split(/[\s,.-]+/);
  const matchCount = words.filter(w => hinglishMarkers.includes(w)).length;

  if (lower.includes('hinglish') || matchCount >= 1) {
    return 'Hinglish';
  }

  if (lower.includes('hindi')) {
    return 'Hindi';
  }

  return 'English';
}

export function getDifficultyForNumber(num: number): DifficultyLevel {
  if (num <= 10) return 'Beginner';
  if (num <= 20) return 'Intermediate';
  if (num <= 35) return 'Advanced';
  if (num <= 45) return 'Expert';
  return 'Challenge';
}

export function getTypeForNumber(num: number, selectedMode: QuestionType): 'Interview' | 'MCQ' | 'Coding' | 'Conceptual' {
  if (selectedMode !== 'Mixed') {
    return selectedMode;
  }
  // Balanced distribution in Mixed mode
  const pattern: Array<'Interview' | 'MCQ' | 'Coding' | 'Conceptual'> = [
    'MCQ', 'Interview', 'Conceptual', 'Coding', 'Interview',
    'MCQ', 'Coding', 'Conceptual', 'MCQ', 'Interview'
  ];
  return pattern[(num - 1) % pattern.length];
}

/**
 * Robust JSON parser that handles codeblocks and partial JSON
 */
function cleanAndParseJSON(raw: string): any {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    // Attempt to extract the outermost array or object
    const arrayMatch = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
      return JSON.parse(arrayMatch[0]);
    }
    const objMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objMatch) {
      return JSON.parse(objMatch[0]);
    }
    throw new Error('Failed to parse structured JSON from AI response: ' + (err as Error).message);
  }
}

/**
 * Strips prefix like "A. ", "B) ", "(C) ", "A: "
 */
export function stripOptionPrefix(text: string): string {
  return text.replace(/^(\(?[A-Da-d]\)?[\.\:\-\)]\s*)/, '').trim();
}

/**
 * Balances and shuffles MCQ options, ensuring correct answers are evenly
 * distributed across slots A, B, C, D (~25% each).
 *
 * @param options Raw options array (expected 4)
 * @param rawCorrectAnswer Raw answer string or letter indicator
 * @param targetSlot Explicit slot 0=A, 1=B, 2=C, 3=D, or undefined for random
 */
export function balanceAndShuffleMcqOptions(
  options: string[],
  rawCorrectAnswer: string,
  targetSlot?: number
): { options: string[]; correctAnswer: string } {
  const letters = ['A', 'B', 'C', 'D'];
  const safeOptions = Array.isArray(options) && options.length >= 2
    ? options.slice(0, 4)
    : [
        'Standard default behavior',
        'Optimized alternative approach',
        'Syntax-level constraint violation',
        'Non-blocking asynchronous mechanism'
      ];

  // While less than 4 options, backfill sensible distractors
  while (safeOptions.length < 4) {
    safeOptions.push(`Alternative design strategy #${safeOptions.length + 1}`);
  }

  // 1. Identify which option is the correct answer
  const rawAns = (rawCorrectAnswer || '').trim();
  let correctIndex = -1;

  // Check if rawAns is just a single letter like "A", "B", "C", "D" or "A. ..."
  const letterMatch = rawAns.match(/^([A-Da-d])(?:[\.\:\-\)\s]|$)/);
  if (letterMatch) {
    const matchedLetter = letterMatch[1].toUpperCase();
    const idx = letters.indexOf(matchedLetter);
    if (idx >= 0 && idx < safeOptions.length) {
      correctIndex = idx;
    }
  }

  // If not identified by letter prefix, check string match with options
  if (correctIndex === -1) {
    const cleanAns = stripOptionPrefix(rawAns).toLowerCase();
    for (let i = 0; i < safeOptions.length; i++) {
      const cleanOpt = stripOptionPrefix(safeOptions[i]).toLowerCase();
      if (cleanOpt === cleanAns || cleanOpt.includes(cleanAns) || cleanAns.includes(cleanOpt)) {
        correctIndex = i;
        break;
      }
    }
  }

  // Default to 0 if still unresolved
  if (correctIndex < 0 || correctIndex >= safeOptions.length) {
    correctIndex = 0;
  }

  // Extract clean texts
  const cleanTexts = safeOptions.map(opt => stripOptionPrefix(opt));
  const correctText = cleanTexts[correctIndex];
  const distractorTexts = cleanTexts.filter((_, idx) => idx !== correctIndex);

  // 2. Decide the destination slot (0, 1, 2, or 3)
  const destSlot = typeof targetSlot === 'number' && targetSlot >= 0
    ? Math.abs(targetSlot) % 4
    : Math.floor(Math.random() * 4);

  // 3. Assemble new options with correct answer in destSlot
  const newOptionsTexts: string[] = [];
  let distractorIdx = 0;
  for (let slot = 0; slot < 4; slot++) {
    if (slot === destSlot) {
      newOptionsTexts.push(correctText);
    } else {
      newOptionsTexts.push(distractorTexts[distractorIdx] || `Alternative valid mechanism`);
      distractorIdx++;
    }
  }

  // 4. Prefix with "A. ", "B. ", "C. ", "D. "
  const finalOptions = newOptionsTexts.map((txt, idx) => `${letters[idx]}. ${txt}`);
  const finalCorrectAnswer = finalOptions[destSlot];

  return {
    options: finalOptions,
    correctAnswer: finalCorrectAnswer
  };
}

/**
 * Generate 50 Questions using OpenAI API, Ollama (llama3.2), or Dynamic Structured Fallback
 */
export async function generate50Questions(
  topic: string,
  typeMode: QuestionType = 'Mixed',
  preferredLanguage?: ResponseLanguage,
  seed?: string | number
): Promise<{ questions: Question[]; isAiGenerated: boolean; language: ResponseLanguage; provider: string }> {
  const detectedLang = detectLanguage(topic, preferredLanguage);
  const generationSeed = seed ? String(seed) : `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const openai = getOpenAIClient();

  // ── Priority 1: OpenAI ──────────────────────────────────────────────────────
  if (openai) {
    try {
      const batch1Promise = callOpenAiBatch(openai, topic, typeMode, detectedLang, 1, 25, generationSeed);
      const batch2Promise = callOpenAiBatch(openai, topic, typeMode, detectedLang, 26, 50, generationSeed);
      const [batch1, batch2] = await Promise.all([batch1Promise, batch2Promise]);
      const combined = validateAndNormalize50([...batch1, ...batch2], topic, typeMode, detectedLang, generationSeed);
      return { questions: combined, isAiGenerated: true, language: detectedLang, provider: 'OpenAI' };
    } catch (error: any) {
      console.error('OpenAI generation error (falling back to Ollama):', error?.message || error);
    }
  }

  // ── Priority 2: Ollama (llama3.2 local) ─────────────────────────────────────
  const ollamaModel = await resolveBestOllamaModel();
  if (ollamaModel) {
    try {
      const questions = await generate50QuestionsWithOllama(ollamaModel, topic, typeMode, detectedLang, generationSeed);
      return { questions, isAiGenerated: true, language: detectedLang, provider: `Ollama (${ollamaModel})` };
    } catch (error: any) {
      console.error('Ollama generation error (falling back to Structured Demo):', error?.message || error);
    }
  }

  // ── Priority 3: Dynamic Structured Fallback ─────────────────────────────────
  const fallback = generateStructuredFallback50(topic, typeMode, detectedLang, generationSeed);
  return { questions: fallback, isAiGenerated: false, language: detectedLang, provider: 'Structured Demo' };
}

async function callOpenAiBatch(
  openai: OpenAI,
  topic: string,
  typeMode: QuestionType,
  language: ResponseLanguage,
  startNum: number,
  endNum: number,
  seed: string
): Promise<Question[]> {
  const count = endNum - startNum + 1;
  const isSecondHalf = startNum > 25;

  const difficultyGuide = isSecondHalf
    ? `Numbers ${startNum} to 35: Advanced. Numbers 36 to 45: Expert. Numbers 46 to 50: Very Advanced / Interview Challenge.`
    : `Numbers 1 to 10: Beginner. Numbers 11 to 20: Intermediate. Numbers 21 to ${endNum}: Advanced.`;

  const languageGuidance = language === 'Hindi'
    ? `OUTPUT LANGUAGE: Pure Hindi (Devanagari script or conversational Hindi). Keep technical words like "Class", "Object", "Inheritance", "SQL", "Database", "API", "Thread", "Memory", "Algorithm" in English or standard technical terminology. Write questions, options, answers, and explanations in Hindi.`
    : language === 'Hinglish'
    ? `OUTPUT LANGUAGE: Natural, engaging Hinglish (Hindi written in Roman/English script mixed with English). Example: "Class aur Object ke beech me kya basic difference hota hai? Explain karo with real example." Keep all technical terms in English.`
    : `OUTPUT LANGUAGE: Professional, crisp, idiomatic English.`;

  const systemPrompt = `You are a Principal Technical Interviewer, Educator, and Chief Question Architect.
Generate exactly ${count} unique, high-quality, non-repeating questions for the topic: "${topic}".
Request Seed/Entropy ID: ${seed}-${startNum}. Use this seed to vary the concepts, problem angles, and edge cases.
Starting question number: ${startNum}, ending question number: ${endNum}.

Difficulty Progression:
${difficultyGuide}

Question Types Mode: ${typeMode}
${typeMode === 'Mixed' ? 'Intelligently alternate between MCQ, Interview, Coding, and Conceptual questions.' : `All questions must be of type: ${typeMode}.`}

${languageGuidance}

MCQ CORRECT ANSWER DISTRIBUTION REQUIREMENT:
For MCQ questions, randomly and evenly distribute the correct answer across A, B, C, and D (~25% each).
NEVER place all correct answers in Option A. Always update correctAnswer to match the designated option.

STRICT JSON FORMAT:
Return a valid JSON array of ${count} objects. No extra keys, no markdown text outside the JSON.
Each object must match this schema:
{
  "number": number,
  "difficulty": "Beginner" | "Intermediate" | "Advanced" | "Expert" | "Challenge",
  "type": "Interview" | "MCQ" | "Coding" | "Conceptual",
  "question": "Clear, specific question text",
  "options": ["A. ...", "B. ...", "C. ...", "D. ..."], // For MCQ only! Array of 4 choices. For other types, empty array [].
  "correctAnswer": "The direct concise correct answer or choice (e.g. 'B. ...' or summary answer)",
  "explanation": "Detailed, technically thorough explanation (3-5 sentences) explaining the mechanism, why this is correct, and real-world considerations.",
  "tags": ["Topic", "Subtopic", "Tag"],
  "expectedConcept": "Key underlying concept being tested",
  "codeSnippet": "Optional code block or starter code if relevant, or empty string"
}`;

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate questions ${startNum} to ${endNum} about "${topic}". Generation Seed: ${seed}` }
    ],
    temperature: 0.75,
    response_format: { type: 'json_object' }
  });

  const content = response.choices[0]?.message?.content || '{}';
  const parsed = cleanAndParseJSON(content);
  const questionsArray: any[] = Array.isArray(parsed)
    ? parsed
    : (parsed.questions || parsed.data || Object.values(parsed)[0] || []);

  return questionsArray.map((q, idx) => {
    const num = startNum + idx;
    const diff = q.difficulty || getDifficultyForNumber(num);
    const qType = q.type || getTypeForNumber(num, typeMode);

    let finalOptions = q.options;
    let finalCorrectAnswer = q.correctAnswer;

    if (qType === 'MCQ') {
      const balanced = balanceAndShuffleMcqOptions(
        Array.isArray(q.options) && q.options.length >= 2 ? q.options : generateFallbackOptions(q.question || '', topic, num, language),
        q.correctAnswer || '',
        num % 4
      );
      finalOptions = balanced.options;
      finalCorrectAnswer = balanced.correctAnswer;
    } else {
      finalOptions = [];
      finalCorrectAnswer = q.correctAnswer || (language === 'Hindi' ? 'विस्तृत व्याख्या देखें।' : language === 'Hinglish' ? 'Neeche explanation me detailed answer dekhein.' : 'Refer to explanation below.');
    }

    return {
      id: `q-${num}-${seed}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      number: num,
      question: q.question || `Question ${num} on ${topic}`,
      difficulty: diff,
      type: qType,
      options: finalOptions,
      correctAnswer: finalCorrectAnswer,
      explanation: q.explanation || `Comprehensive explanation for question ${num} on ${topic}.`,
      tags: Array.isArray(q.tags) && q.tags.length > 0 ? q.tags : [topic, diff],
      expectedConcept: q.expectedConcept || topic,
      codeSnippet: q.codeSnippet || ''
    };
  });
}

function generateFallbackOptions(
  question: string,
  topic: string,
  num: number,
  language: ResponseLanguage
): string[] {
  if (language === 'Hindi') {
    return [
      `A. ${topic} में मानक अनुशंसित दृष्टिकोण`,
      `B. कम runtime overhead वाला अनुकूलित दृष्टिकोण`,
      `C. Deprecated legacy पद्धति जिसे टालना चाहिए`,
      `D. Compilation त्रुटि उत्पन्न करने वाला गलत सिंटैक्स`
    ];
  }
  if (language === 'Hinglish') {
    return [
      `A. ${topic} me standard recommended approach`,
      `B. Optimized high-performance alternative jo latency kam kare`,
      `C. Deprecated legacy method jisko use nahi karna chahiye`,
      `D. Syntax error ya runtime exception throw karne wala invalid code`
    ];
  }
  return [
    `A. Standard recommended design pattern in ${topic}`,
    `B. Optimized high-performance alternative with minimal overhead`,
    `C. Deprecated legacy mechanism leading to memory leaks`,
    `D. Syntactically invalid operation violating compiler guarantees`
  ];
}

/**
 * Validate, deduplicate, ensure MCQ answer distribution, and enforce exactly 50 questions
 */
export function validateAndNormalize50(
  questions: Question[],
  topic: string,
  typeMode: QuestionType,
  language: ResponseLanguage,
  seed: string = 'default'
): Question[] {
  const initialSeen = new Set<string>();
  const valid: Question[] = [];

  for (const q of questions) {
    if (!q || !q.question) continue;
    // Unicode-aware normalization: preserve Devanagari (\u0900-\u097F) and extended Latin
    const normalized = q.question.toLowerCase().trim().replace(/[^a-z0-9\u0900-\u097F]/g, '');
    if (!initialSeen.has(normalized) && q.question.length > 8) {
      initialSeen.add(normalized);
      valid.push(q);
    }
  }

  // Ensure exactly 50 questions with strict difficulty progression and ZERO duplicates
  const finalQuestions: Question[] = [];
  const usedTexts = new Set<string>();
  let mcqCounter = 0;

  for (let i = 1; i <= 50; i++) {
    const diff = getDifficultyForNumber(i);
    const expectedType = getTypeForNumber(i, typeMode);

    let qCandidate = valid[i - 1];
    let norm = qCandidate?.question ? qCandidate.question.toLowerCase().replace(/[^a-z0-9\u0900-\u097F]/g, '') : '';

    let salt = 1;
    while (!qCandidate || !norm || norm.length < 8 || usedTexts.has(norm)) {
      qCandidate = generateSingleFallbackQuestion(
        topic,
        i,
        diff,
        expectedType,
        language,
        `${seed}-uniq-${salt}-${i}`
      );
      norm = qCandidate.question.toLowerCase().replace(/[^a-z0-9\u0900-\u097F]/g, '');
      salt++;
      if (salt > 50) break;
    }

    usedTexts.add(norm);

    const resolvedType = typeMode === 'Mixed' ? qCandidate.type : typeMode;

    let finalOptions = qCandidate.options || [];
    let finalCorrectAnswer = qCandidate.correctAnswer || '';

    if (resolvedType === 'MCQ') {
      // Balance MCQ correct answer across A, B, C, D (slot mcqCounter % 4)
      const balanced = balanceAndShuffleMcqOptions(
        finalOptions.length === 4 ? finalOptions : generateFallbackOptions(qCandidate.question, topic, i, language),
        finalCorrectAnswer,
        mcqCounter % 4
      );
      finalOptions = balanced.options;
      finalCorrectAnswer = balanced.correctAnswer;
      mcqCounter++;
    } else {
      finalOptions = [];
    }

    finalQuestions.push({
      ...qCandidate,
      id: `q-${i}-${seed}-${Math.random().toString(36).substring(2, 6)}`,
      number: i,
      difficulty: diff,
      type: resolvedType,
      options: finalOptions,
      correctAnswer: finalCorrectAnswer
    });
  }

  return finalQuestions;
}

/**
 * Explain More AI API route helper
 */
export async function explainQuestionDeepDive(
  question: Question,
  topic: string,
  preferredLanguage?: ResponseLanguage
): Promise<{ deepDiveExplanation: string; codeExample: string; interviewTips: string[]; commonMistakes: string[] }> {
  const lang = preferredLanguage || detectLanguage(question.question);

  const langInstruction = lang === 'Hindi'
    ? 'OUTPUT LANGUAGE: Conversational Hindi (Devanagari script). Keep technical keywords in English.'
    : lang === 'Hinglish'
    ? 'OUTPUT LANGUAGE: Friendly, natural Hinglish (Hindi words in English alphabet + technical English).'
    : 'OUTPUT LANGUAGE: Clear, professional, senior-level English.';

  const explainPrompt = `You are a Principal Software Engineer explaining this technical question to an engineer:
Topic: "${topic}"
Question: "${question.question}"
Difficulty: "${question.difficulty}"
Type: "${question.type}"
Correct Answer: "${question.correctAnswer}"

${langInstruction}

Return valid JSON with this schema:
{
  "deepDiveExplanation": "3-4 detailed paragraphs explaining the underlying theory, memory/runtime behavior, and practical use-cases.",
  "codeExample": "A production-grade, syntax-highlighted code example demonstrating the concept.",
  "interviewTips": ["Tip 1 on how to impress the interviewer", "Tip 2 on edge cases to mention", "Tip 3"],
  "commonMistakes": ["Mistake 1 candidates frequently make", "Mistake 2", "Mistake 3"]
}`;

  // ── Priority 1: OpenAI ────────────────────────────────────────────────────
  const openai = getOpenAIClient();
  if (openai) {
    try {
      const res = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'user', content: explainPrompt }],
        response_format: { type: 'json_object' },
        temperature: 0.6
      });
      const content = res.choices[0]?.message?.content || '{}';
      const parsed = cleanAndParseJSON(content);
      return {
        deepDiveExplanation: parsed.deepDiveExplanation || question.explanation,
        codeExample: parsed.codeExample || question.codeSnippet || '// Example demonstrating ' + topic,
        interviewTips: Array.isArray(parsed.interviewTips) && parsed.interviewTips.length > 0 ? parsed.interviewTips : ['Highlight performance considerations', 'Mention thread-safety/concurrency implications'],
        commonMistakes: Array.isArray(parsed.commonMistakes) && parsed.commonMistakes.length > 0 ? parsed.commonMistakes : ['Confusing definition with implementation', 'Ignoring boundary edge cases']
      };
    } catch (err) {
      console.error('Failed OpenAI deep dive (falling back):', err);
    }
  }

  // ── Priority 2: Ollama ────────────────────────────────────────────────────
  const ollamaModel = await resolveBestOllamaModel();
  if (ollamaModel) {
    try {
      return await explainWithOllama(ollamaModel, question, topic, explainPrompt);
    } catch (err) {
      console.error('Failed Ollama deep dive (falling back):', err);
    }
  }

  // ── Priority 3: Structured fallback ──────────────────────────────────────
  return generateFallbackDeepDive(question, topic, lang);
}

/**
 * Regenerate Single Question AI API route helper
 */
export async function regenerateSingleQuestion(
  topic: string,
  number: number,
  difficulty: DifficultyLevel,
  type: 'Interview' | 'MCQ' | 'Coding' | 'Conceptual',
  preferredLanguage?: ResponseLanguage,
  existingQuestionsSummary?: string[]
): Promise<Question> {
  const lang = preferredLanguage || detectLanguage(topic);
  const regenSeed = `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const langInstruction = lang === 'Hindi'
    ? 'OUTPUT LANGUAGE: Hindi in Devanagari with technical English terms.'
    : lang === 'Hinglish'
    ? 'OUTPUT LANGUAGE: Hinglish (Hindi in Roman script with English technical terms).'
    : 'OUTPUT LANGUAGE: Professional English.';

  const summaryExclusion = Array.isArray(existingQuestionsSummary) && existingQuestionsSummary.length > 0
    ? `Do NOT create questions similar to: ${existingQuestionsSummary.slice(0, 5).join(' | ')}`
    : '';

  const regenPrompt = `Generate 1 fresh, unique, high-quality question for topic: "${topic}".
Question Number: ${number}
Difficulty: ${difficulty}
Question Type: ${type}
${langInstruction}
${summaryExclusion}

For MCQ questions, randomly choose any option (A, B, C, or D) as the correct answer.

Return valid JSON:
{
  "question": "Question text",
  "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
  "correctAnswer": "Correct answer",
  "explanation": "Detailed explanation",
  "tags": ["${topic}", "${difficulty}"],
  "expectedConcept": "Core concept",
  "codeSnippet": "Code if applicable"
}`;

  const makeQuestion = (parsed: any): Question => {
    let finalOptions = parsed.options;
    let finalCorrectAnswer = parsed.correctAnswer;

    if (type === 'MCQ') {
      const balanced = balanceAndShuffleMcqOptions(
        Array.isArray(parsed.options) && parsed.options.length >= 2
          ? parsed.options
          : generateFallbackOptions(parsed.question || '', topic, number, lang),
        parsed.correctAnswer || '',
        number % 4
      );
      finalOptions = balanced.options;
      finalCorrectAnswer = balanced.correctAnswer;
    } else {
      finalOptions = [];
      finalCorrectAnswer = parsed.correctAnswer || (lang === 'Hindi' ? 'व्याख्या देखें' : lang === 'Hinglish' ? 'Explanation dekhein' : 'Refer to explanation');
    }

    return {
      id: `q-${number}-${regenSeed}`,
      number,
      question: parsed.question || `Refined ${difficulty} question on ${topic}`,
      difficulty,
      type,
      options: finalOptions,
      correctAnswer: finalCorrectAnswer,
      explanation: parsed.explanation || `Thorough breakdown of ${topic} at ${difficulty} level.`,
      tags: Array.isArray(parsed.tags) && parsed.tags.length > 0 ? parsed.tags : [topic, difficulty],
      expectedConcept: parsed.expectedConcept || topic,
      codeSnippet: parsed.codeSnippet || ''
    };
  };

  // ── Priority 1: OpenAI ────────────────────────────────────────────────────
  const openai = getOpenAIClient();
  if (openai) {
    try {
      const res = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'user', content: regenPrompt }],
        response_format: { type: 'json_object' },
        temperature: 0.85
      });
      return makeQuestion(cleanAndParseJSON(res.choices[0]?.message?.content || '{}'));
    } catch (err) {
      console.error('OpenAI regenerate error:', err);
    }
  }

  // ── Priority 2: Ollama ────────────────────────────────────────────────────
  const ollamaModel = await resolveBestOllamaModel();
  if (ollamaModel) {
    try {
      const raw = await ollamaGenerate(
        ollamaModel,
        'You are a technical question generator. Always output only valid JSON.',
        regenPrompt,
        45_000
      );
      return makeQuestion(cleanAndParseJSON(raw));
    } catch (err) {
      console.error('Ollama regenerate error:', err);
    }
  }

  // ── Priority 3: Structured fallback ──────────────────────────────────────
  return generateSingleFallbackQuestion(topic, number, difficulty, type, lang, regenSeed);
}

// ─────────────────────────────────────────────────────────────────────────────
// OLLAMA GENERATION FUNCTIONS (llama3.2)
// ─────────────────────────────────────────────────────────────────────────────

async function generate50QuestionsWithOllama(
  model: string,
  topic: string,
  typeMode: QuestionType,
  language: ResponseLanguage,
  seed: string
): Promise<Question[]> {
  // Generate a targeted batch of progressive questions with a 25s timeout for fast laptop inference
  const batch = await callOllamaBatch(model, topic, typeMode, language, 1, 5, seed, 25_000);
  return validateAndNormalize50(batch, topic, typeMode, language, seed);
}

async function callOllamaBatch(
  model: string,
  topic: string,
  typeMode: QuestionType,
  language: ResponseLanguage,
  startNum: number,
  endNum: number,
  seed: string,
  timeoutMs: number = 25_000
): Promise<Question[]> {
  const count = endNum - startNum + 1;
  const isSecondHalf = startNum > 25;

  const difficultyGuide = isSecondHalf
    ? `Numbers ${startNum} to 35: Advanced. Numbers 36 to 45: Expert. Numbers 46 to 50: Very Advanced / Interview Challenge.`
    : `Numbers 1 to 10: Beginner. Numbers 11 to 20: Intermediate. Numbers 21 to ${endNum}: Advanced.`;

  const languageGuidance = language === 'Hindi'
    ? `OUTPUT LANGUAGE: Pure Hindi (Devanagari script or conversational Hindi). Keep technical words like "Class", "Object", "SQL", "API" in English.`
    : language === 'Hinglish'
    ? `OUTPUT LANGUAGE: Natural Hinglish (Hindi written in Roman script mixed with English). Example: "Class aur Object ke beech me kya difference hota hai?". Keep technical terms in English.`
    : `OUTPUT LANGUAGE: Professional, crisp, idiomatic English.`;

  const systemPrompt = `You are a Principal Technical Interviewer and Question Architect.
Generate exactly ${count} unique, high-quality questions for the topic: "${topic}".
Request Seed: ${seed}-${startNum}.
Starting question number: ${startNum}, ending question number: ${endNum}.

Difficulty Progression:
${difficultyGuide}

Question Types Mode: ${typeMode}
${typeMode === 'Mixed' ? 'Intelligently alternate between MCQ, Interview, Coding, and Conceptual questions.' : `All questions must be of type: ${typeMode}.`}

${languageGuidance}

For MCQ questions, randomly distribute correct answers across A, B, C, and D.

STRICT JSON FORMAT:
Return a valid JSON object with a "questions" array of ${count} objects. Each object:
{
  "number": number,
  "difficulty": "Beginner" | "Intermediate" | "Advanced" | "Expert" | "Challenge",
  "type": "Interview" | "MCQ" | "Coding" | "Conceptual",
  "question": "Clear specific question text",
  "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
  "correctAnswer": "The correct answer",
  "explanation": "Detailed 3-5 sentence explanation",
  "tags": ["tag1", "tag2"],
  "expectedConcept": "Core concept being tested",
  "codeSnippet": "Optional code or empty string"
}
Do NOT include markdown backticks outside the JSON.`;

  const raw = await ollamaGenerate(
    model,
    systemPrompt,
    `Generate questions ${startNum} to ${endNum} about "${topic}". Unique Seed: ${seed}`,
    timeoutMs
  );

  const parsed = cleanAndParseJSON(raw);
  const questionsArray: any[] = Array.isArray(parsed)
    ? parsed
    : (parsed.questions || parsed.data || Object.values(parsed)[0] || []);

  return questionsArray.map((q: any, idx: number) => {
    const num = startNum + idx;
    const diff = q.difficulty || getDifficultyForNumber(num);
    const qType = q.type || getTypeForNumber(num, typeMode);

    let finalOptions = q.options;
    let finalCorrectAnswer = q.correctAnswer;

    if (qType === 'MCQ') {
      const balanced = balanceAndShuffleMcqOptions(
        Array.isArray(q.options) && q.options.length >= 2 ? q.options : generateFallbackOptions(q.question || '', topic, num, language),
        q.correctAnswer || '',
        num % 4
      );
      finalOptions = balanced.options;
      finalCorrectAnswer = balanced.correctAnswer;
    } else {
      finalOptions = [];
      finalCorrectAnswer = q.correctAnswer || (language === 'Hindi' ? 'विस्तृत व्याख्या देखें।' : language === 'Hinglish' ? 'Neeche explanation me detailed answer dekhein.' : 'Refer to explanation.');
    }

    return {
      id: `q-${num}-${seed}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      number: num,
      question: q.question || `Question ${num} on ${topic}`,
      difficulty: diff,
      type: qType,
      options: finalOptions,
      correctAnswer: finalCorrectAnswer,
      explanation: q.explanation || `Explanation for question ${num} on ${topic}.`,
      tags: Array.isArray(q.tags) && q.tags.length > 0 ? q.tags : [topic, diff],
      expectedConcept: q.expectedConcept || topic,
      codeSnippet: q.codeSnippet || ''
    };
  });
}

async function explainWithOllama(
  model: string,
  question: Question,
  topic: string,
  prompt: string
): Promise<{ deepDiveExplanation: string; codeExample: string; interviewTips: string[]; commonMistakes: string[] }> {
  const raw = await ollamaGenerate(
    model,
    'You are a Principal Software Engineer. Always respond with valid JSON only.',
    prompt,
    60_000
  );
  const parsed = cleanAndParseJSON(raw);
  return {
    deepDiveExplanation: parsed.deepDiveExplanation || question.explanation,
    codeExample: parsed.codeExample || question.codeSnippet || `// Example for ${topic}`,
    interviewTips: Array.isArray(parsed.interviewTips) && parsed.interviewTips.length > 0 ? parsed.interviewTips : ['Highlight performance trade-offs', 'Mention edge cases and real-world use'],
    commonMistakes: Array.isArray(parsed.commonMistakes) && parsed.commonMistakes.length > 0 ? parsed.commonMistakes : ['Oversimplifying the problem', 'Missing thread-safety considerations']
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DYNAMIC COMBINATORIAL STRUCTURED FALLBACK GENERATOR
// Ensures repeated generations of the same topic produce different questions!
// ─────────────────────────────────────────────────────────────────────────────

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function generateStructuredFallback50(
  topic: string,
  typeMode: QuestionType,
  language: ResponseLanguage,
  seed: string = 'seed'
): Question[] {
  const questions: Question[] = [];
  const seedNum = simpleHash(seed + topic + Date.now().toString());

  for (let i = 1; i <= 50; i++) {
    const difficulty = getDifficultyForNumber(i);
    const qType = getTypeForNumber(i, typeMode);
    questions.push(generateSingleFallbackQuestion(topic, i, difficulty, qType, language, `${seed}-${seedNum}`));
  }

  return validateAndNormalize50(questions, topic, typeMode, language, seed);
}

interface ConceptualFacet {
  pillar: string;
  subtopic: string;
  angleKey: string;
}

const TIER_SUBTOPICS: Record<DifficultyLevel, Array<{ pillar: string; subtopic: string }>> = {
  Beginner: [
    { pillar: 'Fundamentals & Syntax', subtopic: 'Core Syntax & Primitive Types' },
    { pillar: 'Fundamentals & Syntax', subtopic: 'Type Inference & Explicit Casting' },
    { pillar: 'Variable Lifetimes', subtopic: 'Memory Allocation & Variable Scope' },
    { pillar: 'Execution Flow', subtopic: 'Control Structures & Conditional Branching' },
    { pillar: 'Execution Flow', subtopic: 'Looping Constructs & Early Exits' },
    { pillar: 'Function Foundations', subtopic: 'Function Signatures & Parameter Passing' },
    { pillar: 'Error Foundations', subtopic: 'Error Handling & Exception Signatures' },
    { pillar: 'Data Structures', subtopic: 'Standard Collections & Array Indexing' },
    { pillar: 'Language Conventions', subtopic: 'Idiomatic Conventions & Standard Libraries' },
    { pillar: 'State Semantics', subtopic: 'Immutability vs Mutability Guarantees' },
  ],
  Intermediate: [
    { pillar: 'OOP Architecture', subtopic: 'Encapsulation & Access Modifiers' },
    { pillar: 'OOP Architecture', subtopic: 'Inheritance Hierarchies & Super Calls' },
    { pillar: 'OOP Architecture', subtopic: 'Composition & Interface Segregation' },
    { pillar: 'Polymorphism', subtopic: 'Polymorphism & Dynamic Dispatch Contracts' },
    { pillar: 'Abstraction', subtopic: 'Abstract Contracts & Dependency Inversion' },
    { pillar: 'Lifecycle Management', subtopic: 'Object Construction & Resource Destructors' },
    { pillar: 'Memory Management', subtopic: 'Reference Counting & Garbage Collection Cycles' },
    { pillar: 'Data Structures', subtopic: 'Hash Table Collisions & Bucketing' },
    { pillar: 'Modular Design', subtopic: 'Modular Namespaces & Package Boundaries' },
    { pillar: 'Robustness', subtopic: 'Exception Propagation & Resource Leaks' },
  ],
  Advanced: [
    { pillar: 'Concurrency', subtopic: 'Deadlocks, Livelocks & Thread Starvation' },
    { pillar: 'Concurrency', subtopic: 'Lock-free Atomics & Compare-and-Swap' },
    { pillar: 'Hardware Architecture', subtopic: 'Memory Locality & CPU Cache Line Alignment' },
    { pillar: 'Hardware Architecture', subtopic: 'False Sharing & Cache Invalidation Cascades' },
    { pillar: 'Compiler Internals', subtopic: 'JIT Optimization, Inlining & Deoptimization' },
    { pillar: 'Asynchronous I/O', subtopic: 'Non-blocking Event Loops & Epoll Multiplexing' },
    { pillar: 'Stream Processing', subtopic: 'Backpressure Propagation Across Async Streams' },
    { pillar: 'Runtimes', subtopic: 'Coroutine Stack Management & Scheduling' },
    { pillar: 'Memory Internals', subtopic: 'Virtual Memory Paging & TLB Misses' },
    { pillar: 'Metaprogramming', subtopic: 'Bytecode Inspection & AST Transformations' },
    { pillar: 'Dynamic Dispatch', subtopic: 'VTables & Function Pointer Resolution' },
    { pillar: 'Resource Pools', subtopic: 'Thread Pool Starvation & Work-Stealing Queues' },
    { pillar: 'Serialization', subtopic: 'Zero-Copy Serialization & Wire Encodings' },
    { pillar: 'Safety Guarantees', subtopic: 'Memory Barriers & CPU Out-of-Order Execution' },
    { pillar: 'Performance Diagnostics', subtopic: 'Allocation Profiling & Critical-Loop Optimization' },
  ],
  Expert: [
    { pillar: 'Distributed Systems', subtopic: 'Raft & Paxos Distributed Quorum Consensus' },
    { pillar: 'System Architecture', subtopic: 'CAP & PACELC Theorem Trade-offs Under Partition' },
    { pillar: 'Transactions', subtopic: 'Saga Pattern vs Two-Phase Distributed Commits' },
    { pillar: 'High-Throughput Reliability', subtopic: 'P99 Tail Latency Spikes & Network Jitter' },
    { pillar: 'Resilience', subtopic: 'Adaptive Circuit Breakers & Token Bucket Throttling' },
    { pillar: 'Data Partitioning', subtopic: 'Consistent Hashing & Virtual Node Partitioning' },
    { pillar: 'Concurrency at Scale', subtopic: 'Distributed Lock Fencing & Monotonic Tokens' },
    { pillar: 'Fault Tolerance', subtopic: 'Split-Brain Mitigation & Quorum Leases' },
    { pillar: 'Linux Kernel Telemetry', subtopic: 'eBPF Profiling & Kernel Probe Tracing' },
    { pillar: 'Zero-Downtime Operations', subtopic: 'Blue-Green Database Migrations & Dual Writes' },
  ],
  Challenge: [
    { pillar: 'Staff Engineering Challenge', subtopic: 'Non-deterministic Epoll Starvation in Mission-Critical Sockets' },
    { pillar: 'Principal Hardware Challenge', subtopic: 'Hardware Memory Reordering & Speculative Cache Invalidation' },
    { pillar: 'Global Scale Challenge', subtopic: 'Multi-datacenter Network Partition Failover with Strict Serializability' },
    { pillar: 'Formal Verification Challenge', subtopic: 'Formal Verification of Distributed Finite State Machines' },
    { pillar: 'Data Integrity Challenge', subtopic: 'Silent Bit-Rot Recovery & Cryptographic Ledger Verification' },
  ]
};

function getFacetForIndex(topic: string, num: number, seed: string): ConceptualFacet {
  const diff = getDifficultyForNumber(num);
  const tierList = TIER_SUBTOPICS[diff];

  let tierIndex = 0;
  if (diff === 'Beginner') tierIndex = num - 1;
  else if (diff === 'Intermediate') tierIndex = num - 11;
  else if (diff === 'Advanced') tierIndex = num - 21;
  else if (diff === 'Expert') tierIndex = num - 36;
  else tierIndex = num - 46;

  const seedOffset = simpleHash(`${seed}-${topic}`) % tierList.length;
  const chosenIndex = (tierIndex + seedOffset) % tierList.length;
  const chosen = tierList[chosenIndex];

  return {
    pillar: chosen.pillar,
    subtopic: chosen.subtopic,
    angleKey: `${chosen.subtopic}-${chosenIndex}`
  };
}

export function generateSingleFallbackQuestion(
  topic: string,
  num: number,
  diff: DifficultyLevel,
  type: 'Interview' | 'MCQ' | 'Coding' | 'Conceptual',
  lang: ResponseLanguage,
  seed: string = 'default'
): Question {
  const isHindi = lang === 'Hindi';
  const isHinglish = lang === 'Hinglish';
  const facet = getFacetForIndex(topic, num, seed);
  const seedHash = simpleHash(`${seed}-${topic}-${num}`);
  const targetSlot = (num - 1 + seedHash) % 4; // Cycles evenly: 0=A, 1=B, 2=C, 3=D

  let questionText = '';
  let explanation = '';
  let expectedConcept = `${facet.pillar} • ${facet.subtopic}`;
  let codeSnippet = '';
  let rawOptions: string[] = [];
  let rawCorrectAnswer = '';

  // ── English Generation ───────────────────────────────────────────────────
  if (!isHindi && !isHinglish) {
    if (diff === 'Beginner') {
      const templates = [
        `In ${topic}, what is the fundamental purpose of ${facet.subtopic}, and why is it essential for code correctness?`,
        `How does ${topic} handle ${facet.subtopic} during initial execution, and what common pitfalls should junior engineers avoid?`,
        `Which scenario accurately demonstrates the primary role of ${facet.subtopic} within ${topic}?`,
        `What occurs under the hood in ${topic} when ${facet.subtopic} is executed incorrectly or left uninitialized?`
      ];
      questionText = templates[seedHash % templates.length];
      explanation = `Understanding ${facet.subtopic} in ${topic} provides foundational guarantees for memory safety, deterministic execution, and prevents unexpected runtime exceptions.`;
    } else if (diff === 'Intermediate') {
      const templates = [
        `When designing a scalable module in ${topic}, how should you balance ${facet.subtopic} against performance overhead?`,
        `In what specific scenario would an engineer choose composition over inheritance when implementing ${facet.subtopic} in ${topic}?`,
        `How does improper handling of ${facet.subtopic} contribute to memory leaks or unexpected state mutations in ${topic}?`,
        `Explain how ${topic} manages the lifecycle transitions and resource cleanup for ${facet.subtopic}.`
      ];
      questionText = templates[seedHash % templates.length];
      explanation = `At an intermediate level, developers must balance lifecycle hygiene, reference retention, and decoupling contracts to guarantee that ${facet.subtopic} does not become a bottleneck.`;
    } else if (diff === 'Advanced') {
      const templates = [
        `Under high-concurrency workloads in ${topic}, how do memory barriers and atomic operations protect ${facet.subtopic} from race conditions?`,
        `Analyze the internal runtime mechanics of ${facet.subtopic} in ${topic}: how does the engine optimize dispatch and avoid CPU cache misses?`,
        `What architectural trade-offs emerge when implementing asynchronous non-blocking handling for ${facet.subtopic} in ${topic}?`,
        `How would you diagnose and resolve an intermittent thread contention deadlock rooted in ${facet.subtopic} within a high-throughput ${topic} service?`
      ];
      questionText = templates[seedHash % templates.length];
      explanation = `Advanced engineering requires deep knowledge of CPU cache locality, lock-free synchronization, dynamic dispatch overhead, and minimizing lock contention during ${facet.subtopic}.`;
    } else if (diff === 'Expert') {
      const templates = [
        `In a globally distributed multi-region cluster, how would you architect zero-downtime consistency for ${topic}'s ${facet.subtopic}?`,
        `Describe the telemetry and eBPF instrumentation strategy you would deploy to trace p99 tail latency spikes caused by ${facet.subtopic} in ${topic}.`,
        `How do CAP theorem trade-offs dictate the partition-tolerance strategy when scaling ${facet.subtopic} across millions of requests per second in ${topic}?`,
        `Propose a deterministic disaster-recovery and split-brain mitigation plan for an enterprise ${topic} subsystem managing ${facet.subtopic}.`
      ];
      questionText = templates[seedHash % templates.length];
      explanation = `Staff and Principal engineers evaluate quorum sizing, backpressure propagation, tail-latency mitigation, and fencing tokens to maintain 99.999% availability for ${facet.subtopic}.`;
    } else {
      // Challenge (46-50)
      const templates = [
        `[Staff/Principal Interview Challenge] A subtle race condition in ${topic}'s lowest-level ${facet.subtopic} causes 1 in 10 million transactions to corrupt memory. Detail your end-to-end debugging harness and resolution.`,
        `[System Architect Challenge] Design a zero-allocation, lock-free ring-buffer pipeline for ${topic}'s ${facet.subtopic} capable of sustaining 5M ops/sec with sub-millisecond p99 latency.`,
        `[Deep Internals Challenge] How does modern hardware cache line bouncing (false sharing) impact ${facet.subtopic} in ${topic}, and how do you implement memory padding to eliminate it?`
      ];
      questionText = templates[seedHash % templates.length];
      explanation = `Addresses top-tier systems engineering: hardware cache coherence protocols (MESI), speculative CPU instruction reordering, memory barriers, and formal verification.`;
    }

    if (type === 'MCQ') {
      const optionSets = [
        [
          `Provides deterministic isolation and establishes compile-time safety boundaries`,
          `Completely bypasses runtime type verification and disables garbage collection`,
          `Forces single-threaded sequential execution across all processor cores`,
          `Restricts memory allocation strictly to the OS ephemeral swap partition`
        ],
        [
          `Utilizes lock-free atomic primitives and cacheline alignment to eliminate false sharing`,
          `Wraps every internal function call in a synchronous recursive mutex`,
          `Relies on periodic unindexed table scans on a background cron schedule`,
          `Suppresses all error logs to improve runtime loop throughput`
        ],
        [
          `Implements decoupled interface contracts with explicit backpressure ring buffers`,
          `Hardcodes infinite retry loops without backoff or jitter`,
          `Disables TCP keep-alives and opens a new connection per micro-transaction`,
          `Allocates all objects directly to the CPU L1 instruction cache`
        ],
        [
          `Ensures linearizable read/write semantics via distributed fencing tokens and quorum consensus`,
          `Assumes all clock times across cluster nodes are perfectly synchronized without NTP`,
          `Re-executes failed transactions indefinitely without idempotency keys`,
          `Stores complete transaction journals directly in volatile process heap memory`
        ],
        [
          `Leverages write-ahead logging with checkpoint recovery for crash-consistent persistence`,
          `Uses busy-wait spin locks across all hot-path critical sections`,
          `Disables write buffering and flushes to disk on every byte written`,
          `Routes all inter-service traffic through a single global mutex`
        ],
        [
          `Employs connection pooling with health checks and circuit-breaker failover`,
          `Creates a new database connection for every individual SQL query`,
          `Stores session tokens in plaintext cookies without expiration`,
          `Skips input validation entirely to maximize request throughput`
        ],
        [
          `Uses immutable data structures with structural sharing for safe concurrency`,
          `Relies on global mutable state shared across all goroutines without synchronization`,
          `Copies the entire dataset on every read to guarantee freshness`,
          `Disables the garbage collector to avoid GC pause latency`
        ],
        [
          `Implements graceful degradation with exponential backoff and jitter for retries`,
          `Retries failed requests immediately in a tight loop without rate limiting`,
          `Terminates the entire process on any transient network error`,
          `Caches all API responses indefinitely without cache invalidation`
        ]
      ];
      rawOptions = optionSets[seedHash % optionSets.length];
      rawCorrectAnswer = rawOptions[0];
    } else if (type === 'Coding') {
      codeSnippet = `// ${topic} - Problem #${num} (${diff})\n// Implement optimized logic for: ${facet.subtopic}\nfunction solveProblem(inputData) {\n  // Target: O(N) time complexity, O(1) auxiliary space\n  // Handle edge cases: empty input, boundary values, concurrent mutation\n  \n  return result;\n}`;
    }
  }

  // ── Hindi Generation (Devanagari) ─────────────────────────────────────────
  else if (isHindi) {
    if (diff === 'Beginner') {
      questionText = `${topic} में ${facet.subtopic} का मूल उद्देश्य क्या है और यह code की reliability के लिए क्यों महत्वपूर्ण है?`;
      explanation = `${topic} में ${facet.subtopic} foundational concept है जो predictable execution और clean memory structure सुनिश्चित करता है।`;
    } else if (diff === 'Intermediate') {
      questionText = `${topic} में ${facet.subtopic} को implement करते समय memory optimization और state lifecycle का प्रबंधन कैसे किया जाता है?`;
      explanation = `Intermediate level पर object lifecycle, garbage collection pressure, और unexpected side-effects से बचना सबसे महत्वपूर्ण होता है।`;
    } else if (diff === 'Advanced') {
      questionText = `High-concurrency systems में ${topic} के ${facet.subtopic} के runtime internals, thread-safety और race conditions का गहन विश्लेषण करें।`;
      explanation = `Advanced level पर event loop dispatch, atomic operations, cache locality, और lock contention को समझना अनिवार्य है।`;
    } else if (diff === 'Expert') {
      questionText = `Enterprise production scale पर ${topic} के ${facet.subtopic} के लिए zero-downtime, fault-tolerant architecture कैसे design करेंगे?`;
      explanation = `Expert engineers backpressure handling, circuit breaking, distributed consensus, और p99 latency guarantees को balance करते हैं।`;
    } else {
      questionText = `[Principal Architect Challenge] ${topic} के core runtime में ${facet.subtopic} से संबंधित subtle race condition या memory corruption को debug करने की संपूर्ण कार्यप्रणाली बताएं।`;
      explanation = `यह Staff-level प्रश्न hardware cache contention, formal verification, और low-level kernel profiling की समझ का मूल्यांकन करता है।`;
    }

    if (type === 'MCQ') {
      rawOptions = [
        `अनुमानित memory safety प्रदान करता है और modular separation of concerns सुनिश्चित करता है`,
        `Error handling की आवश्यकता को पूर्णतः समाप्त कर देता है`,
        `Runtime type verification को पूरी तरह bypass करता है`,
        `केवल legacy single-threaded architectures के लिए प्रयोग किया जाता है`
      ];
      const hindiOptionSets = [
        rawOptions,
        [
          `Structured lifecycle management और resource cleanup सुनिश्चित करता है`,
          `सभी exceptions को silently ignore कर देता है`,
          `Infinite loops के माध्यम से CPU utilization बढ़ाता है`,
          `सिर्फ read-only applications में काम आता है`
        ],
        [
          `Efficient caching strategy से response time में सुधार होता है`,
          `Database connections को कभी close नहीं करता`,
          `User input को बिना validation के directly execute करता है`,
          `सभी data को single global variable में store करता है`
        ]
      ];
      rawOptions = hindiOptionSets[seedHash % hindiOptionSets.length];
      rawCorrectAnswer = rawOptions[0];
    } else if (type === 'Coding') {
      codeSnippet = `// ${topic} - प्रश्न #${num} (${diff})\n// ${facet.subtopic} के लिए कार्यक्षम algorithm लिखें\nfunction optimizeWorkflow(data) {\n  // Expected: O(N) time, O(1) space\n  return null;\n}`;
    }
  }

  // ── Hinglish Generation (Roman Hindi + English Terms) ─────────────────────
  else {
    if (diff === 'Beginner') {
      questionText = `${topic} me ${facet.subtopic} ka basic purpose kya hai aur isko real-world projects me kab use karte hain?`;
      explanation = `${topic} me ye fundamental building block hai. Isse code structured, predictable aur clean banta hai.`;
    } else if (diff === 'Intermediate') {
      questionText = `${topic} me ${facet.subtopic} use karte waqt memory leaks aur state mutation ke issues ko kaise prevent karte hain?`;
      explanation = `Intermediate level par lifecycle hooks, resource cleanup aur unexpected side-effects se bachna sabse critical hota hai.`;
    } else if (diff === 'Advanced') {
      questionText = `${topic} ke underlying engine me ${facet.subtopic} kaise execute hota hai? Iske thread safety aur race conditions ko kaise tackle karein?`;
      explanation = `Advanced level par developers ko atomic primitives, lock contention aur CPU cache locality ka deep understanding hona zaroori hai.`;
    } else if (diff === 'Expert') {
      questionText = `Production systems me million queries/sec ke load par ${topic} ke ${facet.subtopic} ke liye zero-downtime scalable architecture kaise design karoge?`;
      explanation = `Expert level par distributed locks, partition tolerance, backpressure aur p99 latency SLAs sabse zaroori criteria hote hain.`;
    } else {
      questionText = `[Interview Challenge] ${topic} ke production runtime me rare deadlock ya subtle race condition ko debug aur resolve karne ka step-by-step strategy kya hoga?`;
      explanation = `Staff-level challenge: eBPF profiling, hardware memory fences aur deterministic reproduction suites ke bina is issue ko tackle nahi kiya ja sakta.`;
    }

    if (type === 'MCQ') {
      rawOptions = [
        `Modular structure provide karta hai aur memory isolation ke boundaries enforce karta hai`,
        `Error handling ki zaroorat ko completely khatam kar deta hai`,
        `Runtime checks ko bypass karke unsafe pointer access allow karta hai`,
        `Sirf legacy single-threaded scripts ke liye relevant hai`
      ];
      const hinglishOptionSets = [
        rawOptions,
        [
          `Clean resource management aur proper lifecycle hooks implement karta hai`,
          `Sabhi errors ko catch karke silently swallow kar deta hai`,
          `Thread safety ko completely ignore karke shared state access karta hai`,
          `Sirf small-scale hobby projects ke liye useful hai`
        ],
        [
          `Lazy evaluation se memory consumption minimize karta hai`,
          `Har request par naya database connection create karta hai`,
          `User input ko bina sanitize kiye directly query me inject karta hai`,
          `Poori application ko ek single file me likhta hai`
        ]
      ];
      rawOptions = hinglishOptionSets[seedHash % hinglishOptionSets.length];
      rawCorrectAnswer = rawOptions[0];
    } else if (type === 'Coding') {
      codeSnippet = `// ${topic} - Question #${num} (${diff})\n// ${facet.subtopic} ke liye optimized solution implement karo\nfunction handleExecution(input) {\n  // Target: O(N) time, O(1) space\n  return null;\n}`;
    }
  }

  // Handle MCQ balance and answer resolution
  let finalOptions: string[] = [];
  let finalCorrectAnswer = '';

  if (type === 'MCQ') {
    const balanced = balanceAndShuffleMcqOptions(rawOptions, rawCorrectAnswer, targetSlot);
    finalOptions = balanced.options;
    finalCorrectAnswer = balanced.correctAnswer;
  } else {
    finalOptions = [];
    finalCorrectAnswer = isHindi
      ? `विस्तृत तकनीकी समाधान के लिए नीचे दी गई व्याख्या देखें।`
      : isHinglish
      ? `Detailed concept aur implementation ke liye neeche explanation dekhein.`
      : `See comprehensive technical explanation below for complete solution.`;
  }

  return {
    id: `q-${num}-${seed}-${Math.random().toString(36).substring(2, 7)}`,
    number: num,
    question: questionText,
    difficulty: diff,
    type,
    options: finalOptions,
    correctAnswer: finalCorrectAnswer,
    explanation,
    tags: [topic, diff, facet.pillar.split(' ')[0]],
    expectedConcept,
    codeSnippet
  };
}

function generateFallbackDeepDive(question: Question, topic: string, lang: ResponseLanguage) {
  const isHindi = lang === 'Hindi';
  const isHinglish = lang === 'Hinglish';

  if (isHindi) {
    return {
      deepDiveExplanation: `यह प्रश्न ${topic} के ${question.expectedConcept || 'core fundamentals'} को गहराई से जांचता है।\n\n1. मुख्य अवधारणा: वास्तविक systems में यह concept memory footprint और execution throughput पर सीधा प्रभाव डालता है।\n2. Practical Architecture: Enterprise applications में clean interfaces और separation of concerns सुनिश्चित करने के लिए इसे standard patterns के साथ implement किया जाता है।\n3. Edge Cases: Concurrency, asynchronous state changes, और null/boundary conditions का विशेष ध्यान रखें।`,
      codeExample: `// ${topic} - Production Implementation Example\nclass SystemManager {\n  constructor(config) {\n    this.config = config;\n    this.initialized = false;\n  }\n\n  async executeOperation(payload) {\n    if (!this.initialized) await this.initialize();\n    // Optimized processing pipeline\n    return { status: 'success', data: payload };\n  }\n}`,
      interviewTips: [
        'Interviewer को पहले problem statement का high-level summary बताएं',
        'Time और Space complexity को explicitly calculate करके बताएं',
        'Production grade failure recovery और telemetry logging का उल्लेख करें'
      ],
      commonMistakes: [
        'Boundary edge cases (empty collections, null pointers) को नजरअंदाज करना',
        'Premature optimization करना बिना bottlenecks को profile किए'
      ]
    };
  }

  if (isHinglish) {
    return {
      deepDiveExplanation: `Ye question ${topic} ke ${question.expectedConcept || 'core concept'} ko test karta hai.\n\n1. Core Logic: Jab hum scale par code likhte hain, to resource management aur predictability sabse important hoti hai.\n2. Best Practice: Direct tightly-coupled logic likhne ke bajaye modular approach use karein taaki testing aur debugging simple ho jaye.\n3. Interview Strategy: Pehle brute-force solution mention karein fir batayein ki kaise time/space complexity improve ho sakti hai.`,
      codeExample: `// ${topic} - Clean Code Pattern\nconst processWorkflow = async (dataStream) => {\n  try {\n    // Validate input schema\n    const validated = validate(dataStream);\n    // Process in batches for low memory consumption\n    return await batchHandler(validated);\n  } catch (error) {\n    logger.error('Pipeline failed:', error);\n    throw error;\n  }\n};`,
      interviewTips: [
        'Confidence ke sath trade-offs explain karein (Memory vs Speed)',
        'Mention karein ki kaise ye pattern enterprise architecture me fit hota hai',
        'Real-world debugging scenarios jaise memory leaks ko discuss karein'
      ],
      commonMistakes: [
        'Sirf theory bolna bina runtime mechanism samjhaye',
        'Concurrency aur race conditions ko ignore kar dena'
      ]
    };
  }

  return {
    deepDiveExplanation: `This question evaluates comprehensive mastery over ${topic} with a focus on ${question.expectedConcept || 'system design and runtime execution'}.\n\n1. Theoretical Foundation: Under the hood, modern execution environments optimize this pathway through JIT/AOT compilation, efficient register allocation, and minimizing memory indirection.\n2. Production Architecture: In high-scale services, failing to adhere to proper isolation and lifecycle hygiene causes memory leaks, lock contention, or cascading failovers.\n3. Resiliency & Telemetry: Always design defensive boundaries with circuit-breakers and exponential backoff retry policies when handling remote or asynchronous boundaries.`,
    codeExample: `// Production-Grade ${topic} Pattern\nexport class EnterpriseService {\n  private readonly cache = new Map<string, unknown>();\n\n  public async executeSafe<T>(key: string, compute: () => Promise<T>): Promise<T> {\n    if (this.cache.has(key)) {\n      return this.cache.get(key) as T;\n    }\n    const result = await compute();\n    this.cache.set(key, result);\n    return result;\n  }\n}`,
    interviewTips: [
      'Clarify constraints and scale parameters before presenting the architectural solution',
      'Articulate p99 latency trade-offs and thread-safety invariants',
      'Provide concrete examples from past production incidents or benchmarks'
    ],
    commonMistakes: [
      'Assuming single-threaded execution guarantees in distributed or multi-worker systems',
      'Overlooking connection pooling, file descriptor exhaustion, or unhandled promise rejections'
    ]
  };
}
