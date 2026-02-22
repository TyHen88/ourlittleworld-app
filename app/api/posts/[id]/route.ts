import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import prisma from "@/lib/prisma";
import { getCachedUser } from "@/lib/auth-cache";
import { getCachedProfile } from "@/lib/db-utils";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const user = await getCachedUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const post = await prisma.post.findUnique({
      where: { id },
      select: {
        id: true,
        couple_id: true,
        author_id: true,
        content: true,
        image_url: true,
        metadata: true,
        created_at: true,
        updated_at: true,
        author: {
          select: {
            id: true,
            full_name: true,
            avatar_url: true,
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const profile = await getCachedProfile(user.id);

    if (!profile?.couple_id || profile.couple_id !== post.couple_id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const response = NextResponse.json({ data: post });
    response.headers.set(
      "Cache-Control",
      "private, max-age=10, stale-while-revalidate=20"
    );
    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
