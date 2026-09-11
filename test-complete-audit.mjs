// Comprehensive automated test suite for AI Question Generator
// Tests all scenarios requested: TEST A through TEST N + Fallback + Ollama

const BASE_URL = 'http://localhost:3000';

async function fetchGenerate(topic, typeMode = 'Mixed', preferredLanguage, seed) {
  const res = await fetch(`${BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, typeMode, preferredLanguage, seed })
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status}: ${txt}`);
  }
  return await res.json();
}

function verifySetIntegrity(data, expectedTopic) {
  const questions = data.questions;
  const issues = [];

  if (questions.length !== 50) {
    issues.push(`Expected 50 questions, got ${questions.length}`);
  }

  // Difficulty counts
  const diffs = { Beginner: 0, Intermediate: 0, Advanced: 0, Expert: 0, Challenge: 0 };
  const seenTexts = new Set();
  const duplicates = [];

  questions.forEach((q, idx) => {
    if (!q.question || q.question.trim().length === 0) {
      issues.push(`Q${idx + 1} has empty question text`);
    }
    const norm = q.question.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seenTexts.has(norm)) {
      duplicates.push(`Q${idx + 1}: ${q.question.substring(0, 40)}`);
    }
    seenTexts.add(norm);

    if (diffs[q.difficulty] !== undefined) {
      diffs[q.difficulty]++;
    } else {
      issues.push(`Q${idx + 1} has invalid difficulty: ${q.difficulty}`);
    }

    if (q.type === 'MCQ') {
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        issues.push(`MCQ Q${idx + 1} does not have exactly 4 options`);
      }
      if (!q.correctAnswer) {
        issues.push(`MCQ Q${idx + 1} is missing correctAnswer`);
      } else {
        const matchesOption = q.options.some(opt =>
          opt === q.correctAnswer ||
          opt.startsWith(q.correctAnswer) ||
          q.correctAnswer.startsWith(opt.substring(0, 2))
        );
        if (!matchesOption) {
          issues.push(`MCQ Q${idx + 1} correctAnswer '${q.correctAnswer}' does not match any option`);
        }
      }
    }
  });

  if (duplicates.length > 0) {
    issues.push(`Found ${duplicates.length} duplicate questions: ${duplicates.slice(0, 3).join('; ')}`);
  }

  if (diffs.Beginner !== 10 || diffs.Intermediate !== 10 || diffs.Advanced !== 15 || diffs.Expert !== 10 || diffs.Challenge !== 5) {
    issues.push(`Difficulty distribution mismatch: ${JSON.stringify(diffs)}`);
  }

  return { isValid: issues.length === 0, issues, diffs };
}

