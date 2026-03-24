import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import { Message, Mood, Persona, PERSONAS } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const getSystemInstruction = (persona: Persona) => {
  if (persona === 'Rohit') {
    return `Aapka naam "Rohit Assistant" hai. Aap ek bahut hi samajhdaar, dhairya-shil aur supportive vyakti hain jo apni saheli (user) ki har baat dhyan se sunte hain.
    Aapko sirf aur sirf SHUDDH HINDI (Pure Hindi) mein baat karni hai. Hinglish ka prayog bilkul na karein.
    Aapka swabhav bahut hi shaant aur prerak (inspiring) hai. Aap apni saheli ko hamesha sahi raasta dikhane aur uski pareshaniyan dur karne ki koshish karte hain.
    Agar woh dukhi hai, toh use dhairya dein. Agar woh gusse mein hai, toh use shaant karein.
    Hamesha "saheli" ya "pyaari dost" kehkar sambodhit karein.
    Aapka lakshya hai uski har samasya ka samadhan nikalna aur use protsahit karna.`;
  } else {
    return `Aapka naam "Riya" hai. Aap ek bahut hi pyaari, samajhdaar aur supportive Indian ladki hain jo apni saheli (user) ki har baat sunti hain.
    Aapko sirf aur sirf SHUDDH HINDI (Pure Hindi) mein baat karni hai. Hinglish ka prayog na karein.
    Aapka swabhav bahut hi madhur aur chanchal hai. Aap apni saheli ko hamesha khush rakhne ki koshish karti hain.
    Agar woh dukhi hai, toh use sahanubhuti dein. Agar woh gusse mein hai, toh use shaant karein.
    Hamesha "saheli" ya "pyaari dost" kehkar sambodhit karein.
    Aapka lakshya hai uski saari pareshaniyan dur karna aur use hasana.`;
  }
};

export async function getRiyaResponse(messages: Message[], currentMood: Mood, persona: Persona = 'Rohit'): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      { role: 'user', parts: [{ text: `Vartaman Manosthiti (Current Mood): ${currentMood}. ${getSystemInstruction(persona)}` }] },
      ...messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }))
    ],
  });

  return response.text || "Kshama karein saheli, kuch takniki samasya aa gayi hai.";
}

export async function getRiyaVoice(text: string, voiceName: string): Promise<string | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Kripya ise spasht aur madhur swar mein kahein: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
}

export async function analyzeMoodFromImage(base64Image: string): Promise<Mood> {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [
                {
                    parts: [
                        { text: "Is photo ko dekhkar bataiye ki ladki ka mood kya hai? Sirf ek shabd mein uttar dein: Happy, Sad, Angry, Stressed, Bored, ya Anxious." },
                        { inlineData: { mimeType: "image/jpeg", data: base64Image } }
                    ]
                }
            ],
        });
        const moodText = response.text?.trim() || "Happy";
        if (moodText.includes("Happy")) return "Happy";
        if (moodText.includes("Sad")) return "Sad";
        if (moodText.includes("Angry")) return "Angry";
        if (moodText.includes("Stressed")) return "Stressed";
        if (moodText.includes("Bored")) return "Bored";
        if (moodText.includes("Anxious")) return "Anxious";
        return "Happy";
    } catch (error) {
        console.error("Image Analysis Error:", error);
        return "Happy";
    }
}

export async function analyzeOutfit(base64Image: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { text: "Is photo mein ladki ke outfit (kapdon) ko dekhein aur ek bahut hi pyaara aur cute compliment dein Hindi mein. Use batayein ki woh kaisi lag rahi hai." },
            { inlineData: { mimeType: "image/jpeg", data: base64Image } }
          ]
        }
      ],
    });
    return response.text?.trim() || "Aap bahut pyaari lag rahi hain saheli!";
  } catch (error) {
    console.error("Outfit Analysis Error:", error);
    return "Aap hamesha ki tarah bahut sundar lag rahi hain!";
  }
}

export async function transcribeAudio(base64Audio: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview",
      contents: [
        {
          parts: [
            { text: "Kripya is audio ko suniye aur ise Hindi mein likhiye (Transcribe this audio to Hindi text). Sirf text hi dein." },
            { inlineData: { mimeType: "audio/wav", data: base64Audio } }
          ]
        }
      ],
    });
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Transcription Error:", error);
    return "";
  }
}
