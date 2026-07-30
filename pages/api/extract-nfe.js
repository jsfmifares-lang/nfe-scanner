export const config = {
  api: { bodyParser: { sizeLimit: "10mb" } }
};

const SYSTEM_PROMPT = `Você é um assistente que extrai dados de imagens de documentos brasileiros: NFe (DANFE) impressa OU Vale/Pedido.

Identifique primeiro o tipo do documento e aplique as regras:

SE for NFe (DANFE):
- "numero_nfe": número da NF-e (campo "Nº" no cabeçalho).
- "razao_social": Nome/Razão Social do quadro "DESTINATÁRIO / REMETENTE" (NÃO o emitente do topo).
- "nome_paciente" e "nome_vendedora": geralmente em "Informações Complementares" / "Dados Adicionais".

SE for Vale/Pedido:
- "numero_nfe": número que aparece logo após o termo "Numero Pedido :".
- "razao_social": valor do campo "Cliente".
- "nome_vendedora" e "nome_paciente": extraia se existirem. Se o paciente não existir, use "-".

Retorne SOMENTE um JSON válido no formato:
{"numero_nfe":"...","razao_social":"...","nome_paciente":"...","nome_vendedora":"..."}
Se algum campo não for encontrado, use "" (string vazia). Não inclua texto além do JSON.`;

const MODELOS = [
  { model: "gemini-2.0-flash", api: "v1beta" },
  { model: "gemini-1.5-flash", api: "v1" },
];

async function chamarGemini(modelo, apiVersion, key, mimeType, b64) {
  const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelo}:generateContent?key=${encodeURIComponent(key)}`;
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{
      role: "user",
      parts: [
        { text: "Extraia os dados desta NFe." },
        { inlineData: { mimeType, data: b64 } }
      ]
    }],
    generationConfig: { responseMimeType: "application/json" }
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
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
  const mimeType = m[1];
  const b64 = m[2];

  let ultimoErro = "";
  for (const { model, api } of MODELOS) {
    for (let tentativa = 0; tentativa < 2; tentativa++) {
      try {
        const response = await chamarGemini(model, api, key, mimeType, b64);
        if (response.ok) {
          const json = await response.json();
          const content = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
          let parsed = {};
          try { parsed = JSON.parse(content); }
          catch { const jm = content.match(/\{([^}]+)\}/); if (jm) parsed = JSON.parse(jm[0]); }
          return res.status(200).json({
            numero_nfe: parsed.numero_nfe ?? "",
            razao_social: parsed.razao_social ?? "",
            nome_paciente: parsed.nome_paciente ?? "",
            nome_vendedora: parsed.nome_vendedora ?? ""
          });
        }
        const body = await response.text();
        if (response.status === 429) {
          ultimoErro = "Limite de requisições da IA atingido. Tente novamente em instantes.";
          await new Promise((r) => setTimeout(r, 4000));
          continue;
        }
        ultimoErro = `Falha (${model}): ${body.slice(0, 150)}`;
        break;
      } catch (err) {
        ultimoErro = "Erro ao processar imagem: " + (err.message || String(err));
        break;
      }
    }
    if (!ultimoErro.startsWith("Limite")) break;
  }

  return res.status(429).json({ error: ultimoErro });
}
