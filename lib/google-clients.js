import { google } from "googleapis";

export const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

function getAuth() {
  const email = process.env.GOOGLE_CLIENT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !rawKey) {
    throw new Error("Credenciais do Google ausentes (GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY)");
  }
  let key = rawKey.replace(/"/g, "").trim();
  if (key.includes("\\n")) {
    key = key.replace(/\\n/g, "\n");
  }
  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });
}

export function getSheetsClient() {
  return google.sheets({ version: "v4", auth: getAuth() });
}
