import { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const getPrediction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId, currentInventory } = req.query;

    if (!process.env.GEMINI_API_KEY) {
      res.json({
        alertTriggered: false,
        predictedDaysRemaining: 45,
        last30DaysUsage: 2500,
        dailyAverage: 83.3,
        stockLevelAssessment: "Stock levels are optimal based on recent usage patterns. No immediate orders required. (Fallback)"
      });
      return;
    }

    const inventoryNum = parseInt(currentInventory as string) || 5000;
    
    const prompt = `Analyze this inventory data for a company. Current stock: ${inventoryNum} units. 
Last 30 days usage: 2500 units. Daily average: 83.3 units.
Return ONLY a JSON object with this exact structure:
{
  "alertTriggered": boolean,
  "predictedDaysRemaining": number,
  "last30DaysUsage": number,
  "dailyAverage": number,
  "stockLevelAssessment": string (2 sentences max)
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const resultText = response.text;
    const result = JSON.parse(resultText() || "{}");
    
    res.json(result);
  } catch (error: any) {
    console.error('Prediction Error:', error);
    res.json({
      alertTriggered: false,
      predictedDaysRemaining: 45,
      last30DaysUsage: 2500,
      dailyAverage: 83.3,
      stockLevelAssessment: "Stock levels are optimal based on recent usage patterns. No immediate orders required. (Fallback)"
    });
  }
};
