/**
 * Guarda de duas decisões que só fazem sentido no host de build da Hostinger
 * e que quebram o deploy se alguém voltar atrás sem perceber.
 *
 *   1) `next` tem que ficar em 16.2.x. O container de build tem glibc antigo
 *      (sem GLIBC_2.29) e o binário nativo do SWC a partir de 16.3.x é
 *      compilado contra GLIBC_2.30. Sem o binário nativo o Next cai no
 *      fallback WASM, e aí o Turbopack nem roda e o next.config.ts quebra.
 *
 *   2) `build` tem que ser `next build --webpack`. O Turbopack avalia o
 *      postcss.config.mjs num processo node filho, e nesse container o filho
 *      morre antes do handshake (evaluate_webpack_loader).
 *
 * Roda como `prebuild`, então falha antes de gastar 50s de build na
 * Hostinger. Não substitui o build de verdade — só evita subir um commit
 * que já se sabe quebrado.
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pkg = require("../package.json");

/**
 * Maior versão de GLIBC referenciada por um binário ELF. É o mesmo método que
 * usei para achar o corte: varrer as strings do .node e pegar o maior
 * GLIBC_x.y. Em binário que não é ELF (ou não existe) devolve null.
 */
function maiorGlibcExigido(caminhoBinario) {
  let bytes;
  try {
    bytes = readFileSync(caminhoBinario);
  } catch {
    return null;
  }

  const texto = bytes.toString("latin1");
  const achados = texto.match(/GLIBC_(\d+\.\d+(?:\.\d+)?)/g);
  if (!achados) return null;

  return achados
    .map((achado) => achado.slice("GLIBC_".length))
    .map((versao) => versao.split(".").map(Number))
    .reduce((maior, atual) =>
      atual[0] > maior[0] || (atual[0] === maior[0] && atual[1] >= maior[1])
        ? atual
        : maior,
    );
}

/** "16.2.12" -> [16, 2, 12] */
function partes(versao) {
  return versao.split(".").map(Number);
}

const problemas = [];

// 1) next dentro da faixa que ainda traz binário compatível com o host.
const partesNext = partes(pkg.dependencies.next);
const [maior, menor] = partesNext;
if (maior !== 16 || menor >= 3) {
  problemas.push(
    `next está em ${pkg.dependencies.next} e o host de build não aguenta 16.3.x ` +
      `(GLIBC_2.30). Volte para 16.2.12 — e o eslint-config-next junto, na mesma versão.`,
  );
}

// 2) build pelo webpack, senão o Turbopack quebra no postcss.config.mjs.
if (!/next build\s+--webpack\b/.test(pkg.scripts.build)) {
  problemas.push(
    `o script "build" é "${pkg.scripts.build}" e precisa ser "next build --webpack". ` +
      `Sem --webpack o Turbopack morre no postcss.config.mjs nesse host.`,
  );
}

// 3) Confere o binário de fato, quando ele existe e é ELF. Pega o caso em que
//    alguém troca a versão por uma que só quebra em glibc. Em Windows (dev) o
//    pacote linux não está instalado, e a checagem não roda — quem valida isso
//    é o build de verdade na Hostinger.
const caminhoBinario = (() => {
  try {
    return require
      .resolve("@next/swc-linux-x64-gnu/package.json")
      .replace(/package\.json$/, "") + "next-swc.linux-x64-gnu.node";
  } catch {
    return null;
  }
})();

const exigido = caminhoBinario ? maiorGlibcExigido(caminhoBinario) : null;
if (exigido && exigido[0] === 2 && exigido[1] >= 29) {
  problemas.push(
    `o binário do SWC instalado exige GLIBC_${exigido.join(".")} e o host não tem. ` +
      `É o que produz o erro "GLIBC_2.29 not found" e a queda para WASM.`,
  );
}

if (problemas.length > 0) {
  console.error("\n  Build de producao na Hostinger vai falhar:\n");
  for (const problema of problemas) {
    console.error(`  - ${problema}`);
  }
  console.error("");
  process.exit(1);
}

console.log(`next ${pkg.dependencies.next} + webpack: ok para o host da Hostinger`);