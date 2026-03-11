import { GoogleGenAI, Type } from "@google/genai";

let aiClient: GoogleGenAI | null | undefined;

function getAIClient(): GoogleGenAI | null {
  if (aiClient !== undefined) return aiClient;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    aiClient = null;
    return aiClient;
  }

  try {
    aiClient = new GoogleGenAI({ apiKey });
  } catch (error) {
    console.error("Gemini client initialization failed:", error);
    aiClient = null;
  }

  return aiClient;
}

export async function suggestSubtasks(taskText: string) {
  const ai = getAIClient();
  if (!ai) return [];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a productivity expert. Break down the following task into 3-5 clear, actionable subtasks: "${taskText}". 
      Return the subtasks as a simple JSON array of strings.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    
    const text = response.text;
    return JSON.parse(text) as string[];
  } catch (error) {
    console.error("Failed to suggest subtasks:", error);
    return [];
  }
}
