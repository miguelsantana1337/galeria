import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const providerError = url.searchParams.get("error_description");
  const next = url.searchParams.get("next") || "/painel";
  if (providerError)
    return NextResponse.redirect(new URL("/entrar?erro=oauth", url.origin));
  if (code) {
    const { error } = await (
      await createSupabaseServerClient()
    ).auth.exchangeCodeForSession(code);
    if (error)
      return NextResponse.redirect(new URL("/entrar?erro=oauth", url.origin));
  } else
    return NextResponse.redirect(new URL("/entrar?erro=oauth", url.origin));
  const destination =
    next.startsWith("/") && !next.startsWith("//") ? next : "/painel";
  return NextResponse.redirect(new URL(destination, url.origin));
}
