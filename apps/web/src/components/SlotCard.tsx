import React, { useState } from "react";
import { SlotData } from "../types/index.ts";
import { authFetch } from "../api.ts";
import {
  Swords,
  Heart,
  Sparkles,
  Coins,
  Skull,
  Play,
  Square,
  LogIn,
  LogOut,
  Clock,
  Shield,
  Activity,
} from "lucide-react";

interface SlotCardProps {
  slot: SlotData;
  onRefresh?: () => void;
}

export const SlotCard: React.FC<SlotCardProps> = ({ slot }) => {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const char = slot.character;
  const sess = slot.session;

  const handleSlotLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;

    setLoading(true);
    setFeedback(null);
    try {
      // 1. Connect slot
      const res = await authFetch(`/api/slots/${slot.id}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback(data.error || "Falha ao conectar no Huntera");
        return;
      }

      // 2. Save preference if remember is checked (Phase 4)
      if (remember) {
        await authFetch(`/api/v1/accounts/${slot.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: loginEmail, remember: true }),
        }).catch(() => {});
      }
    } catch {
      setFeedback("Erro de rede ao conectar.");
    } finally {
      setLoading(false);
    }
  };

  const handleSlotLogout = async () => {
    setLoading(true);
    try {
      await authFetch(`/api/slots/${slot.id}/logout`, { method: "POST" });
    } finally {
      setLoading(false);
    }
  };

  const handleStartHunt = async () => {
    try {
      await authFetch(`/api/slots/${slot.id}/hunt/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ huntId: "default", tier: 0 }),
      });
    } catch {}
  };

  const handleStopHunt = async () => {
    try {
      await authFetch(`/api/slots/${slot.id}/hunt/leave`, { method: "POST" });
    } catch {}
  };

  const handleBuyBlessings = async () => {
    try {
      await authFetch(`/api/slots/${slot.id}/blessings/buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "all" }),
      });
    } catch {}
  };

  // Status Badge Helper
  const renderStatusBadge = () => {
    switch (slot.status) {
      case "hunting":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950/60 border border-emerald-600/40 text-emerald-400 text-xs font-semibold rounded-full animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Caçando
          </span>
        );
      case "dead":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-950/60 border border-red-600/40 text-red-400 text-xs font-semibold rounded-full">
            <Skull className="w-3.5 h-3.5" />
            Morto
          </span>
        );
      case "connected":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-950/60 border border-blue-600/40 text-blue-400 text-xs font-semibold rounded-full">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            Conectado
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-900 border border-gray-700 text-gray-400 text-xs font-semibold rounded-full">
            Inativo
          </span>
        );
    }
  };

  return (
    <div className="bg-[#13171f] hover:bg-[#181d27] border border-[#242b38] hover:border-[#d4af37]/60 rounded-xl overflow-hidden transition-all shadow-xl flex flex-col justify-between">
      {/* Slot Header */}
      <div className="px-3.5 sm:px-5 py-3 sm:py-4 border-b border-[#242b38] flex items-center justify-between gap-2 bg-[#0d1016]">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-7 h-7 sm:w-8 h-8 rounded-lg bg-[#f5c518]/15 border border-[#f5c518]/30 flex items-center justify-center font-rpg font-bold text-[#f5c518] text-xs sm:text-base shrink-0">
            {slot.id}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-white text-sm sm:text-base leading-tight truncate">
              {char ? char.name : `Tela ${slot.id}`}
            </h3>
            <span className="text-[11px] sm:text-xs text-[#8b949e] truncate block">
              {char ? `Nível ${char.level} • ${char.vocation}` : "Nenhum personagem ativo"}
            </span>
          </div>
        </div>
        <div className="shrink-0">
          {renderStatusBadge()}
        </div>
      </div>

      {/* Slot Body */}
      <div className="p-3.5 sm:p-5 flex-1">
        {slot.status === "idle" ? (
          /* Login to Huntera Form */
          <form onSubmit={handleSlotLogin} method="post" autoComplete="on" className="space-y-3.5 my-2">
            <div>
              <label htmlFor={`slot-${slot.id}-email`} className="block text-xs font-semibold text-[#8b949e] uppercase mb-1">
                E-mail Huntera
              </label>
              <input
                id={`slot-${slot.id}-email`}
                name="username"
                type="email"
                required
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="conta@huntera.com.br"
                className="w-full bg-[#0d1016] border border-[#242b38] focus:border-[#f5c518] rounded-lg px-3 py-2 text-white placeholder-[#586069] outline-none text-sm"
              />
            </div>
            <div>
              <label htmlFor={`slot-${slot.id}-password`} className="block text-xs font-semibold text-[#8b949e] uppercase mb-1">
                Senha Huntera
              </label>
              <input
                id={`slot-${slot.id}-password`}
                name="password"
                type="password"
                required
                autoComplete="current-password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••••"
                className="w-full bg-[#0d1016] border border-[#242b38] focus:border-[#f5c518] rounded-lg px-3 py-2 text-white placeholder-[#586069] outline-none text-sm"
              />
            </div>

            {/* Remember Credentials Option (Phase 4 Choice) */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id={`rem-slot-${slot.id}`}
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded bg-[#0d1016] border-[#242b38] text-[#f5c518] focus:ring-0 cursor-pointer"
              />
              <label htmlFor={`rem-slot-${slot.id}`} className="text-xs text-[#8b949e] cursor-pointer">
                Lembrar conta neste dispositivo
              </label>
            </div>

            {feedback && (
              <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/40 p-2 rounded">
                {feedback}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2 bg-[#f5c518] hover:bg-[#a68411] text-black font-bold rounded-lg transition-all flex items-center justify-center gap-2 text-sm shadow disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              {loading ? "Conectando..." : "Conectar Conta"}
            </button>
          </form>
        ) : (
          /* Active Character & Hunt Dashboard */
          <div className="space-y-4">
            {/* Vitals (HP & Mana) */}
            {char && (
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="flex items-center gap-1 text-red-400">
                      <Heart className="w-3.5 h-3.5" /> Vida (HP)
                    </span>
                    <span>
                      {(char.hp || 0).toLocaleString()} / {(char.maxHp || 1).toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-[#0d1016] rounded-full overflow-hidden border border-[#242b38]">
                    <div
                      className="h-full bg-red-500 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.round(((char.hp || 0) / (char.maxHp || 1)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="flex items-center gap-1 text-blue-400">
                      <Sparkles className="w-3.5 h-3.5" /> Mana
                    </span>
                    <span>
                      {(char.mana || 0).toLocaleString()} / {(char.maxMana || 1).toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-[#0d1016] rounded-full overflow-hidden border border-[#242b38]">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.round(((char.mana || 0) / (char.maxMana || 1)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Hunt Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="bg-[#0d1016] p-2.5 rounded-lg border border-[#242b38]">
                <span className="text-[#8b949e] flex items-center gap-1 mb-0.5">
                  <Swords className="w-3.5 h-3.5 text-[#f5c518]" /> Monstros
                </span>
                <span className="font-bold text-white text-sm">
                  {sess?.monsterDeaths ?? sess?.kills ?? 0} abatidos
                </span>
              </div>

              <div className="bg-[#0d1016] p-2.5 rounded-lg border border-[#242b38]">
                <span className="text-[#8b949e] flex items-center gap-1 mb-0.5">
                  <Coins className="w-3.5 h-3.5 text-emerald-400" /> Balanço/h
                </span>
                <span className="font-bold text-emerald-400 text-sm">
                  {sess?.rates?.balancePerHour ? `${sess.rates.balancePerHour.toLocaleString()} gp/h` : "0 gp/h"}
                </span>
              </div>

              <div className="bg-[#0d1016] p-2.5 rounded-lg border border-[#242b38]">
                <span className="text-[#8b949e] flex items-center gap-1 mb-0.5">
                  <Activity className="w-3.5 h-3.5 text-purple-400" /> XP/h
                </span>
                <span className="font-bold text-purple-400 text-sm">
                  {sess?.rates?.xpPerHour ? `${sess.rates.xpPerHour.toLocaleString()} xp/h` : "0 xp/h"}
                </span>
              </div>

              <div className="bg-[#0d1016] p-2.5 rounded-lg border border-[#242b38]">
                <span className="text-[#8b949e] flex items-center gap-1 mb-0.5">
                  <Clock className="w-3.5 h-3.5 text-[#3498db]" /> Duração
                </span>
                <span className="font-bold text-white text-sm">
                  {sess?.elapsedMs ? `${Math.floor(sess.elapsedMs / 60000)}m` : "0m"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Slot Footer Controls */}
      {slot.status !== "idle" && (
        <div className="px-3.5 sm:px-5 py-3 border-t border-[#242b38] bg-[#0d1016] flex flex-wrap items-center justify-between gap-2">
          {slot.status === "hunting" ? (
            <button
              onClick={handleStopHunt}
              className="flex-1 min-w-[100px] py-2 sm:py-1.5 px-3 bg-red-950/40 hover:bg-red-900/50 border border-red-700/50 text-red-300 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all"
            >
              <Square className="w-3.5 h-3.5" />
              Parar Hunt
            </button>
          ) : (
            <button
              onClick={handleStartHunt}
              className="flex-1 min-w-[100px] py-2 sm:py-1.5 px-3 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-600/50 text-emerald-300 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all"
            >
              <Play className="w-3.5 h-3.5" />
              Iniciar Hunt
            </button>
          )}

          <button
            onClick={handleBuyBlessings}
            title="Comprar 5 Bênçãos"
            className="py-2 sm:py-1.5 px-3 bg-[#f5c518]/10 hover:bg-[#f5c518]/20 border border-[#f5c518]/30 text-[#f5c518] text-xs font-semibold rounded-lg flex items-center gap-1 transition-all"
          >
            <Shield className="w-3.5 h-3.5" />
            Bênçãos
          </button>

          <button
            onClick={handleSlotLogout}
            title="Desconectar Slot"
            className="p-2 sm:p-1.5 text-[#8b949e] hover:text-red-400 transition-colors rounded-lg bg-[#13171f] sm:bg-transparent border border-[#242b38] sm:border-transparent"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
