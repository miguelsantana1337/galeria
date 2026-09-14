import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({ key: z.string().uuid(), kind: z.enum(["view","selfie","match","no_match","download"]), photoCount: z.number().int().min(0).max(500).optional(), consent: z.boolean().optional() });
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const parsed = schema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const admin = createSupabaseAdminClient(); const { data: event } = await admin.from("events").select("id").eq("slug", slug).eq("share_token", parsed.data.key).eq("status", "published").single(); if (!event) return NextResponse.json({ ok: false }, { status: 404 });
  await admin.from("gallery_activity").insert({ event_id: event.id, kind: parsed.data.kind, photo_count: parsed.data.photoCount });
  if (parsed.data.consent) await admin.from("gallery_consents").insert({ event_id: event.id, policy_version: "2026-09-14-v1" });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
