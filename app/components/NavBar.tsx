import { useUser, SignInButton, UserButton } from "@clerk/remix";

const Navigation = () => {
  const { isLoaded, isSignedIn } = useUser();

  return (
    <nav className="border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <span className="text-xl font-bold">VoiceSeek</span>
          </div>

          <div className="flex items-center space-x-8">
            <a href="/" className="text-gray-300 hover:text-white transition">
              Home
            </a>
            {!isLoaded ? (
              <div className="w-8 h-8 rounded-full bg-gray-700 animate-pulse" />
            ) : isSignedIn ? (
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8 rounded-full",
                  },
                }}
              />
            ) : (
              <SignInButton mode="modal">
                <button className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition">
                  <span>Sign In</span>
                </button>
              </SignInButton>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
