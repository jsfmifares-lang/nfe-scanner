export const config = {
  api: { bodyParser: { sizeLimit: "10mb" } }
};

const PROMPT = `Você é um assistente que extrai dados de imagens de notas fiscais brasileiras (NFe/DANFE) e vales/pedidos.

Identifique o tipo do documento e extraia:
- numero_nfe: número da NF-e (campo "Nº") ou número após "Numero Pedido :"
- razao_social: nome do DESTINATÁRIO/REMETENTE (NÃO o emitente) ou Cliente
- nome_paciente: nome da paciente (se houver)
- nome_vendedora: nome da vendedora (se houver)

Responda APENAS com um JSON válido neste formato exato, sem texto extra:
{"numero_nfe":"...","razao_social":"...","nome_paciente":"...","nome_vendedora":"..."}
Se não encontrar um campo, use string vazia "".`;

async function chamarGemini(key, imagem) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: PROMPT }, { inlineData: imagem }] }]
      })
    }
  );
  return res;
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

  for (let tentativa = 0; tentativa < 3; tentativa++) {
    try {
      const response = await chamarGemini(key, imagem);
      if (response.ok) {
        const json = await response.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        let parsed = {};
        try { parsed = JSON.parse(text); } catch { }
        return res.status(200).json({
          numero_nfe: parsed.numero_nfe || "",
          razao_social: parsed.razao_social || "",
          nome_paciente: parsed.nome_paciente || "",
          nome_vendedora: parsed.nome_vendedora || ""
        });
      }
      if (response.status === 429) {
        if (tentativa < 2) await new Promise((r) => setTimeout(r, 5000));
        continue;
      }
      const body = await response.text();
      return res.status(502).json({ error: `Erro na IA (${response.status})` });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao processar: " + (err.message || "") });
    }
  }

  return res.status(429).json({ error: "Limite de requisições da IA atingido. Tente novamente em instantes." });
}
