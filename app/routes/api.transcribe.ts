// app/routes/transcribe.ts
import type { ActionFunction } from "@remix-run/node";
import { queryDeepSeek } from "~/services/query-deepseek";

export const action: ActionFunction = async ({ request }) => {
  try {
    const formData = await request.formData();
    const audioBlob = formData.get("file");

    if (!audioBlob || !(audioBlob instanceof Blob)) {
      return Response.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Send to Python FastAPI service
    const transcriptionResponse = await fetch(
      "http://localhost:8000/transcribe",
      {
        method: "POST",
        body: formData,
      }
    );

    if (!transcriptionResponse.ok) {
      throw new Error(`Transcription error: ${transcriptionResponse.status}`);
    }

    const transcriptionData = await transcriptionResponse.json();

    // Query DeepSeek with transcribed text
    const deepseekResponse = await queryDeepSeek([
      { role: "user", content: transcriptionData.text },
    ]);

    return Response.json({
      transcription: transcriptionData,
      response: deepseekResponse,
    });
  } catch (error) {
    console.error("Processing error:", error);
    return Response.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
};
