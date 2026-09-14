import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const payloadSchema = z.object({
  storagePath: z.string().min(3).max(500),
  originalName: z.string().min(1).max(255),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  takenAt: z.string().datetime().nullable().optional(),
  takenAtSource: z.enum(["exif", "file"]).nullable().optional(),
  faces: z
    .array(
      z.object({
        descriptor: z.array(z.number()).length(1024),
        score: z.number().optional(),
      }),
    )
    .max(50),
});

const deletePayloadSchema = z
  .union([
    z.object({ photoId: z.string().uuid() }),
    z.object({ photoIds: z.array(z.string().uuid()).min(1).max(100) }),
  ])
  .transform((payload) =>
    "photoIds" in payload ? payload.photoIds : [payload.photoId],
  );

export async function POST(
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
  const parsed = payloadSchema.safeParse(await request.json());
  if (!parsed.success || !parsed.data.storagePath.startsWith(`${id}/`))
    return NextResponse.json(
      { error: "Dados da foto inválidos." },
      { status: 400 },
    );
  const { data: photo, error } = await supabase
    .from("photos")
    .insert({
      event_id: id,
      storage_path: parsed.data.storagePath,
      original_name: parsed.data.originalName,
      width: parsed.data.width,
      height: parsed.data.height,
      taken_at: parsed.data.takenAt || null,
      taken_at_source: parsed.data.takenAtSource || null,
      face_count: parsed.data.faces.length,
      status: "ready",
    })
    .select("id")
    .single();
  if (error)
    return NextResponse.json(
      { error: "Não foi possível registrar a foto." },
      { status: 400 },
    );
  if (parsed.data.faces.length) {
    const { error: faceError } = await supabase.from("face_descriptors").insert(
      parsed.data.faces.map((face) => ({
        photo_id: photo.id,
        event_id: id,
        descriptor: face.descriptor,
        detection_score: face.score,
      })),
    );
    if (faceError) {
      await supabase.from("photos").delete().eq("id", photo.id);
      return NextResponse.json(
        { error: "Não foi possível indexar os rostos." },
        { status: 400 },
      );
    }
  }
  return NextResponse.json({ id: photo.id }, { status: 201 });
}

export async function DELETE(
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
  const parsed = deletePayloadSchema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: "Seleção de fotos inválida." },
      { status: 400 },
    );
  const photoIds = [...new Set(parsed.data)];
  const { data: photos } = await supabase
    .from("photos")
    .select("id,storage_path")
    .in("id", photoIds)
    .eq("event_id", id);
  if (!photos || photos.length !== photoIds.length)
    return NextResponse.json(
      { error: "Uma ou mais fotos não foram encontradas neste evento." },
      { status: 404 },
    );
  const { error: storageError } = await supabase.storage
    .from("event-photos")
    .remove(photos.map((photo) => photo.storage_path));
  if (storageError)
    return NextResponse.json(
      { error: "Não foi possível remover o arquivo." },
      { status: 400 },
    );
  const { error } = await supabase
    .from("photos")
    .delete()
    .in("id", photoIds)
    .eq("event_id", id);
  return error
    ? NextResponse.json(
        { error: "Não foi possível excluir a foto." },
        { status: 400 },
      )
    : NextResponse.json({ ok: true, deleted: photoIds.length });
}
