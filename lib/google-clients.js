import { google } from "googleapis";

export const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

function getAuth() {
  const b64 = process.env.GOOGLE_CREDENTIALS_BASE64;
  if (!b64) throw new Error("GOOGLE_CREDENTIALS_BASE64 ausente");

  const json = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));

  return new google.auth.JWT({
    email: json.client_email,
    key: json.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });
}

export function getSheetsClient() {
  return google.sheets({ version: "v4", auth: getAuth() });
}
