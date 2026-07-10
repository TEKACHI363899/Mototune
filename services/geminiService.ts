const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

/**
 * Uses Gemini API to extract ODO mileage from an image base64 string (OCR)
 * @param base64Image Base64 representation of the image
 * @returns Extracted ODO digits as string
 */
export const scanOdoWithGemini = async (base64Image: string): Promise<string> => {
  if (!GEMINI_API_KEY) throw new Error("Gemini API key is missing");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const payload = {
    contents: [
      {
        parts: [
          { text: "Bạn là một siêu máy quét OCR. Hãy trích xuất ra đúng dãy số tổng quãng đường (ODO). CHỈ TRẢ VỀ CÁC CON SỐ LIỀN NHAU (Ví dụ: 15200). Trả về 'NULL' nếu không thấy rõ." },
          { inline_data: { mime_type: "image/jpeg", data: base64Image } }
        ]
      }
    ]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Gemini OCR failed");
  }
  
  const data = await response.json();
  return data.candidates[0].content.parts[0].text.trim();
};

/**
 * Fetches a conversational response from Gemini based on chat history and current message
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
  if (!GEMINI_API_KEY) throw new Error("Gemini API key is missing");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const chatHistory = messages
    .filter(msg => msg.id !== '1' && !msg.isVideo)
    .map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

  const payload = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [...chatHistory, { role: "user", parts: [{ text: userMessage }] }]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Gemini response error");
  return data.candidates[0].content.parts[0].text;
};

/**
 * Uploads a video to Gemini Files API, waits for processing, and then generates diagnostic content
 * @param videoUri Local video file URI
 * @param systemPrompt System instructions instructing the AI model
 * @returns AI model's diagnosis response text
 */
export const fetchAIVideoResponse = async (
  videoUri: string,
  systemPrompt: string
): Promise<string> => {
  if (!GEMINI_API_KEY) throw new Error("Gemini API key is missing");
  
  // 1. Fetch local video file and convert to Blob
  const responseBlob = await fetch(videoUri);
  const blob = await responseBlob.blob();

  // 2. Upload video file using Files API
  const uploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GEMINI_API_KEY}`;
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Protocol': 'raw',
      'X-Goog-Upload-Header-Content-Type': 'video/mp4',
      'Content-Type': 'video/mp4'
    },
    body: blob
  });

  const uploadData = await uploadRes.json();
  if (!uploadRes.ok) throw new Error(uploadData.error?.message || "Lỗi Upload Video");

  const fileUri = uploadData.file.uri;
  const fileName = uploadData.file.name;

  // 3. Poll file state until it is processed
  let fileState = uploadData.file.state;
  while (fileState === 'PROCESSING') {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const checkUrl = `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${GEMINI_API_KEY}`;
    const checkRes = await fetch(checkUrl);
    const checkData = await checkRes.json();
    fileState = checkData.state;
    
    if (fileState === 'FAILED') throw new Error("Máy chủ Google không thể xử lý video này.");
  }

  // 4. Request content generation based on the processed video
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const payload = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{
      role: "user",
      parts: [
        { text: "Bác sĩ hãy lắng nghe đoạn video tiếng máy này và chẩn đoán giúp tôi nhé." },
        { fileData: { mimeType: "video/mp4", fileUri: fileUri } }
      ]
    }]
  };

  const genRes = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  const data = await genRes.json();
  if (!genRes.ok) throw new Error(data.error?.message || "Gemini video response error");
  return data.candidates[0].content.parts[0].text;
};
