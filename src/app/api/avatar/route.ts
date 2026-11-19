import { del, put } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { fail, getCurrentUser, json } from "@/lib/auth";

const MAX_BYTES = 300 * 1024; // the browser already crops to 256px WebP (~20KB)
const TYPES = ["image/webp", "image/jpeg", "image/png"];

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("Sign in first.", 401);

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail("No picture was sent.");
  if (!TYPES.includes(file.type)) return fail("Use a JPG, PNG or WebP picture.");
  if (file.size > MAX_BYTES) return fail("That picture is too large. Try a smaller one.");

  let url: string;
  // Vercel Blob auth: a read-write token, or (newer stores) BLOB_STORE_ID + the deployment OIDC token.
  if (process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID) {
    const blob = await put(`avatars/${user.id}.webp`, file, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: true,
    });
    url = blob.url;
    if (user.avatarUrl?.includes("blob.vercel-storage.com")) {
      await del(user.avatarUrl).catch(() => {});
    }
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
  if (user.avatarUrl?.includes("blob.vercel-storage.com")) {
    await del(user.avatarUrl).catch(() => {});
  }
  const db = await getDb();
  await db.update(schema.users).set({ avatarUrl: null }).where(eq(schema.users.id, user.id));
  return json({ ok: true });
}
