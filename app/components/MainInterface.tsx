import React, { useState } from "react";
import { Mic, Send, Loader2 } from "lucide-react";

const MainInterface = () => {
  // State management for both voice and text interactions
  const [isRecording, setIsRecording] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [response /* setresponse */] = useState("");

  // Handle voice button interaction
  const handleVoiceClick = () => {
    setIsRecording(!isRecording);
    // Voice recording logic will go here
  };

  // Handle text submission
  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;

    setIsProcessing(true);
    // API call logic will go here
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4">
      <div className="max-w-4xl mx-auto pt-8">
        {/* Main interface container */}
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
            {/* Deepseek Logo (placeholder) */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 rounded-xl bg-none backdrop-blur flex items-center justify-center">
                {/* Replace with actual DeepSeek logo */}
                <span className="text-2xl font-bold">
                  <img
                    src="/deepseekwhite.png"
                    alt="DeepSeek Logo"
                    className="w-24 h-24"
                  />
                </span>
              </div>
            </div>

            {/* Recording animation rings */}
            {isRecording && (
              <>
                <div className="absolute inset-0 rounded-3xl animate-ping bg-red-500 opacity-20"></div>
                <div className="absolute inset-0 rounded-3xl animate-pulse bg-red-500 opacity-20"></div>
              </>
            )}

            {/* Microphone icon */}
            <div className="absolute bottom-4 right-4">
              <Mic
                className={`w-6 h-6 ${isRecording ? "animate-pulse" : ""}`}
              />
            </div>
          </button>

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

          {/* Response area */}
          {response && (
            <div className="w-full max-w-2xl bg-gray-800/30 backdrop-blur rounded-lg p-4 animate-fade-in">
              <p className="text-gray-300">{response}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MainInterface;
