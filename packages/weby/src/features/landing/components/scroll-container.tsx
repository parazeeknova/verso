import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

interface ScrollContainerProps {
  children: ReactNode;
  className?: string;
}

export const ScrollContainer = ({ children, className = "" }: ScrollContainerProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [showTopShadow, setShowTopShadow] = useState(false);
  const [showBottomShadow, setShowBottomShadow] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }

    const updateShadows = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      setShowTopShadow(scrollTop > 4);
      setShowBottomShadow(scrollTop + clientHeight < scrollHeight - 4);
    };

    updateShadows();
    el.addEventListener("scroll", updateShadows, { passive: true });

    // Observe both the container and its content
    const observer = new ResizeObserver(updateShadows);
    observer.observe(el);

    // Also observe the first child element if it exists
    const contentChild = el.firstElementChild;
    if (contentChild) {
      observer.observe(contentChild);
    }

    return () => {
      el.removeEventListener("scroll", updateShadows);
      observer.disconnect();
    };
  }, []);

  // Re-run effect when children change
  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }

    const updateShadows = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      setShowTopShadow(scrollTop > 4);
      setShowBottomShadow(scrollTop + clientHeight < scrollHeight - 4);
    };

    updateShadows();
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="projects-scroll h-full overflow-y-auto" ref={ref}>
        {children}
      </div>

      {showTopShadow && (
        <div className="pointer-events-none absolute top-0 right-0 left-0 h-16 fade-overlay-top" />
      )}

      {showBottomShadow && (
        <>
          <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-16 fade-overlay" />
          <div className="pointer-events-none absolute right-0 bottom-1 left-0 flex items-center justify-start gap-1 text-[10px] text-gray-400">
            <span>see more</span>
          </div>
        </>
      )}
    </div>
  );
};