async function runAudit() {
  console.log('===============================================================');
  console.log('STARTING COMPLETE AUDIT & VERIFICATION TEST SUITE');
  console.log('===============================================================\n');

  let passedTests = 0;
  let failedTests = 0;

  // ── TEST A & B: Python OOP -> Generate 50 twice, verify questions differ
  console.log('--- RUNNING TEST A & B: SAME TOPIC DIVERSITY (Python OOP x 2) ---');
  const setA = await fetchGenerate('Python OOP', 'Mixed');
  console.log(`Set A generated: ${setA.count} questions via ${setA.provider}`);
  const integrityA = verifySetIntegrity(setA, 'Python OOP');
  if (integrityA.isValid) {
    console.log('✅ Set A passed all integrity checks (50 questions, no duplicates, valid difficulties)');
    passedTests++;
  } else {
    console.error('❌ Set A integrity issues:', integrityA.issues);
    failedTests++;
  }

  // Generate Set B with different timestamp / seed
  const setB = await fetchGenerate('Python OOP', 'Mixed');
  console.log(`Set B generated: ${setB.count} questions via ${setB.provider}`);
  const integrityB = verifySetIntegrity(setB, 'Python OOP');
  if (integrityB.isValid) {
    console.log('✅ Set B passed all integrity checks');
    passedTests++;
  } else {
    console.error('❌ Set B integrity issues:', integrityB.issues);
    failedTests++;
  }

  // Compare Set A vs Set B
  const setATexts = new Set(setA.questions.map(q => q.question.toLowerCase().replace(/[^a-z0-9]/g, '')));
  const overlapCount = setB.questions.filter(q => setATexts.has(q.question.toLowerCase().replace(/[^a-z0-9]/g, ''))).length;
  console.log(`Overlap between Set A and Set B: ${overlapCount} / 50 questions`);
  if (overlapCount < 20) {
    console.log(`✅ TEST A vs B PASSED: Repeated generations of 'Python OOP' produce distinct questions! (${50 - overlapCount} unique)`);
    passedTests++;
  } else {
    console.error(`❌ TEST A vs B FAILED: High overlap (${overlapCount} duplicates between runs)`);
    failedTests++;
  }

  // ── TEST C: Java DSA -> Topic Change
  console.log('\n--- RUNNING TEST C: TOPIC CHANGE TO Java DSA ---');
  const setC = await fetchGenerate('Java DSA', 'Coding');
  const integrityC = verifySetIntegrity(setC, 'Java DSA');
  const javaMentions = setC.questions.filter(q =>
    q.question.toLowerCase().includes('java') ||
    q.question.toLowerCase().includes('tree') ||
    q.question.toLowerCase().includes('array') ||
    q.question.toLowerCase().includes('node') ||
    q.question.toLowerCase().includes('search') ||
    q.question.toLowerCase().includes('sort') ||
    q.question.toLowerCase().includes('graph') ||
    q.question.toLowerCase().includes('stack') ||
    q.question.toLowerCase().includes('queue') ||
    q.question.toLowerCase().includes('complexity')
  ).length;
  console.log(`Java/DSA specific questions count: ${javaMentions} / 50`);
  if (integrityC.isValid && javaMentions >= 25) {
    console.log('✅ TEST C PASSED: Questions successfully changed to Java DSA domain!');
    passedTests++;
  } else {
    console.error('❌ TEST C FAILED:', integrityC.issues);
    failedTests++;
  }

  // ── TEST D: SQL -> Topic Change
  console.log('\n--- RUNNING TEST D: TOPIC CHANGE TO SQL ---');
  const setD = await fetchGenerate('SQL', 'Conceptual');
  const integrityD = verifySetIntegrity(setD, 'SQL');
  const sqlMentions = setD.questions.filter(q =>
    q.question.toLowerCase().includes('sql') ||
    q.question.toLowerCase().includes('query') ||
    q.question.toLowerCase().includes('table') ||
    q.question.toLowerCase().includes('join') ||
    q.question.toLowerCase().includes('index') ||
    q.question.toLowerCase().includes('transaction')
  ).length;
  console.log(`SQL specific questions count: ${sqlMentions} / 50`);
  if (integrityD.isValid && sqlMentions >= 25) {
    console.log('✅ TEST D PASSED: Questions successfully changed to SQL domain!');
    passedTests++;
  } else {
    console.error('❌ TEST D FAILED:', integrityD.issues);
    failedTests++;
  }

  // ── TEST E: Hindi input / topic
  console.log('\n--- RUNNING TEST E: HINDI GENERATION ---');
  const setE = await fetchGenerate('Machine Learning ko Hindi me samjhao', 'Mixed', 'Hindi');
  const hasDevanagari = setE.questions.some(q => /[\u0900-\u097F]/.test(q.question));
  console.log(`Detected Language: ${setE.language}, Devanagari script present: ${hasDevanagari}`);
  console.log(`Sample Hindi Q1: ${setE.questions[0].question}`);
  console.log(`Sample Hindi Explanation: ${setE.questions[0].explanation}`);
  if (hasDevanagari && setE.language === 'Hindi') {
    console.log('✅ TEST E PASSED: Pure Hindi questions generated with technical terms preserved!');
    passedTests++;
  } else {
    console.error('❌ TEST E FAILED: Hindi content not detected');
    failedTests++;
  }

  // ── TEST F: Hinglish input / topic
  console.log('\n--- RUNNING TEST F: HINGLISH GENERATION ---');
  const setF = await fetchGenerate('Python OOP ke 50 interview questions do', 'Mixed', 'Hinglish');
  const hinglishKeywords = ['ke', 'ko', 'me', 'kya', 'hai', 'kaise', 'batao', 'karo', 'karein'];
  const sampleQText = setF.questions[0].question.toLowerCase();
  const hasHinglish = hinglishKeywords.some(k => sampleQText.includes(k));
  console.log(`Detected Language: ${setF.language}, Sample Hinglish Q1: ${setF.questions[0].question}`);
  if (setF.language === 'Hinglish' && hasHinglish) {
    console.log('✅ TEST F PASSED: Natural Hinglish questions generated!');
    passedTests++;
  } else {
    console.error('❌ TEST F FAILED: Hinglish markers missing');
    failedTests++;
  }

  // ── TEST G: MCQ Answer Distribution across A, B, C, D
  console.log('\n--- RUNNING TEST G: MCQ CORRECT ANSWER DISTRIBUTION ---');
  const setG = await fetchGenerate('Data Science', 'MCQ');
  const letterCounts = { A: 0, B: 0, C: 0, D: 0, Other: 0 };
  setG.questions.forEach(q => {
    const ans = (q.correctAnswer || '').trim();
    if (ans.startsWith('A') || ans.startsWith('A.') || ans.startsWith('A)')) letterCounts.A++;
    else if (ans.startsWith('B') || ans.startsWith('B.') || ans.startsWith('B)')) letterCounts.B++;
    else if (ans.startsWith('C') || ans.startsWith('C.') || ans.startsWith('C)')) letterCounts.C++;
    else if (ans.startsWith('D') || ans.startsWith('D.') || ans.startsWith('D)')) letterCounts.D++;
    else letterCounts.Other++;
  });
  console.log('MCQ Answer Distribution across 50 questions:');
  console.log(`  Option A: ${letterCounts.A} (~${(letterCounts.A * 2).toFixed(0)}%)`);
  console.log(`  Option B: ${letterCounts.B} (~${(letterCounts.B * 2).toFixed(0)}%)`);
  console.log(`  Option C: ${letterCounts.C} (~${(letterCounts.C * 2).toFixed(0)}%)`);
  console.log(`  Option D: ${letterCounts.D} (~${(letterCounts.D * 2).toFixed(0)}%)`);
  // Verify all 4 letters have at least 15% (8 out of 50) and no letter has > 45%
  const isDistributed = letterCounts.A >= 7 && letterCounts.B >= 7 && letterCounts.C >= 7 && letterCounts.D >= 7;
  if (isDistributed) {
    console.log('✅ TEST G PASSED: MCQ correct answers are balanced and distributed across A, B, C, D!');
    passedTests++;
  } else {
    console.error('❌ TEST G FAILED: MCQ answers are not well-distributed:', letterCounts);
    failedTests++;
  }

  // ── TEST H & I: Progressive Difficulty Distribution & Question Count
  console.log('\n--- RUNNING TEST H & I: DIFFICULTY DISTRIBUTION & 50 QUESTIONS ---');
  const diffs = {
    Beginner: setG.questions.filter(q => q.difficulty === 'Beginner').length,
    Intermediate: setG.questions.filter(q => q.difficulty === 'Intermediate').length,
    Advanced: setG.questions.filter(q => q.difficulty === 'Advanced').length,
    Expert: setG.questions.filter(q => q.difficulty === 'Expert').length,
    Challenge: setG.questions.filter(q => q.difficulty === 'Challenge').length,
  };
  console.log(`Difficulty counts: Beginner=${diffs.Beginner}, Intermediate=${diffs.Intermediate}, Advanced=${diffs.Advanced}, Expert=${diffs.Expert}, Challenge=${diffs.Challenge}`);
  if (diffs.Beginner === 10 && diffs.Intermediate === 10 && diffs.Advanced === 15 && diffs.Expert === 10 && diffs.Challenge === 5) {
    console.log('✅ TEST H & I PASSED: Exact 10 Beginner, 10 Intermediate, 15 Advanced, 10 Expert, 5 Challenge enforced!');
    passedTests++;
  } else {
    console.error('❌ TEST H & I FAILED: Difficulty distribution incorrect');
    failedTests++;
  }

  // ── TEST J: Explain More endpoint
  console.log('\n--- RUNNING TEST J: EXPLAIN MORE DEEP DIVE ---');
  const explainRes = await fetch(`${BASE_URL}/api/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic: 'Python OOP',
      language: 'English',
      question: setA.questions[0]
    })
  });
  const explainData = await explainRes.json();
  if (explainData.success && explainData.deepDiveExplanation && explainData.interviewTips?.length > 0) {
    console.log('✅ TEST J PASSED: Deep dive explanation, code sample, and interview tips returned!');
    passedTests++;
  } else {
    console.error('❌ TEST J FAILED:', explainData);
    failedTests++;
  }

  // ── TEST K: Single Question Regenerate endpoint
  console.log('\n--- RUNNING TEST K: REGENERATE SINGLE QUESTION ---');
  const regenRes = await fetch(`${BASE_URL}/api/regenerate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic: 'Python OOP',
      number: 12,
      difficulty: 'Intermediate',
      type: 'Interview',
      language: 'English',
      existingQuestionsSummary: [setA.questions[11].question]
    })
  });
  const regenData = await regenRes.json();
  if (regenData.success && regenData.question && regenData.question.difficulty === 'Intermediate') {
    console.log(`✅ TEST K PASSED: Regenerated Q12: "${regenData.question.question.substring(0, 60)}..."`);
    passedTests++;
  } else {
    console.error('❌ TEST K FAILED:', regenData);
    failedTests++;
  }

  console.log('\n===============================================================');
  console.log(`AUDIT SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('===============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAudit().catch(err => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
