import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught React Error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "30px", background: "#13171f", color: "#f87171", fontFamily: "sans-serif", minHeight: "100vh" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "10px", color: "#f5c518" }}>
            Erro de Renderização na Aplicação
          </h2>
          <p style={{ color: "#d1d5db", marginBottom: "16px" }}>
            Ocorreu uma exceção não tratada ao renderizar o painel:
          </p>
          <pre style={{ background: "#0d1016", padding: "16px", borderRadius: "8px", border: "1px solid #dc2626", overflowX: "auto" }}>
            {this.state.error?.stack || this.state.error?.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: "20px", padding: "8px 16px", background: "#f5c518", color: "#000", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
          >
            Recarregar Página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
