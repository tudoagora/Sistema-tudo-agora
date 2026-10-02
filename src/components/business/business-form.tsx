"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  createBusiness,
  updateBusiness,
} from "@/app/admin/empresas/actions";
import {
  emptyBusinessForm,
  type BusinessFormState,
} from "@/app/admin/empresas/state";
import {
  updateBusinessProfile,
  type ProfileState,
} from "@/app/painel/[empresa]/perfil/actions";
import { ImageField } from "@/components/menu/image-field";
import {
  BUSINESS_STATUSES,
  BUSINESS_STATUS_OPTIONS,
} from "@/lib/business-status";
import type { City } from "@/lib/catalog";
import {
  FULFILLMENT_LABELS,
  PAYMENT_LABELS,
  type OpeningHours,
} from "@/lib/format";
import { OpeningHoursField } from "./opening-hours";

export type BusinessDefaults = {
  id?: number;
  name?: string;
  slug?: string;
  customSlug?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  instagram?: string | null;
  address?: string | null;
  neighborhood?: string | null;
  openingHours?: OpeningHours | null;
  pixKey?: string | null;
  cityId?: number;
  deliveryFeeCents?: number;
  minOrderCents?: number;
  fulfillment?: string[];
  paymentMethods?: string[];
  acceptQuotes?: boolean;
  isFeatured?: boolean;
  status?: string;
};

type FormState = BusinessFormState & ProfileState;

const field =
  "min-h-11 w-full rounded-logo border border-borda bg-white px-4 text-sm text-texto-forte transition-colors placeholder:text-texto-tenue focus:border-marca-600";
const label = "mb-1.5 block text-sm font-semibold text-texto-forte";

const FULFILLMENT_KEYS = ["delivery", "pickup"] as const;
const PAYMENT_KEYS = ["pix", "dinheiro", "cartao_entrega", "cartao_online"] as const;

const EMPTY: FormState = { ...emptyBusinessForm, saved: false };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-card border border-borda bg-white p-6">
      <legend className="px-2 text-sm font-black text-marca-800">{title}</legend>
      <div className="mt-4 space-y-5">{children}</div>
    </fieldset>
  );
}

function TextField({
  name,
  label: text,
  defaultValue,
  error,
  placeholder,
  type = "text",
  autoComplete,
  maxLength,
  inputMode,
  hint,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  error?: string;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  maxLength?: number;
  inputMode?: "text" | "tel" | "email" | "url" | "numeric";
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className={label}>
        {text}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        autoComplete={autoComplete}
        maxLength={maxLength}
        inputMode={inputMode}
        aria-invalid={error ? true : undefined}
        className={`${field} ${error ? "border-erro" : ""}`}
      />
      {error ? <p className="mt-1 text-xs text-erro-700">{error}</p> : null}
      {hint && !error ? <p className="mt-1 text-xs text-texto-tenue">{hint}</p> : null}
    </div>
  );
}

function CheckPill({
  name,
  value,
  checked,
  text,
}: {
  name: string;
  value: string;
  checked?: boolean;
  text: string;
}) {
  return (
    <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-pill border border-borda-forte px-4 text-sm text-texto-forte transition-colors has-checked:border-marca-600 has-checked:bg-marca-100">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={checked}
        className="h-4 w-4 accent-marca-800"
      />
      {text}
    </label>
  );
}

/**
 * Formulário de empresa, usado no admin e no painel do lojista.
 *
 * `mode="merchant"` é a diferença que importa: some com os campos de
 * publicação (situação, destaque, cidade, slug) e despacha para
 * `updateBusinessProfile`, que só grava colunas seguras. Nesses campos o
 * merchant poderia se autoaprovar, e o trigger
 * `businesses_guard_admin_columns` (migration 0008) recusaria o save.
 */
