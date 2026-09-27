"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useTransition,
  type ReactNode,
} from "react";

import type { City } from "@/lib/catalog";
import { CITY_COOKIE } from "@/lib/constants";

type CityContextValue = {
  cities: City[];
  current: City;
  select: (slug: string) => void;
  pending: boolean;
};

const CityContext = createContext<CityContextValue | null>(null);

export function CityProvider({
  cities,
  current,
  children,
}: {
  cities: City[];
  current: City;
  children: ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const select = useCallback(
    (slug: string) => {
      if (slug === current.slug) return;
      // Um ano, para o seletor lembrar a escolha entre visitas.
      document.cookie = `${CITY_COOKIE}=${slug}; path=/; max-age=31536000; samesite=lax`;
      startTransition(() => router.refresh());
    },
    [current.slug, router],
  );

  const value = useMemo(
    () => ({ cities, current, select, pending }),
    [cities, current, select, pending],
  );

  return <CityContext value={value}>{children}</CityContext>;
}

export function useCity(): CityContextValue {
  const context = useContext(CityContext);
  if (!context) {
    throw new Error("useCity precisa estar dentro de <CityProvider>");
  }
  return context;
}
