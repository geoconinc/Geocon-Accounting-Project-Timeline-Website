"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [animating, setAnimating] = useState(false);
  const prevPath = useRef(pathname);

  useEffect(() => {
    if (prevPath.current !== pathname) {
      prevPath.current = pathname;
      setAnimating(true);
      setDisplayChildren(children);
      const t = setTimeout(() => setAnimating(false), 220);
      return () => clearTimeout(t);
    } else {
      setDisplayChildren(children);
    }
  }, [pathname, children]);

  return (
    <div className={`h-full ${animating ? "page-enter" : ""}`}>
      {displayChildren}
    </div>
  );
}
