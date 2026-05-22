// Wrapper que renderiza um app externo via iframe (mesma origem).
export function IframeApp({ src, title }: { src: string; title: string }) {
  return (
    <iframe
      src={src}
      title={title}
      className="h-full w-full border-0 bg-background"
      // sandbox omitido propositalmente: apps confiaveis dentro do shell precisam
      // de same-origin pra ler cookie httpOnly e usar localStorage.
    />
  );
}
