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
      const resGemini = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: PROMPT }] },
            contents: [{
              role: "user",
              parts: [
                { text: "Extraia os dados desta NFe." },
                { inlineData: imagem }
              ]
            }],
            generationConfig: { responseMimeType: "application/json" }
          })
        }
      );

      if (resGemini.ok) {
        const json = await resGemini.json();
        const raw = json.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        let parsed = {};
        try { parsed = JSON.parse(raw); } catch {
          const jm = raw.match(/\{[\s\S]*\}/);
          if (jm) try { parsed = JSON.parse(jm[0]); } catch {}
        }
        return res.status(200).json({
          numero_nfe: parsed.numero_nfe || "",
          razao_social: parsed.razao_social || "",
          nome_paciente: parsed.nome_paciente || "",
          nome_vendedora: parsed.nome_vendedora || "",
          _debug: raw.slice(0, 300)
        });
      }

      if (resGemini.status === 429) {
        if (tentativa < 2) await new Promise((r) => setTimeout(r, 5000));
        continue;
      }

      const body = await resGemini.text();
      return res.status(200).json({
        numero_nfe: "", razao_social: "", nome_paciente: "", nome_vendedora: "",
        _debug: `HTTP ${resGemini.status}: ${body.slice(0, 200)}`
      });
    } catch (err) {
      return res.status(200).json({
        numero_nfe: "", razao_social: "", nome_paciente: "", nome_vendedora: "",
        _debug: "Erro: " + (err.message || "")
      });
    }
  }

  return res.status(200).json({
    numero_nfe: "", razao_social: "", nome_paciente: "", nome_vendedora: "",
    _debug: "Esgotou tentativas"
  });
}
