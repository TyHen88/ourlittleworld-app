"use server";

import prisma from "@/lib/prisma";
import { getCachedUser } from "@/lib/auth-cache";
import fs from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";

export async function uploadAvatar(formData: FormData) {
  try {
    const user = await getCachedUser();
    if (!user || !user.id) return { success: false, error: "Not authenticated" };

    const file = formData.get("file") as File;
    if (!file) return { success: false, error: "No file provided" };

    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `avatar-${user.id}-${Date.now()}.${ext}`;
    
    // Ensure directory exists
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    const relativePath = `/uploads/${fileName}`;
    const absolutePath = path.join(uploadDir, fileName);

    await fs.writeFile(absolutePath, buffer);

    // Update Prisma DB record
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        avatar_url: relativePath,
        image: relativePath // NextAuth default
      }
    });
    
    revalidatePath("/(app)/dashboard", "page");
    revalidatePath("/(app)/settings", "page");

    return { success: true, publicUrl: relativePath };
  } catch (error: unknown) {
    console.error("Local upload error:", error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}
