import { getSheetsClient, SPREADSHEET_ID } from "../../../lib/google-clients";
import { uploadToDrive } from "../../../lib/upload";

export const config = {
  api: {
    bodyParser: { sizeLimit: "10mb" }
  }
};

export default async function handler(req, res) {
  const sheets = getSheetsClient();

  if (req.method === "GET") {
    try {
      const result = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "chat!A:D"
      });
      const rows = result.data.values || [];
      const messages = rows.map((row, idx) => ({
        chat_id: String(idx),
        data_hora: row[0] || "",
        remetente: row[1] || "",
        mensagem: row[2] || "",
        eh_audio: (row[3] || "") === "audio"
      }));
      return res.status(200).json(messages.slice(-100));
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Falha ao ler mensagens: " + (err.message || String(err)) });
    }
  }

  if (req.method === "POST") {
    try {
      const { remetente, mensagem, audioDataUrl } = req.body || {};
      if (!remetente) return res.status(400).json({ error: "remetente obrigatório" });

      let texto = mensagem || "";
      let tipo = "texto";

      if (audioDataUrl) {
        texto = await uploadToDrive(audioDataUrl, "app_audios");
        tipo = "audio";
      }

      if (!texto) return res.status(400).json({ error: "Mensagem vazia" });

      const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: "chat!A:D",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[now, remetente, texto, tipo]] }
      });

      return res.status(200).json({ data_hora: now, remetente, mensagem: texto, eh_audio: tipo === "audio" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Falha ao enviar: " + (err.message || String(err)) });
    }
  }

  return res.status(405).json({ error: "Método não permitido" });
}
