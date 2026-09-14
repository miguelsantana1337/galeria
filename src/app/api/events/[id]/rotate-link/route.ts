import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  const { data, error } = await supabase.rpc("rotate_event_share_token", { target_id: id });
  return error ? NextResponse.json({ error: "Não foi possível trocar o link." }, { status: 400 }) : NextResponse.json({ token: data });
}
