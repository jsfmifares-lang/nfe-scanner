import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

export default function Register() {
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");

    if (!/^\d+$/.test(senha)) {
      setErro("A senha deve conter apenas números");
      return;
    }
    if (senha !== confirmar) {
      setErro("As senhas não coincidem");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, senha })
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error || "Falha ao cadastrar");
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
        <div className="brand-icon">N</div>
        <div className="brand-title">NFe Scanner</div>
      </div>
      <div className="card">
        <h1 className="title">Criar conta</h1>
        <p className="subtitle">Preencha para se cadastrar.</p>
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

          <label className="field-label">Confirmar Senha</label>
          <input
            type="password"
            inputMode="numeric"
            pattern="\d*"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            required
          />

          {erro && <div className="error-msg">{erro}</div>}

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Cadastrando..." : "Cadastrar"}
          </button>
        </form>
        <Link href="/login" className="link-btn">Já tenho conta — entrar</Link>
      </div>
    </div>
  );
}
