import { useState, useEffect } from "react";
import agenticaLogo from "/agentica.svg";
import { GoogleOAuthSetup } from "./GoogleOAuthSetup";

export function Landing() {
  const [isOAuthConnected, setIsOAuthConnected] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    // Check if refresh token exists in localStorage
    const savedToken = localStorage.getItem('google_refresh_token');
    setIsOAuthConnected(!!savedToken);
  }, []);

  const handleTokenReceived = (token: string) => {
    // Save to localStorage for now (in production, this would be sent to server)
    localStorage.setItem('google_refresh_token', token);
    setIsOAuthConnected(true);
    setShowSetup(false);
    
    // TODO: Send token to server to update .env or session
    console.log('Token saved:', token.substring(0, 20) + '...');
  };

  const handleDisconnect = () => {
    localStorage.removeItem('google_refresh_token');
    setIsOAuthConnected(false);
  };

  return (
    <section className="flex-1 flex flex-col p-6 overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
            <img
              src={agenticaLogo}
              alt="Agentica logo"
              className="w-16 h-16"
            />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
              NutriSnap
            </h1>
          </div>
          <p className="text-lg text-gray-400 max-w-lg mx-auto">
            AI-powered nutrition tracking chatbot. Simply describe what you ate, 
            and automatically log it to Google Calendar and Sheets.
          </p>
        </div>

        {/* Quick Start Guide */}
        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700/50">
          <h2 className="text-xl font-semibold text-white mb-4">🚀 Quick Start</h2>
          <div className="space-y-3 text-gray-300">
            <div className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white text-sm rounded-full flex items-center justify-center font-semibold">1</span>
              <p>Set up Google OAuth to connect Calendar and Drive</p>
            </div>
            <div className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-green-500 text-white text-sm rounded-full flex items-center justify-center font-semibold">2</span>
              <p>Chat with the AI: "I had a chicken sandwich for lunch"</p>
            </div>
            <div className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white text-sm rounded-full flex items-center justify-center font-semibold">3</span>
              <p>Your nutrition data auto-saves to Google Calendar & Sheets</p>
            </div>
          </div>
        </div>

        {/* OAuth Setup Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Google Integration</h2>
            {isOAuthConnected && (
              <button
                onClick={handleDisconnect}
                className="text-sm text-red-400 hover:text-red-300 underline"
              >
                Disconnect
              </button>
            )}
          </div>

          {isOAuthConnected ? (
            <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-green-300 font-medium">Connected to Google Services</span>
              </div>
              <p className="text-green-200 text-sm">
                Ready to log nutrition data to Calendar and Sheets. Start chatting! →
              </p>
            </div>
          ) : (
            <div>
              {!showSetup && (
                <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
                    <span className="text-amber-300 font-medium">Google Integration Required</span>
                  </div>
                  <p className="text-amber-200 text-sm mb-4">
                    Connect Google Calendar and Drive to automatically save your nutrition data.
                  </p>
                  <button
                    onClick={() => setShowSetup(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
                  >
                    Set Up Google Integration
                  </button>
                </div>
              )}

              {showSetup && (
                <GoogleOAuthSetup
                  onTokenReceived={handleTokenReceived}
                  isConnected={isOAuthConnected}
                />
              )}
            </div>
          )}
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30">
            <h3 className="font-semibold text-white mb-2">🤖 AI-Powered Parsing</h3>
            <p className="text-gray-400 text-sm">Natural language food recognition with Korean support</p>
          </div>
          <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30">
            <h3 className="font-semibold text-white mb-2">📊 Auto-Logging</h3>
            <p className="text-gray-400 text-sm">Saves to Google Calendar events and Sheets</p>
          </div>
          <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30">
            <h3 className="font-semibold text-white mb-2">🔒 Privacy-First</h3>
            <p className="text-gray-400 text-sm">Data stays in your Google account, no server storage</p>
          </div>
          <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30">
            <h3 className="font-semibold text-white mb-2">🌐 Open Source</h3>
            <p className="text-gray-400 text-sm">MIT licensed, customize as needed</p>
          </div>
        </div>

        {/* Links */}
        <div className="flex gap-3 justify-center pt-4">
          <a
            href="https://github.com/your-repo/nutrisnap-agentica"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 border border-gray-700 bg-transparent text-gray-300 rounded-lg hover:bg-white/5 transition-all text-sm"
          >
            GitHub
          </a>
          <a
            href="https://wrtnlabs.io/agentica/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-white text-zinc-900 font-medium rounded-lg hover:bg-gray-100 transition-all text-sm"
          >
            Agentica Docs
          </a>
        </div>
      </div>
    </section>
  );
}
