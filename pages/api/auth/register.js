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
  if (!/^\d+$/.test(senha)) {
    return res.status(400).json({ error: "A senha deve conter apenas números" });
  }

  try {
    const sheets = getSheetsClient();

    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "usuarios!A2:C"
    });
    const rows = existing.data.values || [];
    const jaExiste = rows.some((row) => (row[1] || "").toLowerCase() === usuario.toLowerCase());
    if (jaExiste) {
      return res.status(409).json({ error: "Esse usuário já existe" });
    }

    const usuarioId = crypto.randomUUID();
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "usuarios!A:C",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[usuarioId, usuario, hashSenha(senha)]] }
    });

    return res.status(200).json({ usuario_id: usuarioId, usuario });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Falha ao cadastrar: " + (err.message || String(err)) });
  }
}
