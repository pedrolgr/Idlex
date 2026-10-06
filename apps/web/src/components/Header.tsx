import React from "react";
import { UserProfile } from "../types/index.ts";
import { User, LayoutGrid, Columns, Radio } from "lucide-react";

interface HeaderProps {
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  viewMode: "grid" | "tabs";
  onToggleView: (mode: "grid" | "tabs") => void;
  isLive: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onOpenAuth,
  viewMode,
  onToggleView,
  isLive,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#13171f] border-b border-[#242b38] px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2">
      {/* Brand */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <span className="text-xl sm:text-2xl shrink-0">🗡️</span>
        <div className="min-w-0">
          <h1 className="font-rpg text-base sm:text-xl font-bold tracking-wider sm:tracking-widest text-[#f5c518] leading-tight truncate">
            IDLEX
          </h1>
          <p className="hidden sm:block text-[10px] text-[#8b949e] uppercase tracking-wider font-semibold truncate">
            Huntera Multi-Box Dashboard
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
        {/* View Mode Toggle */}
        <div className="bg-[#0d1016] border border-[#242b38] p-0.5 rounded-lg flex items-center">
          <button
            onClick={() => onToggleView("grid")}
            aria-label="Grade 2x2"
            title="Grade 2x2"
            className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              viewMode === "grid"
                ? "bg-[#242b38] text-[#f5c518]"
                : "text-[#8b949e] hover:text-white"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Grade 2x2</span>
          </button>
          <button
            onClick={() => onToggleView("tabs")}
            aria-label="Visualização em Abas"
            title="Abas"
            className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              viewMode === "tabs"
                ? "bg-[#242b38] text-[#f5c518]"
                : "text-[#8b949e] hover:text-white"
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Abas</span>
          </button>
        </div>

        {/* Live Indicator */}
        <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-[#0d1016] border border-[#242b38] rounded-full text-xs font-semibold">
          <Radio
            className={`w-3.5 h-3.5 ${
              isLive ? "text-emerald-400 animate-pulse" : "text-gray-500"
            }`}
          />
          <span className={`text-[11px] sm:text-xs ${isLive ? "text-emerald-400" : "text-gray-500"}`}>
            {isLive ? "Ao Vivo" : "..."}
          </span>
        </div>

        {/* User Profile Button */}
        <button
          onClick={onOpenAuth}
          aria-label="Conta do Usuário"
          title={currentUser ? currentUser.email : "Entrar"}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition-all max-w-[120px] sm:max-w-[180px] ${
            currentUser
              ? "bg-[#0d1016] border-emerald-600/50 text-emerald-400 hover:border-emerald-500"
              : "bg-[#0d1016] border-[#242b38] text-white hover:border-[#f5c518]"
          }`}
        >
          <User className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{currentUser ? currentUser.email.split("@")[0] : "Entrar"}</span>
        </button>
      </div>
    </header>
  );
};
