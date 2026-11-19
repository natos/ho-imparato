import { get } from "@vercel/blob";

/** Streams a picture from a private Blob store. Only that player's own avatars/ files are reachable. */
export async function GET(req: Request, ctx: RouteContext<"/api/avatar/[userId]">) {
  const { userId } = await ctx.params;
  const pathname = new URL(req.url).searchParams.get("k") ?? "";
  if (!/^[\w-]+$/.test(userId) || !pathname.startsWith(`avatars/${userId}-`) || pathname.includes("..")) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const res = await get(pathname, { access: "private" });
    if (!res || res.statusCode !== 200) return new Response("Not found", { status: 404 });
    return new Response(res.stream, {
      headers: {
        "content-type": res.blob.contentType,
        // pathname is unique per upload, so it can be cached forever
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch (e) {
    console.error("avatar read failed", e);
    return new Response("Not found", { status: 404 });
  }
}
