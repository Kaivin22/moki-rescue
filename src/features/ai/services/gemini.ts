import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '@/src/services/supabase';
import type { Place } from '@/src/types/place';

const getApiUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Thiếu EXPO_PUBLIC_API_URL cho bản production.');
  }
  const debuggerHost = Constants.expoConfig?.hostUri;
  const localhost = debuggerHost?.split(':')[0] || (Platform.OS === 'android' ? '10.0.2.2' : 'localhost');
  return `http://${localhost}:8080/api`;
};

const API_URL = getApiUrl();

export interface ChatMessage { id: string; text: string; isUser: boolean; timestamp: number }
export interface ServerOptimization {
  days: string[][];
  totalDistanceKm: number;
  totalTravelTimeMin: number;
  roadDataUsed: boolean;
  routingStatus: 'road' | 'estimated' | 'not_needed';
  objective: 'fastest_route_time' | 'estimated_travel_time';
  exactOrder: boolean;
}

export class AiApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) {
    super(message);
    this.name = 'AiApiError';
  }
}

async function authenticatedHeaders() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new AiApiError('Không thể xác thực phiên đăng nhập. Vui lòng đăng nhập lại.', 401, 'AUTH_SESSION_ERROR');
  const token = data.session?.access_token;
  if (!token) throw new AiApiError('Bạn cần đăng nhập để sử dụng tính năng này.', 401, 'AUTH_REQUIRED');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function apiError(res: Response): Promise<AiApiError> {
  try {
    const body = await res.json();
    return new AiApiError(body?.message || `Yêu cầu thất bại (${res.status}).`, res.status, body?.code);
  } catch {
    return new AiApiError(`Yêu cầu thất bại (${res.status}).`, res.status);
  }
}

async function apiFetch(path: string, body: unknown): Promise<Response> {
  // Resolve authentication outside the network catch block so an expired or
  // missing session is not incorrectly reported as a connectivity problem.
  const headers = await authenticatedHeaders();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    return await fetch(`${API_URL}${path}`, {
      method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AiApiError('Máy chủ phản hồi quá lâu. Vui lòng thử lại.', 408, 'REQUEST_TIMEOUT');
    }
    throw new AiApiError('Không thể kết nối máy chủ. Hãy kiểm tra mạng và thử lại.', 0, 'NETWORK_ERROR');
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendChatMessage(history: ChatMessage[], prompt: string): Promise<string> {
  const boundedHistory = history.filter((message) => message.text.trim()).slice(-8);
  const res = await apiFetch('/ai/chat', { prompt, history: boundedHistory });
  if (!res.ok) throw await apiError(res);
  return res.text();
}

export async function reviewOptimizedItinerary(itinerary: unknown): Promise<string> {
  const res = await apiFetch('/ai/optimize-review', { itineraryJson: JSON.stringify(itinerary) });
  if (!res.ok) throw await apiError(res);
  return res.text();
}

export async function optimizeVipRoute(
  places: Place[],
  numDays: number,
  transport: 'motorbike' | 'car' | 'walk' | 'bicycle',
): Promise<ServerOptimization> {
  const res = await apiFetch('/ai/optimize', {
    places: places.map(({ id, lat, lng, avg_duration_min }) => ({
      id,
      lat,
      lng,
      durationMin: avg_duration_min,
    })),
    numDays,
    transport,
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}
