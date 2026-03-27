"use server";

import type { UploadApiResponse } from "cloudinary";
import prisma from "@/lib/prisma";
import { getCachedUser } from "@/lib/auth-cache";
import { revalidatePath } from "next/cache";
import cloudinary from "@/lib/cloudinary";
import streamifier from "streamifier";

/**
 * Uploads an avatar image to Cloudinary and updates the user's profile.
 * Automatically transforms the image into a 500x500 square focused on the face.
 */
export async function uploadAvatar(formData: FormData) {
  try {
    const user = await getCachedUser();
    if (!user || !user.id) return { success: false, error: "Not authenticated" };

    const file = formData.get("file") as File;
    if (!file) return { success: false, error: "No file provided" };

    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to Cloudinary using a stream to handle the buffer from Next.js Server Action
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "ourlittleworld/avatars",
          public_id: `avatar-${user.id}-${Date.now()}`,
          // Optimization: Automatically crop/resize to 500x500 focusing on the face
          transformation: [
            { width: 500, height: 500, crop: "fill", gravity: "face", quality: "auto", fetch_format: "auto" }
          ]
        },
        (error, result) => {
          if (error) return reject(error);
          if (!result) return reject(new Error("Upload failed"));
          resolve(result);
        }
      );

      streamifier.createReadStream(buffer).pipe(uploadStream);
    });

    const publicUrl = result.secure_url;

    // Update Prisma DB record with the Cloudinary URL
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        avatar_url: publicUrl,
        image: publicUrl // Keep NextAuth image in sync
      }
    });
    
    // Invalidate caches to show the new avatar immediately
    revalidatePath("/dashboard", "page");
    revalidatePath("/settings", "page");

    return { success: true, publicUrl };
  } catch (error: unknown) {
    console.error("Cloudinary upload error:", error);
    return { 
      success: false, 
      error: error instanceof Error
        ? error.message
        : "Something went wrong during the upload. Please ensure CLOUDINARY credentials are set in .env" 
    };
  }
}
