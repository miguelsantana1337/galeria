import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { permanentlyDeleteEvent } from "@/lib/cleanup-event";
export async function DELETE(
  _: Request,
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
  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();
  if (!event)
    return NextResponse.json(
      { error: "Evento não encontrado." },
      { status: 404 },
    );
  try {
    return NextResponse.json({
      ok: true,
      ...(await permanentlyDeleteEvent(id)),
    });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível excluir completamente o evento." },
      { status: 500 },
    );
  }
}
