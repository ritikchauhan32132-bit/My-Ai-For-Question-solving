// Comprehensive Quality Evaluation for Ollama
// Tests English, Hindi, Hinglish, Advanced Questions & Deep Dive

const OLLAMA_BASE_URL = 'http://localhost:11434';

export async function runTestOnModel(modelName) {
  console.log(`\n======================================================`);
  console.log(`EVALUATING MODEL: ${modelName}`);
  console.log(`======================================================\n`);

  const tests = [
    {
      id: 'TEST 1: English Technical (React / Next.js)',
      topic: 'React Server Components and Suspense streaming',
      system: 'You are a Principal Software Engineer. Always output valid JSON only.',
      prompt: `Generate 1 Intermediate question for topic: "React Server Components and Suspense streaming".
Type: MCQ
OUTPUT LANGUAGE: Professional, crisp, idiomatic English.

STRICT JSON:
{
  "question": "Question text",
  "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
  "correctAnswer": "A",
  "explanation": "Detailed 2-3 sentence explanation",
  "tags": ["React", "Performance"],
  "expectedConcept": "Streaming SSR",
  "codeSnippet": ""
}`
    },
    {
      id: 'TEST 2: Hindi (Data Structures & Algorithms)',
      topic: 'Binary Search Tree aur Time Complexity',
      system: 'You are a Principal Technical Interviewer. Always output valid JSON only.',
      prompt: `Generate 1 question for topic: "Binary Search Tree aur Time Complexity".
Type: Conceptual
OUTPUT LANGUAGE: Pure Hindi (Devanagari script or conversational Hindi). Keep technical words like "Binary Search Tree", "Time Complexity", "Worst Case", "Balanced Tree", "O(log n)", "O(n)" in English.

STRICT JSON:
{
  "question": "Question text in Hindi",
  "correctAnswer": "Answer in Hindi",
  "explanation": "Explanation in Hindi",
  "tags": ["Tree", "Hindi"],
  "expectedConcept": "BST Time Complexity"
}`
    },
    {
      id: 'TEST 3: Hinglish (Python & Concurrency)',
      topic: 'Python Asyncio aur FastAPI',
      system: 'You are a Senior Tech Lead. Always output valid JSON only.',
      prompt: `Generate 1 question for topic: "Python Asyncio aur FastAPI".
Type: Interview
OUTPUT LANGUAGE: Natural Hinglish (Hindi written in Roman script mixed with English). Example: "Asyncio event loop kaise kaam karta hai aur sync blocking code ko kaise handle karein?".

STRICT JSON:
{
  "question": "Question text in Hinglish",
  "correctAnswer": "Answer in Hinglish",
  "explanation": "Explanation in Hinglish",
  "tags": ["Python", "Hinglish"],
  "expectedConcept": "Event Loop Blocking"
}`
    },
    {
      id: 'TEST 4: Advanced / Expert Systems',
      topic: 'Distributed Consensus and Raft Leader Election',
      system: 'You are a Staff Infrastructure Architect. Always output valid JSON only.',
      prompt: `Generate 1 Expert / Hard interview question for topic: "Distributed Consensus and Raft Leader Election".
Type: Coding
OUTPUT LANGUAGE: Professional English. Include codeSnippet demonstrating state handling or RPC.

STRICT JSON:
{
  "question": "Question text",
  "correctAnswer": "Detailed expert answer",
  "explanation": "Deep architectural explanation",
  "codeSnippet": "// sample code or interface",
  "tags": ["Distributed Systems", "Raft", "Expert"],
  "expectedConcept": "Split-brain and Term numbers"
}`
    },
    {
      id: 'TEST 5: Deep Dive Explanation',
      topic: 'Database Indexing (B-Tree vs LSM-Tree)',
      system: 'You are a Principal Database Engineer. Always output valid JSON only.',
      prompt: `Provide a deep dive explanation for:
Question: "Compare B-Tree and LSM-Tree write amplification and read latency in high-throughput databases."
Difficulty: "Expert"

STRICT JSON:
{
  "deepDiveExplanation": "Detailed explanation of write amplification and trade-offs",
  "interviewTips": ["Tip 1", "Tip 2"],
  "commonMistakes": ["Mistake 1", "Mistake 2"]
}`
    }
  ];

  const results = [];

  for (const t of tests) {
    console.log(`---> Running ${t.id}...`);
    const start = Date.now();
    try {
      const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          system: t.system,
          prompt: t.prompt,
          stream: false,
          format: 'json',
          options: {
            temperature: 0.7,
            num_predict: 800
          }
        })
      });

      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      if (!res.ok) {
        const errText = await res.text();
        console.error(`  FAIL (${elapsed}s): ${errText}`);
        results.push({ id: t.id, passed: false, error: errText, elapsed });
        continue;
      }

      const body = await res.json();
      let parsed;
      try {
        parsed = JSON.parse(body.response);
      } catch (e) {
        console.error(`  JSON PARSE ERROR:`, e.message);
        results.push({ id: t.id, passed: false, error: 'Malformed JSON', elapsed, raw: body.response });
        continue;
      }

      console.log(`  PASSED (${elapsed}s)`);
      console.log(`  Sample output:`, JSON.stringify(parsed, null, 2).substring(0, 300) + '...\n');
      results.push({ id: t.id, passed: true, elapsed, data: parsed });
    } catch (err) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.error(`  NETWORK ERROR (${elapsed}s):`, err.message);
      results.push({ id: t.id, passed: false, error: err.message, elapsed });
    }
  }

  console.log(`\n===== Summary for ${modelName} =====`);
  results.forEach(r => {
    console.log(`${r.passed ? '✅' : '❌'} ${r.id} (${r.elapsed}s) ${r.passed ? '' : `[Error: ${r.error}]`}`);
  });

  return results;
}

const targetModel = process.argv[2] || 'llama3.2';
runTestOnModel(targetModel);
