import React, { useState } from "react";
import { UserProfile } from "../types/index.ts";
import { User, LogIn, LogOut, Shield, X, CheckCircle, AlertCircle } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onUserChange: (user: UserProfile | null) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChange,
}) => {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [showTotp, setShowTotp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; isError: boolean } | null>(null);

  if (!isOpen) return null;

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
          setFeedback({ msg: "Insira o código de 6 dígitos do seu autenticador 2FA.", isError: true });
        } else {
          setFeedback({ msg: data.error || "Credenciais inválidas.", isError: true });
        }
        return;
      }

      setFeedback({ msg: "Login realizado com sucesso!", isError: false });
      onUserChange(data.user);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch {
      setFeedback({ msg: "Erro de conexão com o servidor.", isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 10) {
      setFeedback({ msg: "A senha deve ter no mínimo 10 caracteres.", isError: true });
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

      setFeedback({ msg: "Conta criada com sucesso! Você já pode entrar.", isError: false });
      setTimeout(() => {
        setTab("login");
      }, 1200);
    } catch {
      setFeedback({ msg: "Erro de rede.", isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
      onUserChange(null);
      onClose();
    } catch {
      onUserChange(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#13171f] border border-[#242b38] rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#242b38]">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#f5c518]" />
            <h2 className="font-rpg text-lg font-bold text-[#f5c518]">Conta Idlex</h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#8b949e] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {feedback && (
            <div
              className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm font-medium ${
                feedback.isError
                  ? "bg-red-950/40 border border-red-800/60 text-red-300"
                  : "bg-emerald-950/40 border border-emerald-800/60 text-emerald-300"
              }`}
            >
              {feedback.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
              <span>{feedback.msg}</span>
            </div>
          )}

          {currentUser ? (
            /* Logged View */
            <div className="space-y-6">
              <div className="bg-[#0d1016] border border-[#242b38] p-4 rounded-xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#f5c518]/10 border border-[#f5c518]/30 flex items-center justify-center text-[#f5c518]">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{currentUser.email}</h3>
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs bg-[#f5c518]/15 text-[#f5c518] px-2 py-0.5 rounded border border-[#f5c518]/30 font-medium">
                      Plano {currentUser.plan || "screens1"}
                    </span>
                    <span className="text-xs bg-[#3498db]/15 text-[#3498db] px-2 py-0.5 rounded border border-[#3498db]/30 font-medium">
                      {currentUser.screens || 1} Telas simultâneas
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-950/30 hover:bg-red-900/40 border border-red-800/50 text-red-300 rounded-lg font-semibold transition-all"
              >
                <LogOut className="w-4 h-4" />
                Encerrar Sessão
              </button>
            </div>
          ) : (
            /* Guest / Form View */
            <div>
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

              {tab === "login" ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#8b949e] uppercase mb-1.5">
                      E-mail
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="seu-email@dominio.com"
                      className="w-full bg-[#0d1016] border border-[#242b38] focus:border-[#f5c518] rounded-lg px-3 py-2 text-white placeholder-[#586069] outline-none text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#8b949e] uppercase mb-1.5">
                      Senha
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••••"
                      className="w-full bg-[#0d1016] border border-[#242b38] focus:border-[#f5c518] rounded-lg px-3 py-2 text-white placeholder-[#586069] outline-none text-sm"
                    />
                  </div>

                  {showTotp && (
                    <div>
                      <label className="block text-xs font-semibold text-[#8b949e] uppercase mb-1.5">
                        Código 2FA (6 dígitos)
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value)}
                        placeholder="123456"
                        className="w-full bg-[#0d1016] border border-[#242b38] focus:border-[#f5c518] rounded-lg px-3 py-2 text-white placeholder-[#586069] outline-none text-sm text-center tracking-widest font-mono"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-2.5 bg-[#f5c518] hover:bg-[#a68411] text-black font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    <LogIn className="w-4 h-4" />
                    {loading ? "Entrando..." : "Acessar Plataforma"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#8b949e] uppercase mb-1.5">
                      E-mail
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="seu-email@dominio.com"
                      className="w-full bg-[#0d1016] border border-[#242b38] focus:border-[#f5c518] rounded-lg px-3 py-2 text-white placeholder-[#586069] outline-none text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#8b949e] uppercase mb-1.5">
                      Senha (mínimo 10 caracteres)
                    </label>
                    <input
                      type="password"
                      value={password}
                      minLength={10}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Mínimo 10 caracteres"
                      className="w-full bg-[#0d1016] border border-[#242b38] focus:border-[#f5c518] rounded-lg px-3 py-2 text-white placeholder-[#586069] outline-none text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-2.5 bg-[#f5c518] hover:bg-[#a68411] text-black font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    <Shield className="w-4 h-4" />
                    {loading ? "Cadastrando..." : "Criar Minha Conta"}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
