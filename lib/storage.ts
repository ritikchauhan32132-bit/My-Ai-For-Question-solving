import { Question, QuestionSet } from './types';

const STORAGE_KEYS = {
  SAVED_SETS: 'ai_qgen_saved_sets',
  BOOKMARKS: 'ai_qgen_bookmarks',
};

export function getSavedQuestionSets(): QuestionSet[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SAVED_SETS);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to load saved sets:', err);
    return [];
  }
}

export function saveQuestionSet(set: QuestionSet): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getSavedQuestionSets();
    // Prepend new set, keep maximum 20 sets
    const updated = [set, ...existing.filter(s => s.id !== set.id)].slice(0, 20);
    localStorage.setItem(STORAGE_KEYS.SAVED_SETS, JSON.stringify(updated));
  } catch (err: any) {
    // BUG 12 fix: handle localStorage quota exceeded
    if (err?.name === 'QuotaExceededError' || err?.code === 22) {
      console.warn('localStorage quota exceeded — pruning oldest saved sets...');
      try {
        const existing = getSavedQuestionSets();
        // Keep only the 5 most recent sets to free space
        const pruned = [set, ...existing.filter(s => s.id !== set.id)].slice(0, 5);
        localStorage.setItem(STORAGE_KEYS.SAVED_SETS, JSON.stringify(pruned));
      } catch (retryErr) {
        console.error('Failed to save set even after pruning:', retryErr);
      }
    } else {
      console.error('Failed to save set:', err);
    }
  }
}

export function deleteSavedSet(setId: string): QuestionSet[] {
  if (typeof window === 'undefined') return [];
  try {
    const existing = getSavedQuestionSets();
    const updated = existing.filter(s => s.id !== setId);
    localStorage.setItem(STORAGE_KEYS.SAVED_SETS, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to delete set:', err);
    return [];
  }
}

export function getBookmarkedQuestions(): Question[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to load bookmarks:', err);
    return [];
  }
}

export function toggleBookmarkQuestion(question: Question): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const bookmarks = getBookmarkedQuestions();
    const isBookmarked = bookmarks.some(b => b.id === question.id || (b.number === question.number && b.question === question.question));
    let updated: Question[];

    if (isBookmarked) {
      updated = bookmarks.filter(b => b.id !== question.id && !(b.number === question.number && b.question === question.question));
    } else {
      updated = [question, ...bookmarks];
    }

    localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(updated));
    return !isBookmarked;
  } catch (err) {
    console.error('Failed to toggle bookmark:', err);
    return false;
  }
}

export function isQuestionBookmarked(question: Question): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const bookmarks = getBookmarkedQuestions();
    return bookmarks.some(b => b.id === question.id || (b.number === question.number && b.question === question.question));
  } catch {
    return false;
  }
}