export function BusinessForm({
  mode = "admin",
  businessId,
  cities = [],
  defaults,
}: {
  mode?: "admin" | "merchant";
  /** Exigido no modo merchant: identifica a empresa a ser salva. */
  businessId?: number;
  cities?: City[];
  defaults?: BusinessDefaults;
}) {
  const merchant = mode === "merchant";
  const isEdit = Boolean(defaults?.id ?? businessId);
  const id = defaults?.id ?? businessId;

  const action = merchant
    ? updateBusinessProfile
    : isEdit
      ? updateBusiness
      : createBusiness;

  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action as (prev: FormState, formData: FormData) => Promise<FormState>,
    EMPTY,
  );

  const error = (key: string) => state.fieldErrors[key];

  const handleSubmit = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-6">
      {id ? (
        <input type="hidden" name="businessId" value={id} />
      ) : null}
      {id && !merchant ? (
        <input type="hidden" name="id" value={id} />
      ) : null}

      {state.error ? (
        <p
          role="alert"
          className="rounded-card border border-erro/30 bg-erro/5 px-5 py-4 text-sm text-erro-700"
        >
          {state.error}
        </p>
      ) : null}
      {pending ? (
        <p
          role="status"
          aria-live="polite"
          className="flex items-center gap-3 rounded-card border border-borda bg-superficie px-5 py-4 text-sm font-semibold text-texto-forte"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="h-4 w-4 shrink-0 animate-spin text-marca-600"
          >
            <circle
              cx="12"
              cy="12"
              r="9"
              stroke="currentColor"
              strokeWidth="3"
              className="opacity-25"
            />
            <path
              d="M21 12a9 9 0 0 0-9-9"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
          Salvando os dados da empresa…
        </p>
      ) : state.saved ? (
        <p
          role="status"
          className="rounded-card border border-sucesso/30 bg-sucesso/5 px-5 py-4 text-sm font-semibold text-texto-forte"
        >
          Dados salvos. Já aparecem na vitrine.
        </p>
      ) : null}

      <Section title="Identificação">
        <TextField
          name="name"
          label="Nome da empresa *"
          defaultValue={defaults?.name}
          error={error("name")}
          placeholder="Sabor da Itália Delivery"
          maxLength={120}
        />

        {!merchant ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              name="slug"
              label="Endereço da página"
              defaultValue={defaults?.slug}
              error={error("slug")}
              placeholder="sabor-da-italia-delivery"
              hint="Deixe em branco para gerar a partir do nome."
              maxLength={80}
            />
            <TextField
              name="customSlug"
              label="Subdomínio próprio"
              defaultValue={defaults?.customSlug}
              error={error("customSlug")}
              placeholder="sabordaitalia"
              hint="Vira saboritalia.tudoagora.app.br"
              maxLength={80}
            />
          </div>
        ) : null}

        <div>
          <label htmlFor="description" className={label}>
            Descrição
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            maxLength={1000}
            defaultValue={defaults?.description ?? ""}
            placeholder="O que a empresa faz, o que se destaca, o que o cliente vai encontrar."
            className={`${field} py-3`}
          />
          {error("description") ? (
            <p className="mt-1 text-xs text-erro-700">{error("description")}</p>
          ) : null}
        </div>

        {id ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <ImageField
              businessId={id}
              name="logoUrl"
              defaultValue={defaults?.logoUrl}
              label="Logo"
              hint="Quadrado, até 2 MB."
            />
            <ImageField
              businessId={id}
              name="coverUrl"
              defaultValue={defaults?.coverUrl}
              label="Foto de capa"
              hint="Horizontal, aparece no topo da página da loja."
            />
          </div>
        ) : null}
      </Section>

      <Section title="Onde fica">
        {!merchant ? (
          <div>
            <label htmlFor="cityId" className={label}>
              Cidade *
            </label>
            <select
              id="cityId"
              name="cityId"
              defaultValue={String(defaults?.cityId ?? cities[0]?.id ?? "")}
              className={field}
              aria-invalid={error("cityId") ? true : undefined}
            >
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name} - {city.state}
                </option>
              ))}
            </select>
            {error("cityId") ? (
              <p className="mt-1 text-xs text-erro-700">{error("cityId")}</p>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            name="address"
            label="Endereço"
            defaultValue={defaults?.address}
            error={error("address")}
            placeholder="Rua Paraiba 178"
            autoComplete="street-address"
            maxLength={240}
          />
          <TextField
            name="neighborhood"
            label="Bairro"
            defaultValue={defaults?.neighborhood}
            error={error("neighborhood")}
            maxLength={120}
          />
        </div>
      </Section>

      <Section title="Contato">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            name="phone"
            label="Telefone"
            type="tel"
            inputMode="tel"
            defaultValue={defaults?.phone}
            error={error("phone")}
            autoComplete="tel"
            maxLength={40}
          />
          <TextField
            name="whatsapp"
            label="WhatsApp"
            type="tel"
            inputMode="tel"
            defaultValue={defaults?.whatsapp}
            error={error("whatsapp")}
            hint="Com DDD. Ex.: 66992391831"
            autoComplete="tel"
            maxLength={40}
          />
          <TextField
            name="email"
            label="E-mail"
            type="email"
            inputMode="email"
            defaultValue={defaults?.email}
            error={error("email")}
            autoComplete="email"
            maxLength={160}
          />
          <TextField
            name="instagram"
            label="Instagram"
            defaultValue={defaults?.instagram}
            error={error("instagram")}
            placeholder="@perfil"
            maxLength={80}
          />
        </div>
      </Section>

      <Section title="Vendas e entrega">
        <div>
          <p className={label}>Como o cliente recebe</p>
          <div className="flex flex-wrap gap-2">
            {FULFILLMENT_KEYS.map((key) => (
              <CheckPill
                key={key}
                name="fulfillment"
                value={key}
                text={FULFILLMENT_LABELS[key] ?? key}
                checked={defaults?.fulfillment?.includes(key)}
              />
            ))}
          </div>
          {error("fulfillment") ? (
            <p className="mt-1 text-xs text-erro-700">{error("fulfillment")}</p>
          ) : null}
        </div>

        <div>
          <p className={label}>Formas de pagamento</p>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_KEYS.map((key) => (
              <CheckPill
                key={key}
                name="paymentMethods"
                value={key}
                text={PAYMENT_LABELS[key] ?? key}
                checked={defaults?.paymentMethods?.includes(key)}
              />
            ))}
          </div>
          {error("paymentMethods") ? (
            <p className="mt-1 text-xs text-erro-700">{error("paymentMethods")}</p>
          ) : null}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="deliveryFeeReais" className={label}>
              Taxa de entrega (R$)
            </label>
            <input
              id="deliveryFeeReais"
              name="deliveryFeeReais"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              defaultValue={((defaults?.deliveryFeeCents ?? 0) / 100).toFixed(2)}
              className={field}
            />
            {error("deliveryFeeReais") ? (
              <p className="mt-1 text-xs text-erro-700">{error("deliveryFeeReais")}</p>
            ) : null}
          </div>
          <div>
            <label htmlFor="minOrderReais" className={label}>
              Pedido mínimo (R$)
            </label>
            <input
              id="minOrderReais"
              name="minOrderReais"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              defaultValue={((defaults?.minOrderCents ?? 0) / 100).toFixed(2)}
              className={field}
            />
            {error("minOrderReais") ? (
              <p className="mt-1 text-xs text-erro-700">{error("minOrderReais")}</p>
            ) : null}
          </div>
        </div>

        <div>
          <label htmlFor="pixKey" className={label}>
            Chave Pix
          </label>
          <input
            id="pixKey"
            name="pixKey"
            defaultValue={defaults?.pixKey ?? ""}
            maxLength={140}
            placeholder="e-mail, telefone, CPF/CNPJ ou aleatória"
            className={field}
          />
          {error("pixKey") ? (
            <p className="mt-1 text-xs text-erro-700">{error("pixKey")}</p>
          ) : null}
        </div>
      </Section>

      <Section title="Funcionamento">
        <OpeningHoursField
          name="hours"
          defaultValue={defaults?.openingHours}
        />
      </Section>

      <Section title="Publicação">
        {!merchant ? (
          <div>
            <label htmlFor="status" className={label}>
              Situação
            </label>
            <select
              id="status"
              name="status"
              defaultValue={defaults?.status ?? "draft"}
              className={field}
            >
              {BUSINESS_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {BUSINESS_STATUS_OPTIONS[value]}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-texto-tenue">
              Somente a equipe do Tudo Agora altera a situação da empresa.
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {!merchant ? (
            <CheckPill
              name="isFeatured"
              value="on"
              checked={defaults?.isFeatured}
              text="Destacar em Destaques"
            />
          ) : null}
          <CheckPill
            name="acceptQuotes"
            value="on"
            checked={defaults?.acceptQuotes}
            text="Receber solicitação de orçamento"
          />
        </div>
      </Section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="min-h-12 rounded-pill bg-marca-gradient px-8 text-sm font-bold text-white transition-opacity hover:opacity-95 disabled:opacity-60"
        >
          {pending
            ? "Salvando…"
            : isEdit
              ? "Salvar alterações"
              : "Cadastrar empresa"}
        </button>
        <Link
          href={merchant ? `/painel/${id}` : "/admin/empresas"}
          className="inline-flex min-h-12 items-center rounded-pill border border-borda-forte px-6 text-sm font-semibold text-texto-suave"
        >
          {merchant ? "Voltar ao painel" : "Cancelar"}
        </Link>
      </div>
    </form>
  );
}
