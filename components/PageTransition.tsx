"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

function isInternalNavigationClick(target: EventTarget | null, currentPath: string): boolean {
  const anchor = (target as HTMLElement | null)?.closest("a");
  if (!anchor) return false;

  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || anchor.target === "_blank") {
    return false;
  }
  if (anchor.hasAttribute("download")) return false;

  try {
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return false;

    const samePath = url.pathname === currentPath;
    const sameSearch = url.search === window.location.search;
    return !(samePath && sameSearch);
  } catch {
    return false;
  }
}

export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [animating, setAnimating] = useState(false);
  const [loading, setLoading] = useState(false);
  const prevPath = useRef(pathname);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (isInternalNavigationClick(e.target, pathname)) {
        setLoading(true);
      }
    }

    function onPopState() {
      setLoading(true);
    }

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, [pathname]);

  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setLoading(false), 15_000);
    return () => clearTimeout(t);
  }, [loading]);

  useEffect(() => {
    if (prevPath.current !== pathname) {
      prevPath.current = pathname;
      setLoading(false);
      setAnimating(true);
      setDisplayChildren(children);
      const t = setTimeout(() => setAnimating(false), 220);
      return () => clearTimeout(t);
    } else {
      setDisplayChildren(children);
    }
  }, [pathname, children]);

  return (
    <div className="relative h-full">
      {loading && (
        <>
          <div className="absolute top-0 left-0 right-0 h-0.5 z-20 overflow-hidden">
            <div className="nav-progress-bar" />
          </div>
          <div
            className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/75 backdrop-blur-[1px]"
            aria-live="polite"
            aria-busy="true"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="nav-loading-spinner" role="status" aria-label="Loading page" />
              <span className="text-xs font-medium text-slate-500">Loading…</span>
            </div>
          </div>
        </>
      )}
      <div className={`h-full ${animating ? "page-enter" : ""}`}>{displayChildren}</div>
    </div>
  );
}
