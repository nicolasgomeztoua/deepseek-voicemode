import { GitBranch, ExternalLink, User } from "lucide-react";
import { useUser, SignInButton, UserButton } from "@clerk/remix";

const LandingPage = () => {
  // Get the current user state from Clerk
  const { isLoaded, isSignedIn } = useUser();

  // Navigation items with auth-aware routing
  const navItems = [
    { label: "Home", href: "/" },
    { label: "App", href: "/app", requiresAuth: true },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* Navigation with Auth Integration */}
      <nav className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <span className="text-xl font-bold">VoiceSeek</span>
            </div>

            <div className="flex items-center space-x-8">
              {/* Navigation Links */}
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-gray-300 hover:text-white transition"
                >
                  {item.label}
                </a>
              ))}

              {/* Auth Button */}
              <div className="flex items-center">
                {!isLoaded ? (
                  // Loading state
                  <div className="w-8 h-8 rounded-full bg-gray-700 animate-pulse" />
                ) : isSignedIn ? (
                  // Signed in - show user button
                  <UserButton
                    afterSignOutUrl="/"
                    appearance={{
                      elements: {
                        avatarBox: "w-8 h-8 rounded-full",
                      },
                    }}
                  />
                ) : (
                  // Signed out - show sign in button
                  <SignInButton mode="modal">
                    <button className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition">
                      <User className="w-4 h-4" />
                      <span>Sign In</span>
                    </button>
                  </SignInButton>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 animate-gradient" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text">
              Voice Interface for DeepSeek
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto">
              Transform your interactions with DeepSeek using natural voice
              commands. Seamlessly convert speech to text, process with
              DeepSeek, and hear responses in multiple languages.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <a
                href="https://github.com/yourusername/voiceseek"
                className="inline-flex items-center px-8 py-3 rounded-lg bg-white text-gray-900 hover:bg-gray-100 transition shadow-lg"
              >
                <GitBranch className="mr-2 h-5 w-5" />
                View on GitHub
              </a>
              {isSignedIn ? (
                <a
                  href="/app"
                  className="inline-flex items-center px-8 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition shadow-lg"
                >
                  <ExternalLink className="mr-2 h-5 w-5" />
                  Try it Now
                </a>
              ) : (
                <SignInButton mode="modal">
                  <button className="inline-flex items-center px-8 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition shadow-lg">
                    <User className="mr-2 h-5 w-5" />
                    Sign In to Try
                  </button>
                </SignInButton>
              )}
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-8 mt-24">
            <div className="p-6 rounded-lg bg-gray-800/50 backdrop-blur">
              <h3 className="text-xl font-semibold mb-3">Open Source</h3>
              <p className="text-gray-300">
                Freely available source code. Contribute, modify, and deploy
                your own instance.
              </p>
            </div>
            <div className="p-6 rounded-lg bg-gray-800/50 backdrop-blur">
              <h3 className="text-xl font-semibold mb-3">Multi-lingual</h3>
              <p className="text-gray-300">
                Support for multiple languages in both speech recognition and
                synthesis.
              </p>
            </div>
            <div className="p-6 rounded-lg bg-gray-800/50 backdrop-blur">
              <h3 className="text-xl font-semibold mb-3">High Quality TTS</h3>
              <p className="text-gray-300">
                Crystal clear text-to-speech powered by state-of-the-art models.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
