import { getDriveClient } from "../../lib/google-clients";

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id || typeof id !== "string") return res.status(400).send("id obrigatório");

  try {
    const drive = getDriveClient();
    const meta = await drive.files.get({ fileId: id, fields: "mimeType" });
    const file = await drive.files.get(
      { fileId: id, alt: "media" },
      { responseType: "stream" }
    );

    res.setHeader("Content-Type", meta.data.mimeType || "application/octet-stream");
    res.setHeader("Cache-Control", "private, max-age=300");
    file.data
      .on("error", (err) => {
        console.error(err);
        res.status(500).end();
      })
      .pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).send("Falha ao carregar arquivo");
  }
}
