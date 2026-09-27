"use client";

import { useState } from "react";

import { WEEKDAY_KEYS, type OpeningHours, type WeekdayKey } from "@/lib/format";
import { cn } from "@/lib/utils";

const DAY_LABELS: Record<WeekdayKey, string> = {
  sun: "Domingo",
  mon: "Segunda",
  tue: "Terça",
  wed: "Quarta",
  thu: "Quinta",
  fri: "Sexta",
  sat: "Sábado",
};

const DAY_ORDER: WeekdayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const field =
  "min-h-10 rounded-logo border border-borda bg-white px-3 text-sm text-texto-forte focus:border-marca-600";

type Row = { open: boolean; from: string; to: string };

/**
 * Lê o `opening_hours` jsonb para um formulário de 7 linhas.
 *
 * A coluna guarda `Record<string, string[][]>`, e um dia ausente significa
 * "não informado" — não "fechado". Aqui os dois casos viram "fechado", que é
 * o que o lojista entende olhando a tela. O valor anterior é reescrito inteiro
 * a cada save, então nada se perde.
 */
function toRows(hours: OpeningHours | null | undefined): Record<WeekdayKey, Row> {
  const source = hours && typeof hours === "object" ? hours : {};
  const rows = {} as Record<WeekdayKey, Row>;
  for (const key of DAY_ORDER) {
    const first = source[key]?.[0];
    rows[key] = first
      ? { open: true, from: first[0] ?? "18:00", to: first[1] ?? "23:00" }
      : { open: false, from: "18:00", to: "23:00" };
  }
  return rows;
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export function OpeningHoursField({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue: OpeningHours | null | undefined;
}) {
  const initial = toRows(defaultValue);
  const [rows, setRows] = useState(initial);

  const set = (key: WeekdayKey, patch: Partial<Row>) =>
    setRows((antes) => ({ ...antes, [key]: { ...antes[key], ...patch } }));

  const copiarDoDia = (de: WeekdayKey, para: WeekdayKey) => {
    setRows((antes) => ({ ...antes, [para]: { ...antes[de] } }));
  };

  const horaDeTodoMundo = (open: boolean) =>
    setRows((antes) => {
      const novo = { ...antes };
      for (const key of DAY_ORDER) {
        novo[key] = open ? { ...novo[key], open: true } : { ...novo[key], open: false };
      }
      return novo;
    });

  return (
    <div className="space-y-3">
      <p className="text-xs text-texto-suave">
        Cada dia aceita um horário. É o que o cliente vê como &quot;Aberto
        agora&quot; na vitrine do cardápio. Dia fechado não aparece.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => horaDeTodoMundo(true)}
          className="min-h-9 rounded-pill border border-borda-forte px-3 text-xs font-semibold text-texto-suave hover:border-marca-600 hover:text-marca-800"
        >
          Abrir todos
        </button>
        <button
          type="button"
          onClick={() => horaDeTodoMundo(false)}
          className="min-h-9 rounded-pill border border-borda-forte px-3 text-xs font-semibold text-texto-suave hover:border-marca-600 hover:text-marca-800"
        >
          Fechar todos
        </button>
      </div>

      <ul className="divide-y divide-borda overflow-hidden rounded-logo border border-borda">
        {DAY_ORDER.map((key) => {
          const row = rows[key];
          const invalido =
            row.open && (!HHMM.test(row.from) || !HHMM.test(row.to));

          return (
            <li
              key={key}
              className="flex flex-wrap items-center gap-3 bg-white px-3 py-2.5"
            >
              <label className="flex min-w-36 items-center gap-2 text-sm font-semibold text-texto-forte">
                <input
                  type="checkbox"
                  checked={row.open}
                  onChange={(e) => set(key, { open: e.target.checked })}
                  className="h-4 w-4 accent-marca-800"
                />
                {DAY_LABELS[key]}
              </label>

              {row.open ? (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    aria-label={`Abre às - ${DAY_LABELS[key]}`}
                    value={row.from}
                    onChange={(e) => set(key, { from: e.target.value })}
                    className={cn(field, invalido && "border-erro")}
                  />
                  <span className="text-xs text-texto-tenue">até</span>
                  <input
                    type="time"
                    aria-label={`Fecha às - ${DAY_LABELS[key]}`}
                    value={row.to}
                    onChange={(e) => set(key, { to: e.target.value })}
                    className={cn(field, invalido && "border-erro")}
                  />
                </div>
              ) : (
                <span className="text-xs text-texto-tenue">Fechado</span>
              )}

              <div className="ml-auto flex flex-wrap items-center gap-1">
                {DAY_ORDER.filter((outro) => outro !== key && rows[outro].open)
                  .slice(0, 1)
                  .map((outro) => (
                    <button
                      key={outro}
                      type="button"
                      onClick={() => copiarDoDia(outro, key)}
                      className="min-h-9 rounded-logo px-2 text-xs font-semibold text-marca-600 hover:bg-marca-100"
                      title={`Copiar o horário de ${DAY_LABELS[outro]}`}
                    >
                      Copiar {DAY_LABELS[outro]}
                    </button>
                  ))}
              </div>
            </li>
          );
        })}
      </ul>

      {Object.values(rows).some((r) => r.open && (!HHMM.test(r.from) || !HHMM.test(r.to))) ? (
        <p role="alert" className="text-xs font-semibold text-erro-700">
          Confira os horários: use o formato 18:00.
        </p>
      ) : null}

      {/* Um input por dia é o que a action lê. Vazio = fechado. */}
      {DAY_ORDER.map((key) => (
        <input
          key={key}
          type="hidden"
          name={`${name}.${key}`}
          value={rows[key].open ? `${rows[key].from}-${rows[key].to}` : ""}
        />
      ))}
      <input type="hidden" name={`${name}Keys`} value={WEEKDAY_KEYS.join(",")} />
    </div>
  );
}
