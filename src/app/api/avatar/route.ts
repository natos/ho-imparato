import { del, put } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { fail, getCurrentUser, json } from "@/lib/auth";

const MAX_BYTES = 300 * 1024; // the browser already crops to 256px WebP/JPEG (~20KB)
const TYPES: Record<string, string> = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };

// Vercel Blob auth: a read-write token, or (newer stores) BLOB_STORE_ID + the deployment OIDC token.
const blobConfigured = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);

/** Private-store pictures are served through /api/avatar/[userId]?k=<pathname>. */
function privatePathname(avatarUrl: string | null, userId: string) {
  if (!avatarUrl?.startsWith(`/api/avatar/${userId}?`)) return null;
  return new URL(avatarUrl, "http://x").searchParams.get("k");
}

async function removeOld(avatarUrl: string | null, userId: string) {
  if (!avatarUrl || !blobConfigured()) return;
  const target = avatarUrl.includes("blob.vercel-storage.com") ? avatarUrl : privatePathname(avatarUrl, userId);
  if (target) await del(target).catch(() => {});
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("Sign in first.", 401);

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail("No picture was sent.");
  const ext = TYPES[file.type];
  if (!ext) return fail("Use a JPG, PNG or WebP picture.");
  if (file.size > MAX_BYTES) return fail("That picture is too large. Try a smaller one.");

  let url: string;
  if (blobConfigured()) {
    const pathname = `avatars/${user.id}-${Date.now()}.${ext}`;
    try {
      try {
        url = (await put(pathname, file, { access: "public", contentType: file.type })).url;
      } catch (e) {
        // Stores created as private reject public uploads: store privately, serve via our route.
        if (!/private/i.test((e as Error).message)) throw e;
        await put(pathname, file, { access: "private", contentType: file.type });
        url = `/api/avatar/${user.id}?k=${encodeURIComponent(pathname)}`;
      }
    } catch (e) {
      console.error("avatar upload failed", e);
      return fail(`Couldn't save the picture: ${(e as Error).message}`, 502);
    }
    await removeOld(user.avatarUrl, user.id);
  } else if (process.env.NODE_ENV !== "production") {
    // Local dev without Blob: store the tiny image inline.
    url = `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`;
  } else {
    return fail("Picture storage isn't set up yet.", 500);
  }

  const db = await getDb();
  await db.update(schema.users).set({ avatarUrl: url }).where(eq(schema.users.id, user.id));
  return json({ ok: true, avatarUrl: url });
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return fail("Sign in first.", 401);
  await removeOld(user.avatarUrl, user.id);
  const db = await getDb();
  await db.update(schema.users).set({ avatarUrl: null }).where(eq(schema.users.id, user.id));
  return json({ ok: true });
}
