import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import prisma from "@/lib/prisma";
import { getCachedUser } from "@/lib/auth-cache";
import { getCachedProfile } from "@/lib/db-utils";

export async function GET(request: NextRequest) {
  try {
    const user = await getCachedUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const url = new URL(request.url);
    const coupleId = url.searchParams.get("coupleId") ?? "";

    const page = Number(url.searchParams.get("page") ?? 0);
    const pageSize = Number(url.searchParams.get("pageSize") ?? 10);

    if (!coupleId) {
      return NextResponse.json({ error: "Missing coupleId" }, { status: 400 });
    }

    if (!Number.isFinite(page) || page < 0) {
      return NextResponse.json({ error: "Invalid page" }, { status: 400 });
    }

    if (!Number.isFinite(pageSize) || pageSize <= 0 || pageSize > 50) {
      return NextResponse.json({ error: "Invalid pageSize" }, { status: 400 });
    }

    const profile = await getCachedProfile(user.id);

    if (!profile?.couple_id || profile.couple_id !== coupleId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const posts = await prisma.post.findMany({
      where: { couple_id: coupleId },
      orderBy: { created_at: "desc" },
      skip: page * pageSize,
      take: pageSize,
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

    const response = NextResponse.json({
      data: posts,
      nextCursor: posts.length === pageSize ? page + 1 : null,
    });

    response.headers.set(
      "Cache-Control",
      "private, max-age=5, stale-while-revalidate=10"
    );

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
