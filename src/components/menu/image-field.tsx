"use client";

import { useRef, useState } from "react";

import { uploadImage } from "@/lib/menu/actions";
import { emptyUploadState } from "@/lib/menu/state";

const input =
  "min-h-10 w-full rounded-logo border border-borda bg-white px-3 text-sm text-texto-forte focus:border-marca-600";

/**
 * Campo de foto com duas entradas: enviar arquivo ou colar uma URL.
 *
 * O upload é disparado por `onChange` chamando a Server Action direto, em vez
 * de um `<form action>`. Um `<form>` dentro de outro `<form>` é HTML
 * inválido, e o editor de produto já é um formulário — aninhar quebraria o
 * "Salvar" do item junto com o envio da foto.
 *
 * A URL final vai num `input hidden`, então o resto do formulário salva
 * exatamente como salvaria um texto digitado à mão.
 */
export function ImageField({
  businessId,
  name,
  defaultValue,
  label = "Foto",
  hint = "JPG, PNG, WebP ou AVIF, até 5 MB.",
}: {
  businessId: number;
  name: string;
  defaultValue?: string | null;
  label?: string;
  hint?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function send(file: File) {
    const body = new FormData();
    body.set("businessId", String(businessId));
    body.set("file", file);

    setUploading(true);
    setError(null);
    try {
      const result = await uploadImage(emptyUploadState, body);
      if (result.error) setError(result.error);
      else setValue(result.url ?? "");
    } catch {
      setError("Falha de rede no envio. Tente de novo.");
    } finally {
      setUploading(false);
      // permite reenviar o mesmo arquivo depois de corrigir
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <span className="mb-1 block text-xs font-semibold text-texto-forte">
        {label}
      </span>
      <input type="hidden" name={name} value={value} />

      {value ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt=""
            className="h-16 w-16 shrink-0 rounded-logo border border-borda object-cover"
          />
          <div className="min-w-0 flex-1">
            {/*
              `type="text"` (e não `url`): o banco guarda também caminhos
              relativos (ex.: imagens do seed, `/grupos/comida.jpg`), que o
              `<img src>` resolve contra o domínio. Com `type="url"` a
              validação HTML5 reprovava esse valor e bloqueava o submit do
              formulário inteiro em silêncio — o "Salvar" do item não fazia
              nada. `inputMode="url"` mantém o teclado adequado no celular.
            */}
            <input
              type="text"
              inputMode="url"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              aria-label={`${label} (URL)`}
              className={input}
              placeholder="https://…"
            />
            <button
              type="button"
              onClick={() => setValue("")}
              className="mt-1 text-xs font-bold text-texto-tenue hover:text-erro-700"
            >
              Remover foto
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label
          className={`inline-flex min-h-10 cursor-pointer items-center rounded-pill border border-borda-forte px-4 text-xs font-bold text-texto-suave transition-colors hover:border-marca-600 hover:text-marca-800 ${
            uploading ? "pointer-events-none opacity-60" : ""
          }`}
        >
          {uploading ? "Enviando…" : "Enviar foto"}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="sr-only"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void send(file);
            }}
          />
        </label>
        {hint ? <span className="text-xs text-texto-tenue">{hint}</span> : null}
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-xs font-semibold text-erro-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
