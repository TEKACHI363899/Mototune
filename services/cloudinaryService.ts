import { uploadAsync } from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUD_NAME;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_UPLOAD_PRESET;

/**
 * Uploads a file (image or video) to Cloudinary
 * Handles native platform and web environment differences
 * @param uri Local file URI
 * @param type File type ('image' | 'video')
 * @returns Secure URL from Cloudinary
 */
export const uploadToCloudinary = async (uri: string, type: 'image' | 'video' | string): Promise<string> => {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary config is missing in environment variables.');
  }
  
  const resourceType = type === 'video' ? 'video' : 'image';
  const apiUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;

  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    const blob = await res.blob();
    const data = new FormData();
    data.append('file', blob);
    data.append('upload_preset', UPLOAD_PRESET);
    
    const response = await fetch(apiUrl, { method: 'POST', body: data });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error?.message || "Web Cloudinary upload failed");
    }
    return result.secure_url;
  } else {
    const response = await uploadAsync(apiUrl, uri, {
      httpMethod: 'POST',
      uploadType: 1 as any,
      fieldName: 'file',
      parameters: { upload_preset: UPLOAD_PRESET },
    });
    
    const result = JSON.parse(response.body);
    if (response.status !== 200) {
      throw new Error(result.error?.message || "Cloudinary upload failed");
    }
    return result.secure_url;
  }
};
