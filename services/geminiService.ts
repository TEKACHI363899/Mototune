const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://mototune-backend.onrender.com';

/**
 * Uses Gemini API (via Backend Proxy) to extract ODO mileage from an image base64 string (OCR)
 * @param base64Image Base64 representation of the image
 * @returns Extracted ODO digits as string
 */
export const scanOdoWithGemini = async (base64Image: string): Promise<string> => {
  const url = `${BACKEND_URL}/api/gemini/scan-odo`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Image })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Gemini OCR failed");
  }

  return data.odo;
};

/**
 * Fetches a conversational response from Gemini (via Backend Proxy) based on chat history and current message
 * @param messages Array of previous chat messages
 * @param userMessage New message text
 * @param systemPrompt System instructions instructing the AI model
 * @returns AI model's response content
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

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
};

/**
 * Uploads a video to Backend Proxy, which forwards to Gemini Files API, waits for processing, and then generates diagnostic content
 * @param videoUri Local video file URI
 * @param systemPrompt System instructions instructing the AI model
 * @returns AI model's diagnosis response text
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

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
    headers: {
      // Content-Type is set automatically by React Native when FormData is used
      Accept: 'application/json'
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Gemini video response error");
  }

  return data.diagnosis;
};
