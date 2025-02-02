// app/routes/transcribe.server.ts
import type { ActionFunction } from "@remix-run/node";

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
    const response = await fetch("http://localhost:8000/transcribe", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const transcription = await response.json();
    return Response.json(transcription);
  } catch (error) {
    console.error("Transcription error:", error);
    return Response.json(
      { error: "Failed to transcribe audio" },
      { status: 500 }
    );
  }
};
