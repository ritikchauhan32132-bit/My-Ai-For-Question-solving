// Test Ollama directly on llama3.1 for English, Hindi, Hinglish, and Advanced technical questions
const OLLAMA_BASE_URL = 'http://localhost:11434';
const MODEL = 'llama3.1';

async function testPrompt(testName, languageGuide, userTopic, typeMode = 'Mixed') {
  console.log(`\n========================================`);
  console.log(`RUNNING TEST: ${testName}`);
  console.log(`Topic: "${userTopic}"`);
  console.log(`========================================`);

  const systemPrompt = `You are a Principal Technical Interviewer and Question Architect.
Generate 5 unique, high-quality questions for the topic: "${userTopic}".
Starting question number: 1, ending question number: 5.

Difficulty Progression:
Numbers 1 to 2: Intermediate. Numbers 3 to 4: Advanced. Number 5: Expert / Challenging.

Question Types Mode: ${typeMode}

${languageGuide}

STRICT JSON FORMAT:
Return a valid JSON object with a "questions" array of 5 objects. Each object must have:
{
  "number": number,
  "difficulty": "Beginner" | "Intermediate" | "Advanced" | "Expert",
  "type": "Interview" | "MCQ" | "Coding" | "Conceptual",
  "question": "Clear specific question text",
  "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
  "correctAnswer": "The correct answer",
  "explanation": "Detailed explanation",
  "tags": ["tag1", "tag2"],
  "expectedConcept": "Core concept being tested",
  "codeSnippet": "Code or empty string"
}
Do NOT include markdown backticks or any explanation outside JSON.`;

  const startTime = Date.now();
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        system: systemPrompt,
        prompt: `Generate 5 questions about "${userTopic}".`,
        stream: false,
        format: 'json',
        options: {
          temperature: 0.7,
          num_predict: 2500
        }
      })
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    if (!res.ok) {
      console.error(`Ollama error (${res.status}):`, await res.text());
      return { success: false, error: res.statusText };
    }

    const jsonRes = await res.json();
    const rawOutput = jsonRes.response;
    let parsed;
    try {
      parsed = JSON.parse(rawOutput);
    } catch (e) {
      console.error('Failed to parse JSON:', e.message);
      return { success: false, raw: rawOutput };
    }

    const questions = parsed.questions || parsed.data || (Array.isArray(parsed) ? parsed : []);
    console.log(`Generated ${questions.length} questions in ${elapsed}s.`);
    
    questions.forEach((q, i) => {
      console.log(`\n[Q${q.number || i + 1}] (${q.difficulty} - ${q.type})`);
      console.log(`Q: ${q.question}`);
      if (q.options && q.options.length > 0) {
        console.log(`Options: ${JSON.stringify(q.options)}`);
      }
      console.log(`Ans: ${q.correctAnswer}`);
      console.log(`Explanation: ${q.explanation?.substring(0, 140)}...`);
      if (q.codeSnippet) {
        console.log(`Code snippet present (${q.codeSnippet.length} chars)`);
      }
    });

    return {
      success: true,
      count: questions.length,
      elapsed,
      sampleQuestion: questions[0]?.question,
      sampleExplanation: questions[0]?.explanation,
      questions
    };
  } catch (err) {
    console.error(`Test ${testName} failed:`, err.message);
    return { success: false, error: err.message };
  }
}

async function runAllTests() {
  console.log('Starting Ollama (llama3.1:latest) Quality Evaluation...\n');

  // Test 1: English - React Server Components & Performance
  const test1 = await testPrompt(
    'English Technical (React & Next.js Performance)',
    'OUTPUT LANGUAGE: Professional, crisp, idiomatic English.',
    'React Server Components & Next.js App Router Architecture'
  );

  // Test 2: Hindi - Core Programming & Data Structures
  const test2 = await testPrompt(
    'Hindi (Data Structures & Algorithms)',
    'OUTPUT LANGUAGE: Pure Hindi (Devanagari script or conversational Hindi). Keep technical words like "Array", "Linked List", "Tree", "Binary Search", "Time Complexity", "Recursion" in English or standard technical terminology.',
    'Binary Search Tree aur Time Complexity'
  );

  // Test 3: Hinglish - Python & Backend Concepts
  const test3 = await testPrompt(
    'Hinglish (Python Web Backend)',
    'OUTPUT LANGUAGE: Natural Hinglish (Hindi written in Roman script mixed with English). Example: "Class aur Object ke beech me kya difference hota hai?". Keep technical terms in English.',
    'Python Asyncio aur FastAPI concurrency'
  );

  // Test 4: Advanced Systems - Distributed Systems & Fault Tolerance
  const test4 = await testPrompt(
    'Advanced / Expert (Distributed Systems)',
    'OUTPUT LANGUAGE: Professional, highly technical English for Senior/Staff Engineer interviews.',
    'Distributed Transactions, 2PC, Saga Pattern and Raft Consensus'
  );

  console.log('\n========================================');
  console.log('ALL TESTS COMPLETED');
  console.log('========================================');
}

runAllTests();
