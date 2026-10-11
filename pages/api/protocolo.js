import { google } from "googleapis";

const HEADER = ['id','data_protocolo','codigo_barras','tipo_doc','numero_doc','cliente_hospital','paciente','tipo_devolucao','observacao','status','usuario'];

function auth() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || "";
  privateKey = privateKey.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) throw new Error("Faltam GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY");
  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

export default async function handler(req, res) {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID || process.env.GOOGLE_SPREADSHEET_ID;
  if (!spreadsheetId) return res.status(500).json({ error: "Falta GOOGLE_SHEET_ID" });
  try {
    const sheets = google.sheets({ version: "v4", auth: auth() });
    const tab = "Protocolo";

    if (req.method === "GET") {
      const r = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${tab}!A:K` });
      const rows = r.data.values || [];
      const dados = rows.slice(1).filter((x) => x[0] || x[4] || x[5]).map((x) => ({
        id: x[0] || "", data_protocolo: x[1] || "", codigo_barras: x[2] || "",
        tipo_doc: x[3] || "", numero_doc: x[4] || "", cliente_hospital: x[5] || "",
        paciente: x[6] || "", tipo_devolucao: x[7] || "", observacao: x[8] || "",
        status: x[9] || "", usuario: x[10] || "",
      })).reverse();
      return res.status(200).json({ success: true, dados });
    }

    if (req.method === "POST") {
      const b = req.body || {};
      if (!b.numero_doc || !b.cliente_hospital) {
        return res.status(400).json({ error: "Nota e Cliente/Hospital são obrigatórios" });
      }
      const id = "P" + Date.now();
      const agora = new Date().toLocaleDateString("pt-BR");
      await sheets.spreadsheets.values.append({
        spreadsheetId, range: `${tab}!A:K`, valueInputOption: "USER_ENTERED",
        requestBody: { values: [[
          id, agora, b.codigo_barras || "", b.tipo_doc || "NOTA", String(b.numero_doc),
          b.cliente_hospital, b.paciente || "N/D", b.tipo_devolucao || "",
          b.observacao || "", b.status || "AGUARDANDO CONFIRMAÇÃO DA MENTOR!", b.usuario || "",
        ]]},
      });
      return res.status(200).json({ success: true, id });
    }

    return res.status(405).json({ error: "Método não permitido" });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
