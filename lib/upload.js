import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

export async function uploadToDrive(dataUrl, folder) {
  const resourceType = folder === "app_audios" ? "video" : "image";
  const result = await cloudinary.uploader.upload(dataUrl, {
    folder,
    resource_type: resourceType
  });
  return result.secure_url;
}
