import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  welcome_message: z.string().max(500).nullable(),
  brand_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  whatsapp_url: z.union([z.string().url(), z.literal("")]).nullable(),
  instagram_url: z.union([z.string().url(), z.literal("")]).nullable(),
  retention_days: z.number().int().min(1).max(365),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Revise os dados informados." }, { status: 400 });
  const values = { ...parsed.data, whatsapp_url: parsed.data.whatsapp_url || null, instagram_url: parsed.data.instagram_url || null, expires_at: new Date(Date.now() + parsed.data.retention_days * 86400000).toISOString() };
  const { error } = await supabase.from("events").update(values).eq("id", id);
  return error ? NextResponse.json({ error: "Não foi possível salvar." }, { status: 400 }) : NextResponse.json({ ok: true, expires_at: values.expires_at });
}
