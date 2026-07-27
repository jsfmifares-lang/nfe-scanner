import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

export default function Login() {
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, senha })
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error || "Falha ao entrar");
        return;
      }
      localStorage.setItem("nfe_user", JSON.stringify(data));
      router.push("/app");
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="brand">
        <div className="brand-icon">📄</div>
        <div>
          <div className="brand-title">NFe Scanner</div>
        </div>
      </div>
      <div className="card">
        <h1 className="title">Entrar</h1>
        <p className="subtitle">Acesse com seu usuário e senha.</p>
        <form onSubmit={handleSubmit}>
          <label className="field-label">Usuário</label>
          <input type="text" value={usuario} onChange={(e) => setUsuario(e.target.value)} required />

          <label className="field-label">Senha</label>
          <input
            type="password"
            inputMode="numeric"
            pattern="\d*"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />

          {erro && <div className="error-msg">{erro}</div>}

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
        <Link href="/register" className="link-btn">Criar conta</Link>
      </div>
    </div>
  );
}
