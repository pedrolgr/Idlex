import React, { useState } from "react";
import { UserProfile } from "../types/index.ts";
import { Shield, Lock, User, LogIn, AlertCircle, CheckCircle, Server } from "lucide-react";

interface LoginScreenProps {
  appMode: string;
  registrationEnabled: boolean;
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  appMode,
  registrationEnabled,
  onLoginSuccess,
}) => {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [showTotp, setShowTotp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; isError: boolean } | null>(null);

  const isStandalone = appMode !== "saas" || !registrationEnabled;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, totpCode: totpCode || undefined }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.code === "MFA_REQUIRED") {
          setShowTotp(true);
          setFeedback({ msg: "Insira o token 2FA de 6 dígitos.", isError: true });
        } else {
          setFeedback({ msg: data.error || "Credenciais inválidas.", isError: true });
        }
        return;
      }

      setFeedback({ msg: "Autenticado com sucesso! Redirecionando...", isError: false });
      setTimeout(() => {
        onLoginSuccess(data.user);
      }, 400);
    } catch {
      setFeedback({ msg: "Não foi possível conectar ao servidor.", isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 10) {
      setFeedback({ msg: "A senha deve conter no mínimo 10 caracteres.", isError: true });
      return;
    }
    setLoading(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFeedback({ msg: data.error || "Falha ao registrar.", isError: true });
        return;
      }

      setFeedback({ msg: "Conta criada com sucesso! Faça login para continuar.", isError: false });
      setTimeout(() => {
        setTab("login");
      }, 1000);
    } catch {
      setFeedback({ msg: "Erro de comunicação com o servidor.", isError: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0c10] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#f5c518]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#13171f] border border-[#242b38] rounded-2xl shadow-2xl p-8 relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#0d1016] border border-[#242b38] flex items-center justify-center text-3xl shadow-inner mb-3">
            🗡️
          </div>
          <h1 className="font-rpg text-2xl font-bold tracking-widest text-[#f5c518] leading-tight">
            IDLEX HUNTERA
          </h1>
          <p className="text-xs text-[#8b949e] font-semibold mt-1">
            Painel de Controle Multi-Box
          </p>

          {/* Mode Tag */}
          <div className="mt-3">
            {isStandalone ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#f5c518]/10 text-[#f5c518] border border-[#f5c518]/30">
                <Server className="w-3.5 h-3.5" />
                Modo Standalone (Acesso Restrito)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <Shield className="w-3.5 h-3.5" />
                Modo Produção SaaS
              </span>
            )}
          </div>
        </div>

        {/* Tab selector for SaaS mode */}
        {!isStandalone && (
          <div className="flex border-b border-[#242b38] mb-6">
            <button
              type="button"
              onClick={() => {
                setTab("login");
                setFeedback(null);
              }}
              className={`flex-1 pb-3 font-semibold text-sm transition-all border-b-2 ${
                tab === "login"
                  ? "border-[#f5c518] text-[#f5c518]"
                  : "border-transparent text-[#8b949e] hover:text-white"
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("register");
                setFeedback(null);
              }}
              className={`flex-1 pb-3 font-semibold text-sm transition-all border-b-2 ${
                tab === "register"
                  ? "border-[#f5c518] text-[#f5c518]"
                  : "border-transparent text-[#8b949e] hover:text-white"
              }`}
            >
              Criar Conta
            </button>
          </div>
        )}

        {/* Feedback alert */}
        {feedback && (
          <div
            className={`mb-5 p-3 rounded-lg flex items-center gap-2 text-sm font-medium ${
              feedback.isError
                ? "bg-red-950/40 border border-red-800/60 text-red-300"
                : "bg-emerald-950/40 border border-emerald-800/60 text-emerald-300"
            }`}
          >
            {feedback.isError ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.msg}</span>
          </div>
        )}

        {/* Forms */}
        {tab === "login" || isStandalone ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#8b949e] uppercase mb-1.5">
                E-mail
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu-email@exemplo.com"
                  className="w-full bg-[#0d1016] border border-[#242b38] rounded-lg px-3.5 py-2.5 pl-10 text-sm text-white placeholder-[#8b949e]/50 focus:outline-none focus:border-[#f5c518] transition-colors"
                />
                <User className="w-4 h-4 text-[#8b949e] absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8b949e] uppercase mb-1.5">
                Senha
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#0d1016] border border-[#242b38] rounded-lg px-3.5 py-2.5 pl-10 text-sm text-white placeholder-[#8b949e]/50 focus:outline-none focus:border-[#f5c518] transition-colors"
                />
                <Lock className="w-4 h-4 text-[#8b949e] absolute left-3.5 top-3" />
              </div>
            </div>

            {showTotp && (
              <div>
                <label className="block text-xs font-semibold text-[#f5c518] uppercase mb-1.5">
                  Autenticação 2FA (6 dígitos)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="w-full bg-[#0d1016] border border-[#f5c518] rounded-lg px-3.5 py-2.5 pl-10 text-sm text-white tracking-widest text-center font-mono focus:outline-none"
                  />
                  <Shield className="w-4 h-4 text-[#f5c518] absolute left-3.5 top-3" />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-gradient-to-r from-[#f5c518] to-[#e6b800] hover:brightness-110 active:brightness-95 text-[#0a0c10] font-bold rounded-lg text-sm transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-[#0a0c10] border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Acessar Painel</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#8b949e] uppercase mb-1.5">
                E-mail para Cadastro
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full bg-[#0d1016] border border-[#242b38] rounded-lg px-3.5 py-2.5 pl-10 text-sm text-white placeholder-[#8b949e]/50 focus:outline-none focus:border-[#f5c518] transition-colors"
                />
                <User className="w-4 h-4 text-[#8b949e] absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8b949e] uppercase mb-1.5">
                Senha (mínimo 10 caracteres)
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  minLength={10}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#0d1016] border border-[#242b38] rounded-lg px-3.5 py-2.5 pl-10 text-sm text-white placeholder-[#8b949e]/50 focus:outline-none focus:border-[#f5c518] transition-colors"
                />
                <Lock className="w-4 h-4 text-[#8b949e] absolute left-3.5 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-[#f5c518] hover:bg-[#e6b800] text-[#0a0c10] font-bold rounded-lg text-sm transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-[#0a0c10] border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Registrar Nova Conta</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>

      <footer className="mt-8 text-center text-xs text-[#8b949e]/60">
        Idlex Huntera · Solução Multi-Box & Telemetria
      </footer>
    </div>
  );
};
