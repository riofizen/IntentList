import { GoogleGenAI, Type } from "@google/genai";
import { Priority } from "../types";
import { format } from "date-fns";

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

export interface AIParsedResult {
  text: string;
  date: string; // YYYY-MM-DD
  time: string | null; // HH:mm
  priority: Priority;
  tags: string[];
}

export async function parseWithAI(input: string, baseDate: Date = new Date()): Promise<AIParsedResult | null> {
  const ai = getAIClient();
  if (!ai) return null;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Parse this task: "${input}". 
      Current date: ${format(baseDate, 'yyyy-MM-dd EEEE')}.
      Return the task text (cleaned), date (YYYY-MM-DD), time (HH:mm or null), priority (high, normal, low), and any tags (words starting with @ or #, or contextually relevant tags like "work", "personal", "code").`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            date: { type: Type.STRING },
            time: { type: Type.STRING, nullable: true },
            priority: { type: Type.STRING, enum: ["high", "normal", "low"] },
            tags: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
          },
          required: ["text", "date", "priority", "tags"],
        },
      },
    });

    const result = JSON.parse(response.text || "{}");
    return {
      text: result.text || input,
      date: result.date || format(baseDate, 'yyyy-MM-dd'),
      time: result.time || null,
      priority: (result.priority as Priority) || "normal",
      tags: result.tags || [],
    };
  } catch (error) {
    console.error("AI Parsing failed:", error);
    return null;
  }
}
