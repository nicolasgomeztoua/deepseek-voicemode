// app/services/query-deepseek.ts
import Together from "together-ai";
import type { DeepSeekMessage, DeepSeekResult } from "~/types/deepseek";

let together: Together | null = null;

function getTogetherClient() {
  if (!together) {
    together = new Together({
      apiKey: process.env.TOGETHER_API_KEY,
    });
  }
  return together;
}

export async function queryDeepSeek(
  messages: DeepSeekMessage[]
): Promise<DeepSeekResult> {
  try {
    const together = getTogetherClient();

    const response = await together.chat.completions.create({
      messages,
      model: "deepseek-ai/DeepSeek-V3",
      temperature: 0.7,
      top_p: 0.7,
      top_k: 50,
      repetition_penalty: 1,
      stop: ["<｜end▁of▁sentence｜>"],
      stream: false,
    });

    return {
      message: response.choices[0].message as DeepSeekMessage,
      done: true,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
      code: 500,
    };
  }
}

export async function* streamDeepSeek(messages: DeepSeekMessage[]) {
  try {
    const together = getTogetherClient();

    const response = await together.chat.completions.create({
      messages,
      model: "deepseek-ai/DeepSeek-V3",
      temperature: 0.7,
      top_p: 0.7,
      top_k: 50,
      repetition_penalty: 1,
      stop: ["<｜end▁of▁sentence｜>"],
      stream: true,
    });

    for await (const chunk of response) {
      if (chunk.choices[0]?.delta?.content) {
        yield chunk.choices[0].delta.content;
      }
    }
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Unknown error occurred"
    );
  }
}
