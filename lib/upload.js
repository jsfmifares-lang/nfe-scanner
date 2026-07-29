import { Readable } from "stream";
import { getDriveClient, DRIVE_FOLDER_ID } from "./google-clients";

export function dataUrlToBuffer(dataUrl) {
  const m = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!m) throw new Error("Arquivo inválido (esperado data URL base64)");
  return { buffer: Buffer.from(m[2], "base64"), mime: m[1] };
}

export async function uploadToDrive(dataUrl, filename) {
  const { buffer, mime } = dataUrlToBuffer(dataUrl);
  const drive = getDriveClient();
  const stream = Readable.from(buffer);

  const res = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [DRIVE_FOLDER_ID]
    },
    media: {
      mimeType: mime,
      body: stream
    },
    fields: "id"
  });

  const fileId = res.data.id;
  if (!fileId) throw new Error("Falha no upload para o Drive");
  return fileId;
}
