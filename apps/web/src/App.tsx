import { useState, useEffect } from "react";
import { UserProfile } from "./types/index.ts";
import { Header } from "./components/Header.tsx";
import { SlotCard } from "./components/SlotCard.tsx";
import { AuthModal } from "./components/AuthModal.tsx";
import { LoginScreen } from "./components/LoginScreen.tsx";
import { useSSE } from "./hooks/useSSE.ts";
import { authFetch } from "./api.ts";

export function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [appMode, setAppMode] = useState<string>("standalone");
  const [registrationEnabled, setRegistrationEnabled] = useState<boolean>(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "tabs">("grid");
  const [activeTab, setActiveTab] = useState(1);

  // SSE only connects when the user is logged in
  const { slots, isLive } = useSSE(!!currentUser);

  // Check config and user session on initial load
  useEffect(() => {
    async function initAuth() {
      try {
        // 1. Fetch public config (standalone vs saas)
        const configRes = await fetch("/api/v1/auth/config").catch(() => null);
        if (configRes && configRes.ok) {
          const configData = await configRes.json();
          if (configData.mode) setAppMode(configData.mode);
          setRegistrationEnabled(Boolean(configData.registrationEnabled));
        }

        // 2. Fetch current session if exists
        const meRes = await authFetch("/api/v1/auth/me").catch(() => null);
        if (meRes && meRes.ok) {
          const meData = await meRes.json();
          if (meData?.user) {
            setCurrentUser(meData.user);
          }
        }
      } catch {
        // Network or offline error
      } finally {
        setIsLoadingAuth(false);
      }
    }

    void initAuth();
  }, []);

  // Initial loading state
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-[#0a0c10] flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-[#f5c518] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-[#8b949e] font-rpg tracking-wider">
          Carregando Idlex...
        </p>
      </div>
    );
  }

  // Not authenticated: render the Login screen
  if (!currentUser) {
    return (
      <LoginScreen
        appMode={appMode}
        registrationEnabled={registrationEnabled}
        onLoginSuccess={setCurrentUser}
      />
    );
  }

  // Authenticated: render the main multi-box dashboard
  return (
    <div className="min-h-screen bg-[#0a0c10] flex flex-col">
      <Header
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        viewMode={viewMode}
        onToggleView={setViewMode}
        isLive={isLive}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6">
        {viewMode === "grid" ? (
          /* Grade 2x2 */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
            {slots.map((slot) => (
              <SlotCard key={slot.id} slot={slot} />
            ))}
          </div>
        ) : (
          /* Visualização por Abas */
          <div>
            <div className="flex border-b border-[#242b38] mb-4 sm:mb-6 gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {slots.map((slot) => (
                <button
                  key={slot.id}
                  onClick={() => setActiveTab(slot.id)}
                  className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-t-lg font-semibold text-xs sm:text-sm transition-all border-b-2 flex items-center gap-1.5 sm:gap-2 shrink-0 ${
                    activeTab === slot.id
                      ? "bg-[#13171f] border-[#f5c518] text-[#f5c518]"
                      : "border-transparent text-[#8b949e] hover:text-white"
                  }`}
                >
                  <span className="w-5 h-5 rounded bg-[#f5c518]/15 border border-[#f5c518]/30 flex items-center justify-center text-xs">
                    {slot.id}
                  </span>
                  <span className="max-w-[100px] sm:max-w-none truncate">
                    {slot.character ? slot.character.name : `Tela ${slot.id}`}
                  </span>
                </button>
              ))}
            </div>

            {slots
              .filter((s) => s.id === activeTab)
              .map((slot) => (
                <div key={slot.id} className="max-w-2xl mx-auto">
                  <SlotCard slot={slot} />
                </div>
              ))}
          </div>
        )}
      </main>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={currentUser}
        onUserChange={setCurrentUser}
        appMode={appMode}
        registrationEnabled={registrationEnabled}
      />
    </div>
  );
}

export default App;
