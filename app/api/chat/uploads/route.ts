import { NextResponse } from "next/server";
import streamifier from "streamifier";
import { getCachedUser } from "@/lib/auth-cache";
import { getCachedProfile } from "@/lib/db-utils";
import cloudinary from "@/lib/cloudinary";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function POST(request: Request) {
  try {
    const user = await getCachedUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const profile = await getCachedProfile(user.id);
    if (!profile?.couple_id || profile.user_type === "SINGLE") {
      return NextResponse.json(
        { error: "Couple chat is not available" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image file is required" }, { status: 400 });
    }

    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Unsupported image type. Use JPG, PNG, WEBP, or GIF." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Image is too large. Maximum size is 8MB." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "ourlittleworld/chat",
          public_id: `chat-${profile.couple_id}-${user.id}-${Date.now()}`,
          resource_type: "image",
          overwrite: false,
          transformation: [
            {
              quality: "auto",
              fetch_format: "auto",
            },
          ],
        },
        (error, result) => {
          if (error || !result?.secure_url) {
            reject(error ?? new Error("Failed to upload image"));
            return;
          }

          resolve({ secure_url: result.secure_url });
        }
      );

      streamifier.createReadStream(buffer).pipe(uploadStream);
    });

    return NextResponse.json({
      success: true,
      url: uploadResult.secure_url,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to upload chat image";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
