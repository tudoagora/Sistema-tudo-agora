import { NextResponse } from "next/server";
import { z } from "zod";

import { searchBusinesses } from "@/lib/catalog";
import { SEARCH_MIN_LENGTH } from "@/lib/constants";

const querySchema = z.object({
  q: z
    .string()
    .trim()
    .min(SEARCH_MIN_LENGTH, `Digite pelo menos ${SEARCH_MIN_LENGTH} caracteres.`)
    .max(120),
  cidade: z.coerce.number().int().positive().optional(),
  limite: z.coerce.number().int().min(1).max(50).default(8),
});

/** GET /api/busca?q=pizza&cidade=1&limite=8 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    q: url.searchParams.get("q") ?? "",
    cidade: url.searchParams.get("cidade") ?? undefined,
    limite: url.searchParams.get("limite") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        results: [],
        message: parsed.error.issues[0]?.message ?? "Consulta inválida.",
      },
      { status: 400 },
    );
  }

  try {
    const { q, cidade, limite } = parsed.data;
    const results = await searchBusinesses(q, cidade ?? undefined, limite);
    return NextResponse.json(
      { results, message: `${results.length} resultado(s).` },
      { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" } },
    );
  } catch (error) {
    console.error("api/busca:", error);
    return NextResponse.json(
      { results: [], message: "Não foi possível buscar agora." },
      { status: 500 },
    );
  }
}
