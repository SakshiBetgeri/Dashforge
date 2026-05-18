import { GoogleGenerativeAI } from "@google/generative-ai";
import { answerFromData } from './statsUtils';

const genAI = new GoogleGenerativeAI("PASTE_YOUR_GEMINI_KEY_HERE");

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const getChatResponse = async (
  userMessage: string,
  history: Message[],
  dataContext: { columns: any[], rows: any[], domain: string, summary: string }
) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const systemPrompt = `You are InsightIQ AI. Dataset: ${JSON.stringify(dataContext.columns.map(c=>c.name))} columns, ${dataContext.rows.length} rows. Sample: ${JSON.stringify(dataContext.rows.slice(0,5))}. Answer this question with specific numbers from the data: ${userMessage}`;

    const result = await model.generateContent(systemPrompt);
    return result.response.text();
  } catch (error) {
    console.warn('[InsightIQ Chat] Gemini failed, using statistical fallback', error);
    return answerFromData(userMessage, dataContext.columns, dataContext.rows);
  }
};
