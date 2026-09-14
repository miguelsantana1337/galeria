import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const payloadSchema = z.object({
  storagePath: z.string().min(3).max(500), originalName: z.string().min(1).max(255),
  width: z.number().int().positive(), height: z.number().int().positive(),
  faces: z.array(z.object({ descriptor: z.array(z.number()).length(1024), score: z.number().optional() })).max(50),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  const parsed = payloadSchema.safeParse(await request.json());
  if (!parsed.success || !parsed.data.storagePath.startsWith(`${id}/`)) return NextResponse.json({ error: "Dados da foto inválidos." }, { status: 400 });
  const { data: photo, error } = await supabase.from("photos").insert({ event_id: id, storage_path: parsed.data.storagePath, original_name: parsed.data.originalName, width: parsed.data.width, height: parsed.data.height, face_count: parsed.data.faces.length, status: "ready" }).select("id").single();
  if (error) return NextResponse.json({ error: "Não foi possível registrar a foto." }, { status: 400 });
  if (parsed.data.faces.length) {
    const { error: faceError } = await supabase.from("face_descriptors").insert(parsed.data.faces.map((face) => ({ photo_id: photo.id, event_id: id, descriptor: face.descriptor, detection_score: face.score })));
    if (faceError) { await supabase.from("photos").delete().eq("id", photo.id); return NextResponse.json({ error: "Não foi possível indexar os rostos." }, { status: 400 }); }
  }
  return NextResponse.json({ id: photo.id }, { status: 201 });
}
