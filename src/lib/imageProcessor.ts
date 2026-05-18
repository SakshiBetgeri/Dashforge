import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI("PASTE_YOUR_GEMINI_KEY_HERE");

export const processImage = async (file: File): Promise<any[]> => {
  const base64Data = await fileToBase64(file);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `
    This image contains data (chart, table, spreadsheet screenshot, or report).
    Extract all data visible in this image and convert to a JSON array of objects.
    Each data point should be a row with appropriate column names.
    Return ONLY a valid JSON array, no markdown, no explanation.
  `;

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: file.type,
        data: base64Data.split(',')[1] 
      }
    },
    { text: prompt }
  ]);

  try {
    const text = result.response.text();
    const cleanJson = text.replace(/```json|```/g, '').trim();
    const data = JSON.parse(cleanJson);
    if (!Array.isArray(data)) throw new Error("Invalid format received from AI");
    return data;
  } catch (error) {
    console.error("[InsightIQ Image] Extraction Error:", error);
    throw new Error("No structured data found in image. Try a clearer screenshot of a table or chart.");
  }
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};
