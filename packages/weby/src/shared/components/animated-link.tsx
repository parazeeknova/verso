import { gsap } from "gsap";
import { useEffect, useRef } from "react";

interface AnimatedLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  children: React.ReactNode;
  className?: string;
  href: string;
  rel?: string;
  target?: string;
}

export const AnimatedLink = ({
  children,
  className = "",
  href,
  rel,
  target,
  ...props
}: AnimatedLinkProps) => {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const link = ref.current;
    if (!link) {
      return;
    }

    const tl = gsap.timeline({ paused: true });
    tl.fromTo(
      link,
      { "--underline-width": "0%" } as gsap.TweenVars,
      { "--underline-width": "100%", duration: 0.3, ease: "power2.out" } as gsap.TweenVars,
    );

    const enter = () => tl.play();
    const leave = () => tl.reverse();

    link.addEventListener("mouseenter", enter);
    link.addEventListener("mouseleave", leave);

    return () => {
      link.removeEventListener("mouseenter", enter);
      link.removeEventListener("mouseleave", leave);
    };
  }, []);

  return (
    <a
      className={`link-underline ${className}`}
      href={href}
      ref={ref}
      rel={rel}
      target={target}
      {...props}
    >
      {children}
    </a>
  );
};
