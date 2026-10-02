import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { AdminFlash } from "@/components/admin/flash";
import { requireAdmin } from "@/lib/auth";
import { AD_LIMIT_KEY, AD_PLACEMENT, DEFAULT_AD_LIMIT } from "@/lib/banners";
import type { AdminFlashParams } from "@/lib/admin-flash";
import { createClient } from "@/lib/supabase/server";
import {
  deleteBanner,
  moveBanner,
  saveAdLimit,
  saveBanner,
} from "./actions";
import { AD_IMAGE_HINT, AD_LIMIT_OPTIONS } from "./state";

export const metadata: Metadata = { title: "Banners" };

const select =
  "min-h-11 w-full rounded-logo border border-borda bg-white px-4 text-sm text-texto-forte focus:border-marca-600";

/**
 * Sem `Math.min`/`max` aqui: o valor gravado é sempre um item de
 * `AD_LIMIT_OPTIONS` (a action valida), e um texto fora da lista só voltaria
 * com o select sem nada selecionado. O default cobre a chave ainda não criada.
 */
function limiteAtual(value: string | undefined) {
  const numero = Number(value);
  return AD_LIMIT_OPTIONS.includes(numero) ? numero : DEFAULT_AD_LIMIT;
}

export default async function BannersAdminPage(
  props: PageProps<"/admin/banners">,
) {
  await requireAdmin();
  const params = (await props.searchParams) as AdminFlashParams;
  const supabase = await createClient();

  const [{ data: banners }, { data: setting }] = await Promise.all([
    supabase
      .from("banners")
      .select("id, title, image_url, link_url, is_active, sort_order")
      .eq("placement", AD_PLACEMENT)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true }),
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", AD_LIMIT_KEY)
      .maybeSingle(),
  ]);

  const rows = banners ?? [];
  const limite = limiteAtual(setting?.value);
  const inativos = rows.filter((row) => !row.is_active).length;
  // A home só lê os ativos e só depois corta pelo limite, então é essa a conta
  // que a tela precisa mostrar — contar a lista inteira daria um número maior
  // que o que o visitante vê.
  const ativos = rows.length - inativos;
  const visiveis = Math.min(limite, ativos);

  return (
    <div className="mx-auto w-full max-w-4xl">
      <h1 className="text-2xl font-black tracking-tight text-marca-800">
        Banners de publicidade
      </h1>
      <AdminFlash params={params} />
      <p className="mt-1 text-sm text-texto-suave">
        A faixa que aparece na home, abaixo de{" "}
        <strong className="text-texto-forte">Destaques na cidade</strong> e
        antes de Descubra. Ela aponta para{" "}
        <Link href="/planos" className="font-semibold text-marca-600 underline">
          /planos
        </Link>
        .
      </p>

      <form
        action={saveAdLimit}
        className="mt-6 flex flex-wrap items-end gap-3 rounded-card border border-borda bg-white p-5"
      >
        <div className="w-full sm:w-48">
          <label
            htmlFor="limite"
            className="mb-1.5 block text-xs font-semibold text-texto-forte"
          >
            Quantos banners exibir
          </label>
          <select
            id="limite"
            name="limite"
            defaultValue={limite}
            className={select}
          >
            {AD_LIMIT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "banner" : "banners"}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="min-h-11 rounded-pill bg-marca-gradient px-5 text-sm font-bold text-white"
        >
          Salvar quantidade
        </button>
        <p className="w-full text-xs text-texto-tenue sm:w-auto sm:flex-1">
          Hoje a home mostra{" "}
          <strong className="text-texto-forte">
            {visiveis} {visiveis === 1 ? "banner" : "banners"}
          </strong>{" "}
          de {ativos} {ativos === 1 ? "ativo" : "ativos"}
          {inativos > 0
            ? ` — ${inativos} inativo${inativos === 1 ? "" : "s"} na lista, que não entram na rotação.`
            : "."}
        </p>
      </form>

      <h2 className="mt-10 text-lg font-bold text-texto-forte">
        Ordem de exibição
      </h2>
      <p className="mt-1 text-sm text-texto-suave">
        O primeiro da lista é o que a home abre. Use as setas para trocar de
        posição.
      </p>

      {rows.length > 0 ? (
        <ul className="mt-5 space-y-4">
          {rows.map((banner, i) => (
            <li
              key={banner.id}
              className="rounded-card border border-borda bg-white p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-pill bg-marca-100 text-xs font-black text-marca-800">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-bold text-texto-forte">
                      {banner.title || "Sem título"}
                    </p>
                    <p className="text-xs text-texto-tenue">
                      {banner.is_active ? "ativo" : "inativo"} ·{" "}
                      {banner.link_url || "/planos"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <OrdenarButton
                    id={banner.id}
                    direcao="up"
                    disabled={i === 0}
                    label={`Subir ${banner.title || `o banner ${i + 1}`}`}
                  />
                  <OrdenarButton
                    id={banner.id}
                    direcao="down"
                    disabled={i === rows.length - 1}
                    label={`Descer ${banner.title || `o banner ${i + 1}`}`}
                  />
                  <form action={deleteBanner} className="ml-2">
                    <input type="hidden" name="id" value={banner.id} />
                    <button
                      type="submit"
                      className="font-semibold text-texto-suave hover:text-erro-700"
                    >
                      Excluir
                    </button>
                  </form>
                </div>
              </div>

              {banner.image_url ? (
                <div className="mt-4 overflow-hidden rounded-logo border border-borda bg-marca-900">
                  {/* `unoptimized` porque o admin pode colar uma URL de fora e
                      o host não está em `images.remotePatterns`. */}
                  <Image
                    src={banner.image_url}
                    alt={banner.title ?? "Prévia do banner"}
                    width={1600}
                    height={533}
                    unoptimized={!banner.image_url.startsWith("/")}
                    quality={75}
                    sizes="(max-width: 896px) 100vw, 832px"
                    className="h-auto w-full"
                  />
                </div>
              ) : null}

              <form
                action={saveBanner}
                className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_9rem_auto] sm:items-end"
              >
                <input type="hidden" name="id" value={banner.id} />

                <div>
                  <label
                    htmlFor={`title-${banner.id}`}
                    className="mb-1.5 block text-xs font-semibold text-texto-forte"
                  >
                    Título
                  </label>
                  <input
                    id={`title-${banner.id}`}
                    name="title"
                    defaultValue={banner.title ?? ""}
                    maxLength={120}
                    placeholder="Anuncie no Tudo Agora"
                    className={select}
                  />
                </div>

                <div>
                  <label
                    htmlFor={`imageUrl-${banner.id}`}
                    className="mb-1.5 block text-xs font-semibold text-texto-forte"
                  >
                    Imagem
                  </label>
                  <input
                    id={`imageUrl-${banner.id}`}
                    name="imageUrl"
                    defaultValue={banner.image_url ?? ""}
                    required
                    spellCheck={false}
                    placeholder="/banners/publicidade/anuncie-1.png"
                    className={select}
                  />
                </div>

                <div>
                  <label
                    htmlFor={`linkUrl-${banner.id}`}
                    className="mb-1.5 block text-xs font-semibold text-texto-forte"
                  >
                    Link
                  </label>
                  <input
                    id={`linkUrl-${banner.id}`}
                    name="linkUrl"
                    defaultValue={banner.link_url ?? "/planos"}
                    spellCheck={false}
                    placeholder="/planos"
                    className={select}
                  />
                </div>

                <label className="flex min-h-11 items-center gap-2 text-sm text-texto-forte sm:mb-3">
                  <input
                    type="checkbox"
                    name="isActive"
                    defaultChecked={banner.is_active}
                    className="h-4 w-4 accent-marca-600"
                  />
                  Ativo
                </label>

                <p className="text-xs text-texto-tenue sm:col-span-4">
                  {AD_IMAGE_HINT}
                </p>
                <button
                  type="submit"
                  className="min-h-11 rounded-pill bg-marca-gradient px-5 text-sm font-bold text-white sm:col-span-4 sm:w-fit"
                >
                  Salvar
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 rounded-card border border-dashed border-borda-forte bg-white p-10 text-center text-sm text-texto-suave">
          Nenhum banner cadastrado. Use o formulário abaixo para adicionar o
          primeiro.
        </p>
      )}

      <h2 className="mt-10 text-lg font-bold text-texto-forte">
        Adicionar banner
      </h2>
      <p className="mt-1 text-sm text-texto-suave">
        O banner entra no fim da fila. Depois de salvar, use as setas para
        colocá-lo onde quiser.
      </p>

      <form
        action={saveBanner}
        className="mt-5 grid gap-3 rounded-card border border-borda bg-white p-5 sm:grid-cols-2"
      >
        <div>
          <label
            htmlFor="novo-title"
            className="mb-1.5 block text-xs font-semibold text-texto-forte"
          >
            Título
          </label>
          <input
            id="novo-title"
            name="title"
            maxLength={120}
            placeholder="Anuncie no Tudo Agora"
            className={select}
          />
        </div>

        <div>
          <label
            htmlFor="novo-linkUrl"
            className="mb-1.5 block text-xs font-semibold text-texto-forte"
          >
            Link
          </label>
          <input
            id="novo-linkUrl"
            name="linkUrl"
            defaultValue="/planos"
            spellCheck={false}
            placeholder="/planos"
            className={select}
          />
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="novo-imageUrl"
            className="mb-1.5 block text-xs font-semibold text-texto-forte"
          >
            Imagem
          </label>
          <input
            id="novo-imageUrl"
            name="imageUrl"
            required
            spellCheck={false}
            placeholder="/banners/publicidade/anuncie-3.png"
            className={select}
          />
          <p className="mt-1.5 text-xs text-texto-tenue">{AD_IMAGE_HINT}</p>
        </div>

        <div className="flex items-center gap-3 sm:col-span-2">
          <label className="flex items-center gap-2 text-sm text-texto-forte">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked
              className="h-4 w-4 accent-marca-600"
            />
            Ativo
          </label>
          <button
            type="submit"
            className="ml-auto min-h-11 rounded-pill bg-marca-gradient px-5 text-sm font-bold text-white"
          >
            Adicionar banner
          </button>
        </div>
      </form>
    </div>
  );
}

function OrdenarButton({
  id,
  direcao,
  disabled,
  label,
}: {
  id: number;
  direcao: "up" | "down";
  disabled: boolean;
  label: string;
}) {
  return (
    <form action={moveBanner}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="direcao" value={direcao} />
      <button
        type="submit"
        disabled={disabled}
        aria-label={label}
        title={label}
        className="grid h-9 w-9 place-items-center rounded-logo border border-borda text-texto-suave transition-colors hover:border-marca-600 hover:text-marca-700 disabled:cursor-not-allowed disabled:border-borda disabled:text-texto-tenue/40 disabled:hover:border-borda disabled:hover:text-texto-tenue/40"
      >
        <span aria-hidden="true">{direcao === "up" ? "↑" : "↓"}</span>
      </button>
    </form>
  );
}
