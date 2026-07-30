import { supabase } from "../../../lib/supabase";
import { uploadToDrive } from "../../../lib/upload";

export const config = {
  api: {
    bodyParser: { sizeLimit: "10mb" }
  }
};

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) throw error;

      const messages = (data || []).map((row, idx) => ({
        chat_id: String(idx),
        data_hora: row.data_hora || "",
        remetente: row.remetente || "",
        mensagem: row.mensagem || "",
        eh_audio: (row.tipo || "") === "audio"
      }));

      return res.status(200).json(messages);
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

      const { error } = await supabase.from("chat_messages").insert({
        data_hora: now,
        remetente,
        mensagem: texto,
        tipo
      });

      if (error) throw error;

      return res.status(200).json({ data_hora: now, remetente, mensagem: texto, eh_audio: tipo === "audio" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Falha ao enviar: " + (err.message || String(err)) });
    }
  }

  return res.status(405).json({ error: "Método não permitido" });
}
