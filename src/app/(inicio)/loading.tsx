/**
 * Esqueleto da home enquanto os dados chegam.
 *
 * Sem este arquivo a navegação para `/` é 100% bloqueante: o `<Link>` do logo
 * (e das pílulas de categoria, do footer, do cardápio) só tem algo para
 * mostrar depois que TODAS as leituras do servidor voltarem — o que faz o
 * clique parecer lento mesmo com o banco respondendo rápido. Com o
 * `loading.tsx` a rota tem uma fronteira de Suspense, então o cabeçalho, o
 * rodapé e este esqueleto entram na tela na hora e o conteúdo chega depois,
 * sem trocar a página por uma tela branca.
 *
 * O esqueleto acompanha as alturas reais das seções (`aspect-16/9` do herói,
 * `h-14` do campo de busca, `86px` das pílulas de categoria) para não pular
 * quando o conteúdo troca por ele.
 */
export default function HomeLoading() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Carregando a página…</span>

      <div
        aria-hidden="true"
        className="mx-auto w-full max-w-6xl animate-pulse px-4 pt-5 lg:px-6"
      >
        {/* Herói — mesma proporção do `HeroSlider`. */}
        <div className="aspect-16/9 w-full rounded-media bg-marca-800/60 shadow-media" />
      </div>

      {/* Busca. */}
      <div aria-hidden="true" className="bg-white px-4 py-10 sm:py-12">
        <div className="mx-auto w-full max-w-2xl space-y-4">
          <div className="mx-auto h-6 w-72 rounded-pill bg-superficie-2" />
          <div className="mx-auto h-4 w-96 max-w-full rounded-pill bg-superficie-2" />
          <div className="flex gap-2">
            <div className="h-14 flex-1 rounded-media bg-superficie-2" />
            <div className="hidden h-14 w-28 rounded-media bg-superficie-2 sm:block" />
          </div>
        </div>
      </div>

      {/* Categorias. */}
      <div
        aria-hidden="true"
        className="mx-auto w-full max-w-6xl animate-pulse px-4 py-14 lg:px-6"
      >
        <div className="h-8 w-64 rounded-pill bg-superficie-2" />
        <div className="mt-6 flex gap-4 overflow-hidden">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="h-[86px] w-[86px] shrink-0 rounded-[20px] bg-superficie-2"
            />
          ))}
        </div>
      </div>

      {/* Destaques. */}
      <div
        aria-hidden="true"
        className="mx-auto w-full max-w-6xl animate-pulse px-4 py-14 lg:px-6"
      >
        <div className="h-8 w-72 rounded-pill bg-superficie-2" />
        <div className="mt-6 min-h-[216px] w-full rounded-media bg-marca-900/10 sm:min-h-[245px]" />
        <div className="mt-4 flex gap-3 overflow-hidden">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[126px] w-[268px] shrink-0 rounded-card bg-superficie-2 sm:w-[360px]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}