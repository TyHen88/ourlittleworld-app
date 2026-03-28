import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import { getCachedUser } from "@/lib/auth-cache";
import { getCachedProfile } from "@/lib/db-utils";
import { COUPLE_CHAT_CATEGORY } from "@/lib/chat";
import {
  createCursorPaginatedResponse,
  decodePaginationCursor,
  encodePaginationCursor,
} from "@/lib/pagination";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PostCursorPayload = {
  createdAt: string;
  id: string;
};

export async function GET(request: NextRequest) {
  try {
    const user = await getCachedUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id") ?? url.searchParams.get("coupleId") ?? "";
    const limit = Math.min(
      Number(url.searchParams.get("limit") ?? url.searchParams.get("pageSize") ?? 10) || 10,
      50
    );
    const cursor = decodePaginationCursor<PostCursorPayload>(url.searchParams.get("cursor"));
    const query = url.searchParams.get("q") ?? "";

    if (!id) {
      return NextResponse.json({ error: "Missing coupleId or id" }, { status: 400 });
    }

    if (!Number.isFinite(limit) || limit <= 0 || limit > 50) {
      return NextResponse.json({ error: "Invalid limit" }, { status: 400 });
    }

    const profile = await getCachedProfile(user.id);

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const isSingle = profile.user_type === "SINGLE";
    const isOwner = user.id === id;
    const accessScope: Prisma.PostWhereInput = isSingle
      ? { author_id: user.id, couple_id: null }
      : { couple_id: id };
    const searchFilter: Prisma.PostWhereInput = query
      ? {
          content: {
            contains: query,
            mode: "insensitive",
          },
        }
      : {};

    if (!isSingle && (!profile.couple_id || profile.couple_id !== id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (isSingle && !isOwner) {
       return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const cursorCreatedAt = cursor ? new Date(cursor.createdAt) : null;
    const cursorFilter: Prisma.PostWhereInput =
      cursor && cursorCreatedAt && !Number.isNaN(cursorCreatedAt.getTime())
        ? {
            OR: [
              {
                created_at: {
                  lt: cursorCreatedAt,
                },
              },
              {
                created_at: cursorCreatedAt,
                id: {
                  lt: cursor.id,
                },
              },
            ],
          }
        : {};

    const baseWhere = {
      ...accessScope,
      is_deleted: false,
      OR: [
        { category: null },
        { category: { not: COUPLE_CHAT_CATEGORY } },
      ],
      ...searchFilter,
    } satisfies Prisma.PostWhereInput;

    const posts = await prisma.post.findMany({
      where: {
        AND: [baseWhere, cursorFilter],
      } satisfies Prisma.PostWhereInput,
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      take: limit,
      select: {
        id: true,
        couple_id: true,
        author_id: true,
        content: true,
        category: true,
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

    const lastPost = posts[posts.length - 1];
    const nextCursor =
      posts.length === limit && lastPost
        ? encodePaginationCursor({
            createdAt: lastPost.created_at.toISOString(),
            id: lastPost.id,
          })
        : null;

    const response = NextResponse.json(
      createCursorPaginatedResponse(posts, limit, nextCursor)
    );

    response.headers.set(
      "Cache-Control",
      "private, no-cache, no-store, max-age=0, must-revalidate"
    );

    return response;
  } catch (error: unknown) {
    console.error("API Error in /api/posts:", error);
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
