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
    <header className="sticky top-0 z-40 bg-[#13171f] border-b border-[#242b38] px-6 py-3 flex items-center justify-between">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <span className="text-2xl">🗡️</span>
        <div>
          <h1 className="font-rpg text-xl font-bold tracking-widest text-[#f5c518] leading-tight">
            IDLEX
          </h1>
          <p className="text-[10px] text-[#8b949e] uppercase tracking-wider font-semibold">
            Huntera Multi-Box Dashboard
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        {/* View Mode Toggle */}
        <div className="bg-[#0d1016] border border-[#242b38] p-0.5 rounded-lg flex items-center">
          <button
            onClick={() => onToggleView("grid")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              viewMode === "grid"
                ? "bg-[#242b38] text-[#f5c518]"
                : "text-[#8b949e] hover:text-white"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Grade 2x2
          </button>
          <button
            onClick={() => onToggleView("tabs")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              viewMode === "tabs"
                ? "bg-[#242b38] text-[#f5c518]"
                : "text-[#8b949e] hover:text-white"
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            Abas
          </button>
        </div>

        {/* Live Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0d1016] border border-[#242b38] rounded-full text-xs font-semibold">
          <Radio
            className={`w-3.5 h-3.5 ${
              isLive ? "text-emerald-400 animate-pulse" : "text-gray-500"
            }`}
          />
          <span className={isLive ? "text-emerald-400" : "text-gray-500"}>
            {isLive ? "Ao Vivo" : "Conectando..."}
          </span>
        </div>

        {/* User Profile Button */}
        <button
          onClick={onOpenAuth}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
            currentUser
              ? "bg-[#0d1016] border-emerald-600/50 text-emerald-400 hover:border-emerald-500"
              : "bg-[#0d1016] border-[#242b38] text-white hover:border-[#f5c518]"
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>{currentUser ? currentUser.email.split("@")[0] : "Entrar"}</span>
        </button>
      </div>
    </header>
  );
};
