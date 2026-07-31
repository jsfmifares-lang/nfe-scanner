export const config = {
  api: { bodyParser: { sizeLimit: "10mb" } }
};

const PROMPT = `Extraia desta NFe os campos: numero_nfe, razao_social (destinatário), nome_paciente, nome_vendedora. Retorne apenas JSON sem acentos.`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const key = process.env.GEMINI_API_KEY;
  const { imageDataUrl } = req.body || {};

  const relatorio = {
    temChave: !!key,
    tamanhoImagem: imageDataUrl ? Math.round(imageDataUrl.length / 1024) + " KB" : "sem imagem",
    tentativas: [],
    respostaCrua: null,
    parseOk: false,
    resultado: null
  };

  if (!key) return res.status(200).json({ ...relatorio, erro: "GEMINI_API_KEY ausente" });
  if (!imageDataUrl) return res.status(200).json({ ...relatorio, erro: "imagem ausente" });

  const m = imageDataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!m) return res.status(200).json({ ...relatorio, erro: "dataUrl inválido" });

  const imagem = { mimeType: m[1], data: m[2] };

  const modelos = [
    "gemini-2.0-flash",
    "gemini-1.5-flash"
  ];

  for (const modelo of modelos) {
    const t = { modelo, ok: false, status: null, detalhe: "" };
    try {
      const resposta = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              role: "user",
              parts: [
                { text: PROMPT },
                { inlineData: imagem }
              ]
            }]
          })
        }
      );
      t.status = resposta.status;
      if (resposta.ok) {
        const texto = await resposta.text();
        t.detalhe = texto.slice(0, 400);
        t.ok = true;
        try {
          const json = JSON.parse(texto);
          const raw = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
          relatorio.respostaCrua = raw.slice(0, 500);
          try {
            relatorio.resultado = JSON.parse(raw);
            relatorio.parseOk = true;
          } catch {
            relatorio.resultado = { parseErro: "resposta não é JSON puro: " + raw.slice(0, 200) };
          }
        } catch {
          relatorio.resultado = { parseErro: "resposta da API não é JSON: " + t.detalhe };
        }
      } else {
        t.detalhe = (await resposta.text()).slice(0, 300);
      }
    } catch (e) {
      t.detalhe = "EXCEÇÃO: " + (e.message || String(e));
    }
    relatorio.tentativas.push(t);
    if (t.ok) break;
  }

  return res.status(200).json(relatorio);
}
