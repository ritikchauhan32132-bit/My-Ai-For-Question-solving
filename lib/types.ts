export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' | 'Challenge';

export type QuestionType = 'Interview' | 'MCQ' | 'Coding' | 'Conceptual' | 'Mixed';

export type ResponseLanguage = 'English' | 'Hindi' | 'Hinglish';

export interface Question {
  id: string;
  number: number;
  question: string;
  difficulty: DifficultyLevel;
  type: 'Interview' | 'MCQ' | 'Coding' | 'Conceptual';
  options?: string[]; // 4 options for MCQ
  correctAnswer?: string;
  explanation: string;
  tags: string[];
  codeSnippet?: string;
  expectedConcept?: string; // For coding / conceptual
}

export interface QuestionSet {
  id: string;
  topic: string;
  createdAt: string;
  difficultyMode: string;
  typeMode: QuestionType;
  language: ResponseLanguage;
  isAiGenerated: boolean;
  questions: Question[];
}

export interface GenerateRequest {
  topic: string;
  difficultyMode?: string;
  typeMode?: QuestionType;
  preferredLanguage?: ResponseLanguage;
  seed?: string | number;
}

export interface ExplainRequest {
  question: Question;
  topic: string;
  language?: ResponseLanguage;
}

export interface RegenerateRequest {
  topic: string;
  number: number;
  difficulty: DifficultyLevel;
  type: 'Interview' | 'MCQ' | 'Coding' | 'Conceptual';
  language?: ResponseLanguage;
  existingQuestionsSummary?: string[];
}
