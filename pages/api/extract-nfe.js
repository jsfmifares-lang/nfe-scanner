export const config = {
  api: { bodyParser: { sizeLimit: "10mb" } }
};

const PROMPT = `Você é um assistente que extrai dados de imagens de notas fiscais brasileiras (NFe/DANFE) e vales/pedidos.

Identifique o tipo do documento e extraia:
- numero_nfe: número da NF-e (campo "Nº") ou número após "Numero Pedido :"
- razao_social: nome do DESTINATÁRIO/REMETENTE (NÃO o emitente) ou Cliente
- nome_paciente: nome da paciente (se houver)
- nome_vendedora: nome da vendedora (se houver)

Retorne APENAS UM JSON VÁLIDO, sem markdown, sem texto extra, sem acentos, exatamente neste formato:
{"numero_nfe":"...","razao_social":"...","nome_paciente":"...","nome_vendedora":"..."}
Se não encontrar um campo, use "" (string vazia).`;

async function tentar(modelo, apiVer, key, imagem) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/${apiVer}/models/${modelo}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: PROMPT }, { inlineData: imagem }] }]
      })
    }
  );
  if (!res.ok) return null;
  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const jm = text.match(/\{[\s\S]*"numero_nfe"[\s\S]*\}/);
  if (jm) {
    try { return JSON.parse(jm[0]); } catch {}
  }
  try { return JSON.parse(text); } catch {}
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: "GEMINI_API_KEY ausente" });

  const { imageDataUrl } = req.body || {};
  if (!imageDataUrl) return res.status(400).json({ error: "imageDataUrl obrigatório" });

  const m = imageDataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!m) return res.status(400).json({ error: "Imagem inválida" });

  const imagem = { mimeType: m[1], data: m[2] };

  const modelos = [
    { model: "gemini-1.5-flash", api: "v1beta" },
    { model: "gemini-2.0-flash", api: "v1beta" },
  ];

  for (const { model, api } of modelos) {
    for (let i = 0; i < 2; i++) {
      const parsed = await tentar(model, api, key, imagem);
      if (parsed) {
        return res.status(200).json({
          numero_nfe: parsed.numero_nfe || "",
          razao_social: parsed.razao_social || "",
          nome_paciente: parsed.nome_paciente || "",
          nome_vendedora: parsed.nome_vendedora || ""
        });
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  return res.status(200).json({
    numero_nfe: "",
    razao_social: "",
    nome_paciente: "",
    nome_vendedora: ""
  });
}
