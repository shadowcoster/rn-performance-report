import { OpenAI } from 'openai';

/**
 * Automates creating advanced interaction test files natively bridging an OpenAI pipeline
 */
export const generateAITest = async (summaryObject, apiKey) => {
  const openai = new OpenAI({ apiKey });

  const prompt = `You are a senior React Native developer.

Generate Jest + React Native Testing Library test cases.

Component Summary:
${JSON.stringify(summaryObject, null, 2)}

Requirements:
- Cover rendering
- Cover user interactions
- Mock Redux and navigation if needed
- Handle async logic if present

Return ONLY test code. Do not output markdown code blocks (e.g., \`\`\`tsx). Ensure your response is highly specific strictly adhering to React Testing Library standard implementations.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini', // using cost-optimized mini model 
    messages: [
      { role: 'system', content: prompt }
    ],
    temperature: 0.2
  });

  let rawTest = response.choices[0].message.content.trim();
  
  // Clean markdown remnants if OpenAI leaks formatting
  if (rawTest.startsWith('\`\`\`')) {
    rawTest = rawTest.replace(/^\`\`\`[a-zA-Z]*\n/, '').replace(/\n\`\`\`$/, '');
  }
  
  return rawTest;
};
