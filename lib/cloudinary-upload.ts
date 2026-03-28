import type { UploadApiOptions, UploadApiResponse } from "cloudinary";
import streamifier from "streamifier";
import cloudinary from "@/lib/cloudinary";

export async function uploadFileToCloudinary(file: File, options: UploadApiOptions) {
  const buffer = Buffer.from(await file.arrayBuffer());

  return uploadBufferToCloudinary(buffer, options);
}

export async function uploadBufferToCloudinary(buffer: Buffer, options: UploadApiOptions) {
  return new Promise<UploadApiResponse>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) {
        reject(error);
        return;
      }

      if (!result) {
        reject(new Error("Upload failed"));
        return;
      }

      resolve(result);
    });

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}
