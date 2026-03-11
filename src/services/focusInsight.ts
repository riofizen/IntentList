import { GoogleGenAI } from "@google/genai";

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

export async function getFocusInsight(mode: 'pomodoro' | 'shortBreak' | 'longBreak', timeOfDay: string) {
  const ai = getAIClient();
  if (!ai) return "Your focus determines your reality.";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a productivity coach and psychologist. Provide a single, short, powerful sentence of advice or motivation for someone who is currently in "${mode}" mode at ${timeOfDay}. 
      If it's focus mode, encourage deep work. If it's a break, encourage true rest or a quick physical movement. 
      Keep it under 15 words. Do not use emojis.`,
    });
    return response.text || "Focus is the art of knowing what to ignore.";
  } catch (error) {
    console.error("Failed to fetch focus insight:", error);
    return "Your focus determines your reality.";
  }
}
