import { gsap } from "gsap";

export const animateOut = (element: HTMLElement | null, onComplete: () => void) => {
  if (element) {
    gsap.to(element, {
      duration: 0.12,
      ease: "power2.in",
      onComplete,
      opacity: 0,
      scale: 0.95,
      y: -4,
    });
  } else {
    onComplete();
  }
};

export const animateIn = (element: HTMLElement) => {
  gsap.fromTo(
    element,
    { opacity: 0, scale: 0.95, y: -4 },
    { duration: 0.15, ease: "power2.out", opacity: 1, scale: 1, y: 0 },
  );
};
