import { getSheetsClient, SPREADSHEET_ID } from "../../../lib/google-clients";
import { uploadToDrive } from "../../../lib/upload";

export const config = {
  api: {
    bodyParser: { sizeLimit: "10mb" }
  }
};

// Mensagens de áudio são guardadas como "AUDIO::<fileId>" na planilha,
// pra diferenciar de mensagens de texto normais.

export default async function handler(req, res) {
  const sheets = getSheetsClient();

  if (req.method === "GET") {
    try {
      const result = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "chat!A:C"
      });
      const rows = result.data.values || [];
      const messages = rows.map((row, idx) => ({
        chat_id: String(idx),
        data_hora: row[0] || "",
        remetente: row[1] || "",
        mensagem: row[2] || ""
      }));
      return res.status(200).json(messages.slice(-100));
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Falha ao ler mensagens: " + (err.message || String(err)) });
    }
  }

  if (req.method === "POST") {
    try {
      const { remetente, mensagem, audioDataUrl, ext } = req.body || {};
      if (!remetente) return res.status(400).json({ error: "remetente obrigatório" });

      let texto = mensagem || "";
      if (audioDataUrl) {
        const extensao = ext || "webm";
        const filename = `audio_${Date.now()}.${extensao}`;
        const fileId = await uploadToDrive(audioDataUrl, filename);
        texto = `AUDIO::${fileId}`;
      }
      if (!texto) return res.status(400).json({ error: "Mensagem vazia" });

      const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: "chat!A:C",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[now, remetente, texto]] }
      });

      return res.status(200).json({ data_hora: now, remetente, mensagem: texto });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Falha ao enviar: " + (err.message || String(err)) });
    }
  }

  return res.status(405).json({ error: "Método não permitido" });
}
