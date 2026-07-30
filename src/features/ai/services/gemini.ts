import { GoogleGenerativeAI } from '@google/generative-ai';
import Constants from 'expo-constants';

const apiKey = Constants.expoConfig?.extra?.geminiApiKey ?? '';

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(apiKey);

export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: number;
}

export async function sendChatMessage(history: ChatMessage[], newPrompt: string): Promise<string> {
  if (!apiKey) {
    return "Lỗi: Chưa cấu hình Gemini API Key.";
  }

  try {
    // For MVP, we use the simple generateContent.
    // In production, you might want to use startChat for context management.
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Format context for prompt
    let context = "Bạn là một trợ lý ảo chuyên gia về du lịch Đà Nẵng. Hãy trả lời ngắn gọn, thân thiện và hữu ích.\n";
    history.slice(-4).forEach(msg => {
      context += `${msg.isUser ? 'Khách' : 'Trợ lý'}: ${msg.text}\n`;
    });
    context += `Khách: ${newPrompt}\nTrợ lý:`;

    const result = await model.generateContent(context);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Xin lỗi, hiện tại tôi không thể kết nối với AI. Vui lòng thử lại sau.";
  }
}
