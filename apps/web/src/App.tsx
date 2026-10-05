import { useState, useEffect } from "react";
import { UserProfile } from "./types/index.ts";
import { Header } from "./components/Header.tsx";
import { SlotCard } from "./components/SlotCard.tsx";
import { AuthModal } from "./components/AuthModal.tsx";
import { useSSE } from "./hooks/useSSE.ts";

export function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "tabs">("grid");
  const [activeTab, setActiveTab] = useState(1);
  const { slots, isLive } = useSSE();

  // Check user session on initial load
  useEffect(() => {
    fetch("/api/v1/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0c10] flex flex-col">
      <Header
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        viewMode={viewMode}
        onToggleView={setViewMode}
        isLive={isLive}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        {viewMode === "grid" ? (
          /* Grade 2x2 */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {slots.map((slot) => (
              <SlotCard key={slot.id} slot={slot} />
            ))}
          </div>
        ) : (
          /* Visualização por Abas */
          <div>
            <div className="flex border-b border-[#242b38] mb-6 gap-2">
              {slots.map((slot) => (
                <button
                  key={slot.id}
                  onClick={() => setActiveTab(slot.id)}
                  className={`px-5 py-2.5 rounded-t-lg font-semibold text-sm transition-all border-b-2 flex items-center gap-2 ${
                    activeTab === slot.id
                      ? "bg-[#13171f] border-[#f5c518] text-[#f5c518]"
                      : "border-transparent text-[#8b949e] hover:text-white"
                  }`}
                >
                  <span className="w-5 h-5 rounded bg-[#f5c518]/15 border border-[#f5c518]/30 flex items-center justify-center text-xs">
                    {slot.id}
                  </span>
                  <span>{slot.character ? slot.character.name : `Tela ${slot.id}`}</span>
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
      />
    </div>
  );
}

export default App;
