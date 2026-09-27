import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { storefrontSlugFromHost } from "@/lib/site";
import type { Database } from "@/lib/supabase/database.types";

/**
 * O proxy existe por causa do cookie de sessão, e quase só por isso.
 *
 * O `@supabase/ssr` guarda a sessão num cookie HttpOnly e o JWT do GoTrue
 * expira em cerca de uma hora. Sem uma passada por aqui a cada requisição, o
 * token vence, o cookie deixa de ser aceito e o visitante cai fora sozinho no
 * meio da sessão. É o que `src/lib/supabase/server.ts` já pressupõe no
 * comentário do `setAll`: o `catch` de lá existe porque um Server Component
 * não tem como gravar cookie, então a renovação precisa acontecer antes, aqui.
 *
 * A segunda atribuição é trocar o `?code=` da confirmação de e-mail por uma
 * sessão de verdade, pelo mesmo motivo: a resposta do `exchangeCodeForSession`
 * só vira cookie se sair na mesma resposta que o visitante está recebendo.
 *
 * A terceira é a vitrine por subdomínio: no domínio oficial,
 * `pizzaria-do-teste.tudoagora.app.br` reescreve a raiz para
 * `/cardapio/pizzaria-do-teste` (ver `storefrontSlugFromHost` em
 * `src/lib/site.ts`). Só a raiz, de propósito — o resto do app continua
 * navegável no subdomínio, e os Server Actions da vitrine fazem POST nela.
 *
 * Autorização não é responsabilidade deste arquivo. `requireUser`,
 * `requireAdmin` e `requireBusinessMember` já exigem sessão dentro de cada
 * rota, e Server Actions são POST na própria rota — um matcher que falhasse
 * deixaria a checagem passar em silêncio. O proxy renova, não Decide.
 */

/**
 * O cookie de sessão é `sb-<project-ref>-auth-token` e, passando de ~3 KB, o
 * `@supabase/ssr` fatia em `...-auth-token.0`, `.1`, e assim por diante. Daí o
 * `includes` em vez de `endsWith`: um `endsWith` deixaria passar o cookie
 * inteiro mas perder o fatiado, e a sessão nunca seria renovada.
 *
 * Sem cookie de sessão não há o que renovar, então `getUser()` — que vai ao
 * GoTrue para validar o token — só roda quando existe um. Sem esse teste, cada
 * página pública de visitante anônimo pagaria uma ida à API.
 */
function hasAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((cookie) => cookie.name.includes("-auth-token"));
}

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Sem env não dá para montar o client, e o proxy roda antes de qualquer
  // página. Deixar a requisição seguir em vez de estourar aqui deixa o erro
  // aparecer no Server Component, nomeando a variável que falta, em vez de um
  // 500 sem contexto já na home pública.
  if (!url || !anonKey) return NextResponse.next();

  // Vitrine por subdomínio: só a raiz do host da empresa vira rewrite, para
  // o resto do app continuar navegável ali dentro. `null` no domínio de teste
  // (`*.vercel.app` não tem wildcard) e quando o host não é de vitrine.
  // O domínio real só chega no header `Host` — o Next normaliza
  // `nextUrl.hostname` para o endereço local do servidor —, e o header pode
  // trazer porta (`dominio:3000`), que não faz parte do hostname.
  const host = request.headers.get("host")?.split(":")[0].toLowerCase() ?? "";
  const storefrontSlug =
    request.nextUrl.pathname === "/" ? storefrontSlugFromHost(host) : null;

  // Fábrica da resposta "seguir o fluxo": reescreve para a vitrine quando o
  // host é de empresa, senão apenas continua. O `setAll` abaixo recria a
  // resposta a cada cookie gravado, e recriar com `NextResponse.next` direto
  // jogaria o rewrite fora — o visitante veria a home em vez do cardápio.
  // Os headers do request vão junto porque é neles que o `request.cookies.set`
  // grava a sessão renovada.
  function baseResponse(): NextResponse {
    if (storefrontSlug) {
      const target = request.nextUrl.clone();
      target.pathname = `/cardapio/${storefrontSlug}`;
      return NextResponse.rewrite(target, {
        request: { headers: request.headers },
      });
    }
    return NextResponse.next({ request });
  }

  let response = baseResponse();

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Primeiro no `request`, para que os Server Components da mesma
        // requisição já leiam o token novo; depois no `response`, para que ele
        // chegue ao navegador. A resposta é recriada porque carrega os cookies
        // de quem a construiu.
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = baseResponse();
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Confirmação de e-mail, magic link e OAuth chegam todos como `?code=`. Um
  // código já consumido (refresh da página, por exemplo) devolve erro aqui e
  // cai no fluxo normal: quem já tem cookie de sessão segue autenticado, e quem
  // não tem volta para a tela de login.
  const code = request.nextUrl.searchParams.get("code");
  if (code) await supabase.auth.exchangeCodeForSession(code);

  // Valida o token no GoTrue e, se estiver perto de vencer, grava o novo no
  // cookie via `setAll` acima. É esta chamada que impede o logout espontâneo.
  if (hasAuthCookie(request)) await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * Tudo que não é arquivo estático. O filtro de extensão cobre o `public/`
     * (imagens, `sw.js`, `manifest.webmanifest`, `robots.txt`), e `_next/static`
     * / `_next/image` ficam de fora porque são os mais procurados do build.
     * Páginas do App Router não têm extensão, então nenhum endereço de página
     * é excluído por engano.
     *
     * A lista é curta de propósito: um slug de empresa pode ter ponto
     * (`/cardapio/mega.pizza`), e sobrepuxar a extensão aqui tiraria o proxy
     * justamente da página que mais precisa de sessão renovada.
     *
     * O grupo da extensão é `(?:...)` e não `(...)`: o Next compila o matcher
     * para um `RegExp` próprio e **rejeita grupo capturante** ("Capturing groups
     * are not allowed"). O dev server não sobe — morre na inicialização com
     * `Error parsing`, sem derrubar erro em nenhuma requisição, o que faz o
     * problema parecer de rede em vez de de configuração.
     */
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff|woff2|ttf|js|txt|xml|webmanifest)$).*)",
  ],
};
