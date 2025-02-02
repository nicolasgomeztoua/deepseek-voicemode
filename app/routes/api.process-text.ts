// app/routes/process-text.ts
import type { ActionFunction } from "@remix-run/node";

export const action: ActionFunction = async ({ request }) => {
  try {
    const body = await request.json();

    const response = await fetch("http://localhost:8000/process-text", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: body.text }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return Response.json(result);
  } catch (error) {
    console.error("Text processing error:", error);
    return Response.json({ error: "Failed to process text" }, { status: 500 });
  }
};
