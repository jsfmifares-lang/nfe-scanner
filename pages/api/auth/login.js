import crypto from "crypto";
import { supabase } from "../../../lib/supabase";

function hashSenha(senha) {
  return crypto.createHash("sha256").update(senha).digest("hex");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const { usuario, senha } = req.body || {};
  if (!usuario || !senha) {
    return res.status(400).json({ error: "Usuário e senha são obrigatórios" });
  }

  try {
    const { data, error } = await supabase
      .from("usuarios")
      .select("id, usuario, senha_hash")
      .eq("usuario", usuario.toLowerCase())
      .maybeSingle();

    if (error) throw error;

    if (!data || data.senha_hash !== hashSenha(senha)) {
      return res.status(401).json({ error: "Usuário ou senha incorretos" });
    }

    return res.status(200).json({ usuario_id: data.id, usuario: data.usuario });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Falha ao entrar: " + (err.message || String(err)) });
  }
}
