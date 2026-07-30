import { getSheetsClient, SPREADSHEET_ID } from "../../lib/google-clients";
import { uploadToDrive } from "../../lib/upload";

export const config = {
  api: {
    bodyParser: { sizeLimit: "10mb" }
  }
};

const USUARIOS_AUTORIZADOS = ["esterfane", "wiliam", "johnny"];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const { nfe, dataUrl, usuario } = req.body || {};
  if (!nfe || !dataUrl) return res.status(400).json({ error: "Dados incompletos" });

  if (!USUARIOS_AUTORIZADOS.includes((usuario || "").trim().toLowerCase())) {
    return res.status(403).json({ error: "Usuário não autorizado a enviar NFe" });
  }

  try {
    const fileUrl = await uploadToDrive(dataUrl, "app_nfes");

    const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const values = [[
      now,
      nfe.numero_nfe || "",
      nfe.razao_social || "",
      nfe.nome_paciente || "",
      nfe.nome_vendedora || "",
      fileUrl,
      usuario || ""
    ]];

    const sheets = getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "historico!A:G",
      valueInputOption: "USER_ENTERED",
      requestBody: { values }
    });

    return res.status(200).json({
      data_hora: now,
      numero_nfe: nfe.numero_nfe || "",
      razao_social: nfe.razao_social || "",
      nome_paciente: nfe.nome_paciente || "",
      nome_vendedora: nfe.nome_vendedora || "",
      foto_url: fileUrl
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Falha ao salvar: " + (err.message || String(err)) });
  }
}
