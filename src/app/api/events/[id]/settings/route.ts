import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  description: z.string().max(800).nullable(),
  welcome_message: z.string().max(500).nullable(),
  brand_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  whatsapp_url: z.union([z.string().url(), z.literal("")]).nullable(),
  instagram_url: z.union([z.string().url(), z.literal("")]).nullable(),
  retention_days: z.number().int().min(1).max(365),
  banner_path: z.string().max(500).nullable(),
  organizer_logos: z.array(z.string().max(500)).max(5),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Acesso não autorizado." },
      { status: 401 },
    );
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: "Revise os dados informados." },
      { status: 400 },
    );
  if (
    (parsed.data.banner_path &&
      !parsed.data.banner_path.startsWith(`${id}/branding/`)) ||
    parsed.data.organizer_logos.some(
      (path) => !path.startsWith(`${id}/branding/`),
    )
  )
    return NextResponse.json(
      { error: "Arquivos de identidade inválidos." },
      { status: 400 },
    );
  const values = {
    ...parsed.data,
    description: parsed.data.description || null,
    whatsapp_url: parsed.data.whatsapp_url || null,
    instagram_url: parsed.data.instagram_url || null,
    expires_at: new Date(
      Date.now() + parsed.data.retention_days * 86400000,
    ).toISOString(),
  };
  const { error } = await supabase.from("events").update(values).eq("id", id);
  return error
    ? NextResponse.json({ error: "Não foi possível salvar." }, { status: 400 })
    : NextResponse.json({ ok: true, expires_at: values.expires_at });
}
