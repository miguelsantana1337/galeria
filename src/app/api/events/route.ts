import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({ name: z.string().min(3).max(100), slug: z.string().regex(/^[a-z0-9-]+$/).min(3).max(60), eventDate: z.string().optional() });
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Revise os dados do evento." }, { status: 400 });
  const { data, error } = await supabase.from("events").insert({ owner_id: user.id, name: parsed.data.name, slug: parsed.data.slug, event_date: parsed.data.eventDate || null }).select("id").single();
  if (error) return NextResponse.json({ error: error.code === "23505" ? "Este código já está em uso." : "Não foi possível criar o evento." }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
