import React, { useState, useRef, useEffect } from "react";
import { Mic, Send, Loader2, StopCircle } from "lucide-react";

interface Message {
  id: string;
  content: string;
  type: "user" | "assistant";
  timestamp: Date;
  isVoice?: boolean;
}

const MainInterface = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        handleVoiceSubmit();
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
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

  const handleVoiceClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleVoiceSubmit = () => {
    const newMessage: Message = {
      id: Date.now().toString(),
      content: "Voice message sent",
      type: "user",
      timestamp: new Date(),
      isVoice: true,
    };
    setMessages((prev) => [...prev, newMessage]);

    // Simulate assistant response
    setIsProcessing(true);
    setTimeout(() => {
      const responseMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I heard your voice message! How can I help you today?",
        type: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, responseMessage]);
      setIsProcessing(false);
    }, 1000);
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || isProcessing) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: textInput,
      type: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);

    // Simulate assistant response
    setIsProcessing(true);
    setTimeout(() => {
      const responseMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `I received your message: "${textInput}". How can I assist you further?`,
        type: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, responseMessage]);
      setIsProcessing(false);
      setTextInput("");
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4">
      <div className="max-w-4xl mx-auto pt-8">
        <div className="flex flex-col items-center space-y-8">
          {/* Voice button with deepseek logo */}
          <button
            onClick={handleVoiceClick}
            className={`relative w-48 h-48 rounded-3xl transition-all duration-300 ${
              isRecording
                ? "bg-red-500 shadow-lg shadow-red-500/50"
                : "bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/50"
            }`}
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

          {/* Response area */}
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

          {/* Text input section */}
          <div className="w-full max-w-2xl">
            <form onSubmit={handleTextSubmit} className="relative">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Or type your message here..."
                className="w-full px-4 py-3 rounded-lg bg-gray-800/50 backdrop-blur border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
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
