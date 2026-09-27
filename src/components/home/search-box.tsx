"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import type { BusinessCard as BusinessCardData } from "@/lib/catalog";
import { BusinessAvatar } from "@/components/business-card";
import { SEARCH_MIN_LENGTH } from "@/lib/constants";

export function SearchBox({
  placeholder,
  defaultValue = "",
}: {
  placeholder: string;
  defaultValue?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Atalho "/" foca a busca, como em qualquer app de diretório.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (event.key === "/" && !typing) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = value.trim();
    if (term.length < SEARCH_MIN_LENGTH) return;
    startTransition(() => router.push(`/busca?q=${encodeURIComponent(term)}`));
  }

  return (
    <form role="search" onSubmit={submit} noValidate className="w-full">
      <div className="flex flex-col gap-2 rounded-media bg-white p-2 shadow-media sm:flex-row">
        <label className="flex-1">
          <span className="sr-only">O que você procura?</span>
          <input
            ref={inputRef}
            type="search"
            name="q"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            minLength={SEARCH_MIN_LENGTH}
            required
            enterKeyHint="search"
            placeholder={placeholder}
            className="h-12 w-full rounded-card border border-transparent bg-superficie px-4 text-base text-texto placeholder:text-texto-tenue focus:border-marca-600 focus:bg-white"
          />
        </label>
        <button
          type="submit"
          disabled={pending || value.trim().length < SEARCH_MIN_LENGTH}
          className="h-12 rounded-card bg-marca-800 px-8 text-base font-bold text-white transition-colors hover:bg-marca-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Buscando…" : "Pesquisar"}
        </button>
      </div>
      <p className="mt-2 hidden text-center text-xs text-texto-tenue sm:block">
        Dica: pressione <kbd className="rounded border border-borda px-1">/</kbd> para
        buscar
      </p>
    </form>
  );
}

/** Resultados ao vivo enquanto o usuário digita (debounce de 250 ms). */
export function LiveSearch({
  cityId,
  limit = 8,
}: {
  cityId: number;
  limit?: number;
}) {
  const router = useRouter();
  const [term, setTerm] = useState("");
  // Só o termo já válido (>= 2 letras) vira `query`. Isso mantém o efeito
  // livre de setState síncrono: o efeito apenas busca e publica o resultado.
  const [query, setQuery] = useState("");
  const [settled, setSettled] = useState("");
  const [results, setResults] = useState<BusinessCardData[]>([]);
  const [status, setStatus] = useState("");
  const [falhou, setFalhou] = useState(false);
  // Incrementar força o efeito a rodar de novo sem mexer em `query`: é o
  // botão "Tentar de novo" depois de um 500.
  const [tentativa, setTentativa] = useState(0);
  const [pending, startTransition] = useTransition();

  const loading = query !== settled;
  const temTermo = query.length >= SEARCH_MIN_LENGTH;

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    setTerm(next);
    setFalhou(false);

    const trimmed = next.trim();
    if (trimmed.length < SEARCH_MIN_LENGTH) {
      setQuery("");
      setResults([]);
      setSettled("");
      setStatus("");
      return;
    }
    setQuery(trimmed);
    setStatus("");
  }

  function abrirBuscaCompleta() {
    const trimmed = term.trim();
    if (trimmed.length < SEARCH_MIN_LENGTH) return;
    startTransition(() => router.push(`/busca?q=${encodeURIComponent(trimmed)}`));
  }

  useEffect(() => {
    if (!query) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/busca?q=${encodeURIComponent(query)}&cidade=${cityId}&limite=${limit}`,
          { signal: controller.signal },
        );
        const data = (await response.json().catch(() => null)) as {
          results?: BusinessCardData[];
          message?: string;
        } | null;

        // Um 4xx/5xx devolve `results: []`, que é indistinguível de "não
        // achou nada". Sem esta checagem a tela affirmava que não havia
        // resultado quando na verdade a busca tinha falhado.
        if (!response.ok) {
          setResults([]);
          setFalhou(true);
          setStatus(data?.message ?? "Não foi possível buscar agora.");
          return;
        }

        const found = data?.results ?? [];
        setResults(found);
        setFalhou(false);
        setStatus(
          found.length
            ? `${found.length} ${found.length === 1 ? "empresa" : "empresas"} para "${query}".`
            : `Nada encontrado para "${query}".`,
        );
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setResults([]);
          setFalhou(true);
          setStatus("Sem conexão com o servidor. Verifique a internet e tente de novo.");
        }
      } finally {
        // Um abort chega aqui também. Publicar `settled` nesse caso deixaria a
        // busca mais recente presa em "Buscando…" enquanto ela ainda corre.
        if (!controller.signal.aborted) setSettled(query);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, cityId, limit, tentativa]);

  return (
    <form
      role="search"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        abrirBuscaCompleta();
      }}
      className="w-full"
    >
      <label>
        <span className="sr-only">O que você procura?</span>
        <input
          type="search"
          name="q"
          value={term}
          onChange={handleChange}
          minLength={SEARCH_MIN_LENGTH}
          enterKeyHint="search"
          placeholder="O que você procura? Ex.: flores, farmácia, pizza..."
          aria-describedby="busca-status"
          aria-controls="busca-resultados"
          aria-busy={loading}
          className="h-14 w-full rounded-media border border-transparent bg-white px-5 text-base text-texto shadow-media placeholder:text-texto-tenue focus:border-marca-600"
        />
      </label>

      <p
        id="busca-status"
        aria-live="polite"
        className={`mt-2 min-h-5 text-center text-xs ${
          falhou ? "font-bold text-erro-700" : "text-texto-tenue"
        }`}
      >
        {loading ? "Buscando…" : status}
      </p>

      {falhou && !loading ? (
        <p className="mt-1 text-center">
          <button
            type="button"
            onClick={() => setTentativa((n) => n + 1)}
            className="rounded-pill border border-borda-forte px-3 py-1 text-xs font-bold text-texto-suave transition-colors hover:border-marca-600 hover:text-marca-800"
          >
            Tentar de novo
          </button>
        </p>
      ) : null}

      {results.length > 0 ? (
        <ul id="busca-resultados" className="mt-3 grid gap-2 sm:grid-cols-2">
          {results.map((business) => (
            <li key={business.id}>
              <Link
                href={`/cidades/${business.citySlug}/empresa/${business.slug}`}
                className="group flex items-center gap-3 rounded-card border border-borda bg-white p-3 text-left shadow-card transition-shadow hover:border-marca-600 hover:shadow-card-hover"
              >
                <BusinessAvatar
                  name={business.name}
                  logoUrl={business.logoUrl}
                  size={48}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-marca-800">
                    {business.name}
                  </span>
                  {business.description ? (
                    <span className="block truncate text-xs text-texto-suave">
                      {business.description}
                    </span>
                  ) : null}
                </span>
                <span
                  aria-hidden="true"
                  className="shrink-0 text-texto-tenue transition-transform group-hover:translate-x-0.5 group-hover:text-marca-600"
                >
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {temTermo && !loading && !falhou && results.length === 0 ? (
        <p className="mt-3 text-center text-sm text-texto-suave">
          <button
            type="button"
            onClick={abrirBuscaCompleta}
            disabled={pending}
            className="font-bold text-marca-600 underline hover:text-marca-800"
          >
            Ver todos os resultados
          </button>{" "}
          ou{" "}
          <Link href="/busca" className="font-bold text-marca-600 underline hover:text-marca-800">
            buscar em todas as categorias
          </Link>
          .
        </p>
      ) : null}
    </form>
  );
}
