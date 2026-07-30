import Tesseract from "tesseract.js";

export const config = {
  api: { bodyParser: { sizeLimit: "10mb" } }
};

function extrairCampo(texto, padroes) {
  for (const p of padroes) {
    const m = texto.match(p);
    if (m) return m[1]?.trim() || m[0]?.trim() || "";
  }
  return "";
}

function parseNfe(texto) {
  const t = texto
    .replace(/\s+/g, " ")
    .replace(/•/g, "")
    .trim();

  const numero = extrairCampo(t, [
    /(\d{2}\.\d{3}\.\d{3}\.\d{3}\.\d{3})/,
    /(\d{44})/,
    /(?:N[°º]\s*[:\s]*?\d{9})/,
    /N[°º]\s*[:\s]*?(\d[\d\s]{8,})/,
  ]);

  const razao = extrairCampo(t, [
    /(?:DESTINAT[ÁA]RIO|REMETENTE|CLIENTE)[\s:]*?\n?([A-ZÀ-Ú][A-ZÀ-Ú\s]{3,50})/i,
    /(?:RAZ[ÃA]O SOCIAL|RAZÃO)[\s:]*?([A-ZÀ-Ú][A-ZÀ-Ú\s]{3,50})/i,
  ]);

  let paciente = extrairCampo(t, [
    /(?:PACIENTE|PACIÊNCIA)[\s:]*?([A-ZÀ-Ú][A-ZÀ-Ú\s]{3,50})/i,
    /(?:NOME\s*(?:DO\s*)?PACIENTE)[\s:]*?([A-ZÀ-Ú][A-ZÀ-Ú\s]{2,50})/i,
  ]);

  let vendedora = extrairCampo(t, [
    /(?:VENDEDORA|VENDEDOR)[\s:]*?([A-ZÀ-Ú][A-ZÀ-Ú\s]{3,50})/i,
    /(?:VENDEDORA\s*(?:DO\s*)?(?:A\s*)?)?(?:NOME\s*)?[\s:]*?([A-ZÀ-Ú][A-ZÀ-Ú\s]{2,50})/i,
  ]);

  if (!paciente && !vendedora) {
    const linhas = t.split("\n").filter((l) => l.trim().length > 5);
    const candidatos = linhas.filter(
      (l) => /[A-ZÀ-Ú]{3,}/.test(l) && !/\d{6,}/.test(l) && l.split(" ").length >= 2
    );
    if (candidatos.length >= 2) {
      paciente = candidatos[candidatos.length - 2].trim();
      vendedora = candidatos[candidatos.length - 1].trim();
    }
  }

  return {
    numero_nfe: numero || "",
    razao_social: razao || "",
    nome_paciente: paciente || "",
    nome_vendedora: vendedora || ""
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const { imageDataUrl } = req.body || {};
  if (!imageDataUrl) return res.status(400).json({ error: "imageDataUrl obrigatório" });

  const m = imageDataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!m) return res.status(400).json({ error: "Imagem inválida" });

  try {
    const buffer = Buffer.from(m[2], "base64");
    const { data } = await Tesseract.recognize(buffer, "por", {
      logger: () => {}
    });
    const parsed = parseNfe(data.text);
    return res.status(200).json(parsed);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao processar imagem: " + (err.message || String(err)) });
  }
}
