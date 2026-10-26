# Gemini 4 Argon Agent Guidelines

## Model Configuration & Prompt Engineering

1. **Thinking Level Calibration:**
   * When invoking `gemini-4-argon` in server route handlers:
     * Set `thinkingLevel: "high"` for multi-factor constraint satisfaction (combining schedule constraints, walking buffers, dietary rules, and kitchen queue latency).
     * Set `thinkingLevel: "medium"` for fast conversational replies or single-variable checks.

2. **Strict Schema Contracts:**
   * Enforce JSON schemas using the `@google/genai` `Type` schema definition:
     ```typescript
     import { GoogleGenAI, Type } from '@google/genai';

     const ai = new GoogleGenAI();
     const response = await ai.models.generateContent({
       model: 'gemini-4-argon',
       contents: prompt,
       config: {
         thinkingConfig: { thinkingLevel: 'medium' },
         responseMimeType: 'application/json',
         responseSchema: { ... }
       }
     });
     ```
   * Never parse free-form markdown or unvalidated strings.

3. **Fallback Simulation:**
   * When `GEMINI_API_KEY` is not present in local environment, provide a deterministic heuristic simulation fallback so offline hackathon demos and frontend tests never crash.
