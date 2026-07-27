import crypto from "crypto";
import { getSheetsClient, SPREADSHEET_ID } from "../../../lib/google-clients";

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
    const sheets = getSheetsClient();
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "usuarios!A2:C"
    });
    const rows = result.data.values || [];
    const senhaHash = hashSenha(senha);
    const match = rows.find(
      (row) => (row[1] || "").toLowerCase() === usuario.toLowerCase() && row[2] === senhaHash
    );

    if (!match) {
      return res.status(401).json({ error: "Usuário ou senha incorretos" });
    }

    return res.status(200).json({ usuario_id: match[0], usuario: match[1] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Falha ao entrar: " + (err.message || String(err)) });
  }
}
