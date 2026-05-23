// =============================================================================
// AppContent — primitiva de largura pra paginas de apps. Cada app declara a
// natureza do seu conteudo via `width`, e a primitiva aplica max-width +
// alinhamento apropriado. Evita "stretching pobre" em viewports largos.
//
// Quando usar cada width:
//   - reading     : forma/texto que canso a leitura em linha longa (~720px)
//   - comfortable : configuracoes, formularios densos (~1024px)
//   - wide        : tabelas, listas com muitas colunas (~1280px)
//   - full        : conteudo que ganha com toda a largura (file browser, chat
//                   timeline, board) — default, nao envolve nada extra
//   - widget      : conteudo de tamanho intrinseco (relogio, widget pequeno)
//                   — centralizado horizontalmente
//
// Padding lateral cresce do mobile pra desktop. Sem efeito visual no `full`.
// =============================================================================

import type { ReactNode } from "react";

export type AppContentWidth = "reading" | "comfortable" | "wide" | "full" | "widget";

interface Props {
  width?: AppContentWidth;
  /** Centraliza tambem verticalmente (so faz sentido em widgets pequenos). */
  centerVertical?: boolean;
  /** Sem padding externo. Util quando o app ja gerencia padding. */
  flush?: boolean;
  className?: string;
  children: ReactNode;
}

const MAX_WIDTH: Record<Exclude<AppContentWidth, "full" | "widget">, string> = {
  reading: "max-w-[720px]",
  comfortable: "max-w-[1024px]",
  wide: "max-w-[1280px]",
};

export function AppContent({
  width = "full",
  centerVertical = false,
  flush = false,
  className = "",
  children,
}: Props) {
  const pad = flush ? "" : "px-4 sm:px-6";

  if (width === "full") {
    return <div className={`h-full w-full ${pad} ${className}`}>{children}</div>;
  }

  if (width === "widget") {
    // Largura intrinseca, centralizado horizontalmente (+ verticalmente sob demanda).
    const vCenter = centerVertical ? "items-center" : "items-start pt-8 sm:pt-12";
    return (
      <div className={`flex h-full w-full justify-center ${vCenter} ${pad} ${className}`}>
        <div className="w-max max-w-full">{children}</div>
      </div>
    );
  }

  // reading | comfortable | wide — bounded, centralizado horizontalmente
  return (
    <div className={`h-full w-full ${pad} ${className}`}>
      <div className={`mx-auto h-full w-full ${MAX_WIDTH[width]}`}>{children}</div>
    </div>
  );
}
