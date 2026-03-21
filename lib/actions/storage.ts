"use server";

import prisma from "@/lib/prisma";
import { getCachedUser } from "@/lib/auth-cache";
import fs from "fs/promises";
import path from "path";

export async function uploadAvatar(formData: FormData) {
  try {
    const user = await getCachedUser();
    if (!user || !user.id) return { success: false, error: "Not authenticated" };

    const file = formData.get("file") as File;
    if (!file) return { success: false, error: "No file provided" };

    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `avatar-${user.id}-${Date.now()}.${ext}`;
    
    // Save locally for development
    const buffer = Buffer.from(await file.arrayBuffer());
    const relativePath = `/uploads/${fileName}`;
    const absolutePath = path.join(process.cwd(), "public", "uploads", fileName);

    await fs.writeFile(absolutePath, buffer);

    // Update Prisma DB record
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        avatar_url: relativePath,
        image: relativePath // NextAuth default
      }
    });

    return { success: true, publicUrl: relativePath };
  } catch (error: any) {
    console.error("Local upload error:", error);
    return { success: false, error: error.message };
  }
}
