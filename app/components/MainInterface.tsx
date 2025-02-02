import React, { useRef, useState } from "react";
import { Mic, Send, Loader2, StopCircle } from "lucide-react";
import Navigation from "./NavBar";
import { useFetcher } from "@remix-run/react";

// Message type for chat interface
interface Message {
  id: string;
  content: string;
  type: "user" | "assistant";
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

type TranscriptionData = {
  text: string;
  language: string;
  segments: TranscriptionSegment[];
  error?: string;
};

const MainInterface = () => {
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [messageCounter, setMessageCounter] = useState(0); // Add counter for unique IDs

  // Refs for media recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetcher for handling transcription
  const transcribeFetcher = useFetcher<TranscriptionData>();
  const isTranscribing = transcribeFetcher.state !== "idle";

  // Recording handlers
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
          action: "/transcribe",
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

  // Message handling
  const addMessage = (message: Partial<Message>) => {
    setMessageCounter((prev) => prev + 1); // Increment counter for unique ID
    const fullMessage: Message = {
      id: `msg-${messageCounter}`, // Use counter in ID to ensure uniqueness
      timestamp: new Date(),
      ...message,
    } as Message;

    setMessages((prev) => [...prev, fullMessage]);
    // Scroll to bottom after message is added
    requestAnimationFrame(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  };

  // Handle fetcher response
  React.useEffect(() => {
    const transcriptionData = transcribeFetcher.data;

    if (
      transcriptionData &&
      !transcriptionData.error &&
      transcribeFetcher.state === "idle"
    ) {
      const transcription = transcriptionData.text;

      // Add transcribed message
      addMessage({
        content: transcription,
        type: "user",
        isVoice: true,
      });

      // Add AI response
      addMessage({
        content: `Here's what I heard: "${transcription}"`,
        type: "assistant",
      });
    } else if (transcriptionData?.error) {
      addMessage({
        content: "Sorry, there was an error processing your voice message.",
        type: "assistant",
      });
    }
  }, [transcribeFetcher.data, transcribeFetcher.state]);

  // Event handlers
  const handleVoiceClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || isTranscribing) return;

    addMessage({
      content: textInput,
      type: "user",
    });

    // Add AI response
    addMessage({
      content: `I received your message: "${textInput}". How can I assist you further?`,
      type: "assistant",
    });

    setTextInput("");
  };

  // Status text based on current state
  const statusText = isRecording
    ? "Recording..."
    : isTranscribing
    ? "Transcribing..."
    : "";

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <Navigation />

      <div className="max-w-4xl mx-auto pt-8">
        <div className="flex flex-col items-center space-y-8">
          {/* Voice button with deepseek logo */}
          <button
            onClick={handleVoiceClick}
            disabled={isTranscribing}
            className={`relative w-48 h-48 rounded-3xl transition-all duration-300 ${
              isRecording
                ? "bg-red-500 shadow-lg shadow-red-500/50"
                : "bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/50"
            } ${isTranscribing ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 rounded-xl bg-none backdrop-blur flex items-center justify-center">
                <img
                  src="/deepseekwhite.png"
                  alt="DeepSeek Logo"
                  className="w-24 h-24"
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

          {/* Status Text */}
          {statusText && (
            <div className="text-sm text-gray-300">{statusText}</div>
          )}

          {/* Chat Messages */}
          <div className="w-full max-w-2xl bg-gray-800/30 backdrop-blur rounded-lg p-4 h-64 overflow-y-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`mb-4 ${
                  message.type === "user" ? "text-right" : "text-left"
                }`}
              >
                <div
                  className={`inline-block max-w-md px-4 py-2 rounded-lg ${
                    message.type === "user"
                      ? "bg-blue-600 text-white"
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

          {/* Text Input */}
          <div className="w-full max-w-2xl">
            <form onSubmit={handleTextSubmit} className="relative">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Or type your message here..."
                disabled={isTranscribing}
                className="w-full px-4 py-3 rounded-lg bg-gray-800/50 backdrop-blur border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isTranscribing || !textInput.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isTranscribing ? (
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
