// app/types/deepseek.ts
export interface DeepSeekMessage {
  role: "user" | "assistant";
  content: string;
}

export interface DeepSeekDelta {
  content?: string;
  role?: "assistant";
}

export interface DeepSeekStreamChoice {
  delta: DeepSeekDelta;
  finish_reason: string | null;
  index: number;
}

export interface DeepSeekStreamResponse {
  id: string;
  choices: DeepSeekStreamChoice[];
  created: number;
}

export interface DeepSeekResponse {
  message: DeepSeekMessage;
  done: boolean;
  totalDuration?: number;
}

export interface DeepSeekError {
  error: string;
  code?: number;
}

export type DeepSeekResult = DeepSeekResponse | DeepSeekError;
