import { google } from "googleapis";

export const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

function getAuth() {
  const email = process.env.GOOGLE_CLIENT_EMAIL;
  let rawKey = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !rawKey) {
    throw new Error("Credenciais do Google ausentes (GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY)");
  }

  rawKey = rawKey.replace(/"/g, "").trim();

  let b64 = rawKey
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\\n/g, "")
    .replace(/\n/g, "")
    .replace(/\r/g, "")
    .replace(/\s/g, "");

  const pem = "-----BEGIN PRIVATE KEY-----\n" +
    b64.match(/.{1,64}/g).join("\n") +
    "\n-----END PRIVATE KEY-----";

  return new google.auth.JWT({
    email,
    key: pem,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });
}

export function getSheetsClient() {
  return google.sheets({ version: "v4", auth: getAuth() });
}
