import { createSupabaseAdminClient } from "@/lib/supabase/admin";
async function listFiles(prefix: string) {
  const admin = createSupabaseAdminClient();
  const files: string[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await admin.storage
      .from("event-photos")
      .list(prefix, { limit: 1000, offset });
    if (error) throw error;
    for (const item of data || []) {
      const path = `${prefix}/${item.name}`;
      if (item.id) files.push(path);
      else files.push(...(await listFiles(path)));
    }
    if (!data || data.length < 1000) break;
    offset += 1000;
  }
  return files;
}
export async function permanentlyDeleteEvent(eventId: string) {
  const admin = createSupabaseAdminClient();
  const files = await listFiles(eventId);
  for (let i = 0; i < files.length; i += 100) {
    const { error } = await admin.storage
      .from("event-photos")
      .remove(files.slice(i, i + 100));
    if (error) throw error;
  }
  const { error } = await admin.from("events").delete().eq("id", eventId);
  if (error) throw error;
  return { filesDeleted: files.length };
}
