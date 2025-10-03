
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  timestamp: string;
  data?: T;
  errorCode?: string;
  errors?: Record<string, string>;
}


export interface MessageResponse {
  message: string;
  email?: string;
}


export function extractData<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new Error(response.message || 'Request failed');
  }
  if (response.data === undefined) {
    throw new Error('No data in response');
  }
  return response.data;
}