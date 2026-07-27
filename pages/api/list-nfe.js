import { getSheetsClient, SPREADSHEET_ID } from "../../lib/google-clients";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Método não permitido" });

  try {
    const sheets = getSheetsClient();
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "historico!A:G"
    });
    const rows = result.data.values || [];

    const items = rows
      .map((row) => ({
        data_hora: row[0] || "",
        numero_nfe: row[1] || "",
        razao_social: row[2] || "",
        nome_paciente: row[3] || "",
        nome_vendedora: row[4] || "",
        foto_id: row[5] || "",
        usuario_id: row[6] || ""
      }))
      .reverse()
      .slice(0, 30);

    return res.status(200).json(items);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Falha ao listar: " + (err.message || String(err)) });
  }
}
