import React, { useRef, useState, useCallback } from "react";
import { Mic, Send, Loader2, StopCircle } from "lucide-react";
import Navigation from "./NavBar";
import { useFetcher } from "@remix-run/react";

// Message type for chat interface
interface Message {
  id: string;
  content: string;
  type: "user" | "assistant" | "ai";
  timestamp: Date;
  isVoice?: boolean;
}

// API Response types
interface TranscriptionSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
}

interface DeepSeekResponse {
  response: string;
  error?: string;
}

interface TranscriptionData {
  text: string;
  language: string;
  segments: TranscriptionSegment[];
  ai_response?: DeepSeekResponse;
  error?: string;
}

interface TextProcessingData {
  text: string;
  ai_response: DeepSeekResponse;
  error?: string;
}

const MainInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const transcribeFetcher = useFetcher<TranscriptionData>();
  const textFetcher = useFetcher<TextProcessingData>();

  const isProcessing =
    transcribeFetcher.state !== "idle" || textFetcher.state !== "idle";

  const addMessage = useCallback((message: Partial<Message>) => {
    const fullMessage: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...message,
    } as Message;

    setMessages((prev) => [...prev, fullMessage]);

    requestAnimationFrame(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("file", audioBlob, "audio.webm");

        transcribeFetcher.submit(formData, {
          method: "POST",
          action: "/api/transcribe",
          encType: "multipart/form-data",
        });
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      addMessage({
        content: "Error accessing microphone. Please check your permissions.",
        type: "assistant",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
    }
  };

  React.useEffect(() => {
    const transcriptionData = transcribeFetcher.data;

    if (
      transcriptionData &&
      !transcriptionData.error &&
      transcribeFetcher.state === "idle"
    ) {
      const transcription = transcriptionData.text;

      addMessage({
        content: transcription,
        type: "user",
        isVoice: true,
      });

      addMessage({
        content: `Transcription (${transcriptionData.language}): "${transcription}"`,
        type: "assistant",
      });

      if (transcriptionData.ai_response?.response) {
        addMessage({
          content: transcriptionData.ai_response.response,
          type: "ai",
        });
      } else if (transcriptionData.ai_response?.error) {
        addMessage({
          content: `AI Error: ${transcriptionData.ai_response.error}`,
          type: "assistant",
        });
      }
    } else if (transcriptionData?.error) {
      addMessage({
        content: `Error: ${transcriptionData.error}`,
        type: "assistant",
      });
    }
  }, [transcribeFetcher.data, transcribeFetcher.state, addMessage]);

  React.useEffect(() => {
    const textData = textFetcher.data;

    if (textData && !textData.error && textFetcher.state === "idle") {
      if (textData.ai_response?.response) {
        addMessage({
          content: textData.ai_response.response,
          type: "ai",
        });
      } else if (textData.ai_response?.error) {
        addMessage({
          content: `AI Error: ${textData.ai_response.error}`,
          type: "assistant",
        });
      }
    } else if (textData?.error) {
      addMessage({
        content: `Error: ${textData.error}`,
        type: "assistant",
      });
    }
  }, [textFetcher.data, textFetcher.state, addMessage]);

  const handleVoiceClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || isProcessing) return;

    addMessage({
      content: textInput,
      type: "user",
    });

    textFetcher.submit(
      { text: textInput },
      {
        method: "POST",
        action: "/api/process-text",
        encType: "application/json",
      }
    );

    setTextInput("");
  };

  const statusText = isRecording
    ? "Recording..."
    : isProcessing
    ? "Processing with DeepSeek..."
    : "";

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <Navigation />

      <div className="max-w-6xl mx-auto pt-8 px-4">
        <div className="flex flex-col items-center space-y-8">
          <button
            onClick={handleVoiceClick}
            disabled={isProcessing}
            className={`relative w-32 h-32 rounded-3xl transition-all duration-300 ${
              isRecording
                ? "bg-red-500 shadow-lg shadow-red-500/50"
                : "bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/50"
            } ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-xl bg-none backdrop-blur flex items-center justify-center">
                <img
                  src="/deepseekwhite.png"
                  alt="DeepSeek Logo"
                  className="w-16 h-16"
                />
              </div>
            </div>

            {isRecording && (
              <>
                <div className="absolute inset-0 rounded-3xl animate-ping bg-red-500 opacity-20"></div>
                <div className="absolute inset-0 rounded-3xl animate-pulse bg-red-500 opacity-20"></div>
              </>
            )}

            <div className="absolute bottom-4 right-4">
              {isRecording ? (
                <StopCircle className="w-6 h-6 animate-pulse text-white" />
              ) : (
                <Mic className="w-6 h-6" />
              )}
            </div>
          </button>

          {statusText && (
            <div className="text-sm text-gray-300">{statusText}</div>
          )}

          <div className="w-full bg-gray-800/30 backdrop-blur rounded-lg p-6 h-[50vh] overflow-y-scroll">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`mb-4 ${
                  message.type === "user" ? "text-right" : "text-left"
                }`}
              >
                <div
                  className={`inline-block max-w-lg px-4 py-2 rounded-lg ${
                    message.type === "user"
                      ? "bg-blue-600 text-white"
                      : message.type === "ai"
                      ? "bg-purple-600 text-white"
                      : "bg-gray-700 text-gray-100"
                  }`}
                >
                  {message.isVoice && (
                    <Mic className="inline-block w-4 h-4 mr-2" />
                  )}
                  <p>{message.content}</p>
                  <span className="text-xs opacity-75">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="w-full">
            <form onSubmit={handleTextSubmit} className="relative">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Or type your message here..."
                disabled={isProcessing}
                className="w-full px-4 py-3 rounded-lg bg-gray-800/50 backdrop-blur border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isProcessing || !textInput.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isProcessing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainInterface;
