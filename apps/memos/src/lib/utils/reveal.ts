// 滚动进入视口时淡入上浮（一次性）。用法：<div use:reveal={80}>，参数为延迟毫秒数。
export function reveal(node: HTMLElement, delay = 0): { destroy(): void } {
  node.style.setProperty("--reveal-delay", `${delay}ms`);

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || !("IntersectionObserver" in window)) {
    node.classList.add("is-revealed");
    return { destroy() {} };
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          node.classList.add("is-revealed");
          observer.disconnect();
        }
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
  );
  observer.observe(node);

  return {
    destroy() {
      observer.disconnect();
    },
  };
}
