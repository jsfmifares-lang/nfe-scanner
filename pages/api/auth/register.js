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
  if (!/^\d+$/.test(senha)) {
    return res.status(400).json({ error: "A senha deve conter apenas números" });
  }

  try {
    const { data: existing } = await supabase
      .from("usuarios")
      .select("id")
      .eq("usuario", usuario.toLowerCase())
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: "Esse usuário já existe" });
    }

    const { data, error } = await supabase
      .from("usuarios")
      .insert({ usuario: usuario.toLowerCase(), senha_hash: hashSenha(senha) })
      .select("id, usuario")
      .single();

    if (error) throw error;

    return res.status(200).json({ usuario_id: data.id, usuario: data.usuario });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Falha ao cadastrar: " + (err.message || String(err)) });
  }
}
