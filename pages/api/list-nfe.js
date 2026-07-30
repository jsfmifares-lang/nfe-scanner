import { supabase } from "../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Método não permitido" });

  try {
    const { data, error } = await supabase
      .from("nfe_historico")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) throw error;

    const items = (data || []).map((row) => ({
      data_hora: row.data_hora || "",
      numero_nfe: row.numero_nfe || "",
      razao_social: row.razao_social || "",
      nome_paciente: row.nome_paciente || "",
      nome_vendedora: row.nome_vendedora || "",
      foto_drive_id: row.foto_url || "",
      usuario_id: row.usuario || ""
    }));

    return res.status(200).json(items);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Falha ao listar: " + (err.message || String(err)) });
  }
}
