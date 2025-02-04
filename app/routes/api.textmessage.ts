import type { ActionFunction } from "@remix-run/node";
import { queryDeepSeek } from "~/services/query-deepseek";
import type { DeepSeekMessage } from "~/types/deepseek";

export const action: ActionFunction = async ({ request }) => {
  try {
    const { message } = await request.json();

    if (!message) {
      return Response.json({ error: "Message is required" }, { status: 400 });
    }

    const messages: DeepSeekMessage[] = [
      {
        role: "user",
        content: message,
      },
    ];

    const response = await queryDeepSeek(messages);

    if ("error" in response) {
      return Response.json(
        { error: response.error },
        { status: response.code || 500 }
      );
    }

    return Response.json(response);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
};
