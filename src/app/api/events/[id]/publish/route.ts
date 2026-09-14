import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { publish } = await request.json();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Acesso não autorizado." },
      { status: 401 },
    );
  const { error } = await supabase.rpc("publish_event", {
    target_id: id,
    publish: Boolean(publish),
  });
  return error
    ? NextResponse.json(
        { error: "Não foi possível atualizar a publicação." },
        { status: 400 },
      )
    : NextResponse.json({ ok: true });
}
