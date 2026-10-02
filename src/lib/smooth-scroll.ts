/**
 * Rolagem suave com duração controlada.
 *
 * `behavior: "smooth"` do browser não deixa escolher o tempo — ele sempre
 * resolve em ~300ms, o que na home era mais rápido que a resposta do servidor
 * e deixava a rolagem "atrás" do conteúdo. Aqui a duração sai da distância
 * percorrida (com piso e teto), então a viagem cobre a ida ao banco e a
 * listagem filtrada já está na tela quando o olho chega.
 */

/** Abaixo de 650ms a rolagemSome antes do filtro; acima de 1600ms fica arrastada. */
const MIN_MS = 650;
const MAX_MS = 1600;
/** 0.45ms por pixel: ~900ms para as ~2000px que a home percorre. */
const MS_PER_PX = 0.45;

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

let cancel: (() => void) | null = null;

/** Interrompe a rolagem em andamento (nova rolagem, ou o visitante assume o comando). */
export function stopSmoothScroll() {
  cancel?.();
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Rola até `target` considerando o `scroll-margin-top` que a seção já tem no
 * CSS (é ele que tira o título de baixo do header fixo).
 */
export function smoothScrollTo(target: Element) {
  const marginTop =
    parseFloat(window.getComputedStyle(target).scrollMarginTop) || 0;
  const destination =
    target.getBoundingClientRect().top + window.scrollY - marginTop;
  const delta = destination - window.scrollY;

  stopSmoothScroll();

  // `prefers-reduced-motion` manda pular direto, como o bloco equivalente em
  // `globals.css` faz com `scroll-behavior`.
  if (prefersReducedMotion() || Math.abs(delta) < 1) {
    window.scrollTo(0, destination);
    return;
  }

  const duration = Math.min(
    MAX_MS,
    Math.max(MIN_MS, Math.abs(delta) * MS_PER_PX),
  );
  const origin = window.scrollY;
  const startedAt = performance.now();

  const giveUp = () => stopSmoothScroll();
  const step = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / duration);
    window.scrollTo(0, origin + delta * easeInOutCubic(progress));
    if (progress < 1) requestAnimationFrame(step);
  };

  // Qualquer toque do visitante interrompe: animação que não cede o controle
  // é animação que se sente travada.
  window.addEventListener("wheel", giveUp, { passive: true });
  window.addEventListener("touchstart", giveUp, { passive: true });
  window.addEventListener("keydown", giveUp, { passive: true });

  cancel = () => {
    window.removeEventListener("wheel", giveUp);
    window.removeEventListener("touchstart", giveUp);
    window.removeEventListener("keydown", giveUp);
    cancel = null;
  };

  requestAnimationFrame(step);
}
