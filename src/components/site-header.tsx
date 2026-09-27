"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { useCity } from "@/components/city-provider";
import { navigation, siteConfig } from "@/lib/site";

function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label={`${siteConfig.name} — página inicial`}
      className={`inline-flex items-center ${className}`}
    >
      <span
        aria-hidden="true"
        className="grid h-10 w-10 place-items-center rounded-logo bg-white text-lg font-black text-marca-800"
      >
        TA
      </span>
      <span className="text-xl font-black tracking-tight text-white">
        Tudo<span className="text-destaque-500">Agora</span>
      </span>
    </Link>
  );
}

function CitySelect() {
  const { cities, current, select, pending } = useCity();

  return (
    <label className="relative flex items-center">
      <span className="sr-only">Escolha sua cidade</span>
      <select
        value={current.slug}
        disabled={pending}
        onChange={(event) => select(event.target.value)}
        className="h-10 cursor-pointer appearance-none rounded-pill border border-white/40 bg-white py-0 pr-9 pl-4 text-sm font-semibold text-marca-800 transition-colors hover:border-marca-600 disabled:opacity-60"
      >
        {cities.map((city) => (
          <option key={city.slug} value={city.slug}>
            {city.name} - {city.state}
          </option>
        ))}
      </select>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-3 text-xs text-texto-tenue"
      >
        ▼
      </span>
    </label>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // O menu fecha na navegação em vez de num efeito sobre `pathname`: assim
  // não há setState síncrono dentro de efeito e o fechamento é imediato.
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-40 bg-marca-gradient">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 lg:px-6">
        <Logo />

        <nav aria-label="Principal" className="ml-4 hidden md:block">
          <ul className="flex items-center gap-1">
            {navigation.map((item) => {
              const active =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-pill px-4 py-2 text-sm font-semibold transition-colors ${
                      active
                        ? "bg-marca-100 text-marca-800"
                        : "text-white/80 hover:bg-white/15 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          <CitySelect />
          <Link
            href="/minha-conta"
            className="rounded-pill border border-white/40 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            Minha Conta
          </Link>
          <Link
            href="/planos"
            className="rounded-pill bg-destaque-500 px-5 py-2 text-sm font-bold text-marca-900 transition-colors hover:bg-destaque-400"
          >
            Anuncie
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="menu-mobile"
          className="ml-auto grid h-11 w-11 place-items-center rounded-logo border border-white/40 text-white md:hidden"
        >
          <span className="sr-only">Abrir menu</span>
          <span aria-hidden="true" className="text-lg leading-none">
            {open ? "✕" : "☰"}
          </span>
        </button>
      </div>

      {open ? (
        <div id="menu-mobile" className="border-t border-borda bg-white md:hidden">
          <nav aria-label="Principal" className="px-4 py-3">
            <ul className="flex flex-col gap-1">
              {navigation.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={close}
                    className="block rounded-logo px-4 py-3 text-base font-semibold text-texto hover:bg-superficie-2"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-col gap-3 border-t border-borda pt-4">
              <CitySelect />
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/minha-conta"
                  onClick={close}
                  className="rounded-pill border border-borda py-2.5 text-center text-sm font-semibold text-marca-800"
                >
                  Minha Conta
                </Link>
                <Link
                  href="/planos"
                  onClick={close}
                  className="rounded-pill bg-destaque-500 py-2.5 text-center text-sm font-bold text-marca-900"
                >
                  Anuncie
                </Link>
              </div>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
