import * as pdfjsLib from 'pdfjs-dist';
import { GoogleGenerativeAI } from "@google/generative-ai";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const genAI = new GoogleGenerativeAI("PASTE_YOUR_GEMINI_KEY_HERE");

export const processPDF = async (file: File): Promise<any[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => (item as any).str).join(' ');
    fullText += `\n[Page ${i}]\n${pageText}`;
  }

  if (!fullText.trim()) {
    throw new Error("This PDF appears to be scanned or contains no extractable text. Try uploading an image instead.");
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const prompt = `
    Extract all tabular data from this text and convert it to a JSON array of objects.
    Each row should be an object with column names as keys.
    If no table exists, extract key-value pairs as structured data.
    Return ONLY a valid JSON array, no markdown, no explanation.
    Text: ${fullText.slice(0, 30000)}
  `;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const cleanJson = text.replace(/```json|```/g, '').trim();

  try {
    const data = JSON.parse(cleanJson);
    if (!Array.isArray(data)) throw new Error("Invalid format received from AI");
    return data;
  } catch (error) {
    console.error("[InsightIQ PDF] Extraction Error:", error);
    throw new Error("Could not extract structured data from PDF. Ensure it contains a clear table.");
  }
};
