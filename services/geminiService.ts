const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://mototune-backend.onrender.com';
const API_KEY = process.env.EXPO_PUBLIC_MOTO_TUNE_API_KEY || '';

/**
 * Uses Gemini API (via Backend Proxy) to extract ODO mileage from an image base64 string (OCR)
 */
export const scanOdoWithGemini = async (base64Image: string): Promise<string> => {
  const url = `${BACKEND_URL}/api/gemini/scan-odo`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
      body: JSON.stringify({ base64Image })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Gemini OCR failed");
    }

    return data.odo;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Fetches a conversational response from Gemini (via Backend Proxy) based on chat history and current message
 */
export const fetchAITextResponse = async (
  messages: { id: string; text: string; sender: 'user' | 'bot'; isVideo?: boolean }[],
  userMessage: string,
  systemPrompt: string
): Promise<string> => {
  const url = `${BACKEND_URL}/api/gemini/chat`;
  
  // Map standard chat history structure into Google Gemini role parts format
  const chatHistory = messages
    .filter(msg => msg.id !== '1' && !msg.isVideo)
    .map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
      body: JSON.stringify({
        messages: chatHistory,
        userMessage,
        systemPrompt
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Gemini response error");
    }

    return data.reply;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Uploads a video to Backend Proxy, which forwards to Gemini Files API, waits for processing, and then generates diagnostic content
 */
export const fetchAIVideoResponse = async (
  videoUri: string,
  systemPrompt: string
): Promise<string> => {
  const url = `${BACKEND_URL}/api/gemini/diagnose-video`;

  // Create multipart FormData for video file upload
  const formData = new FormData();
  formData.append('video', {
    uri: videoUri,
    name: 'diagnose.mp4',
    type: 'video/mp4'
  } as any);
  formData.append('systemPrompt', systemPrompt);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for video

  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      body: formData,
      headers: {
        Accept: 'application/json', 'x-api-key': API_KEY
      }
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Gemini video response error");
    }

    return data.diagnosis;
  } finally {
    clearTimeout(timeoutId);
  }
};
