import { gsap } from "gsap";
import type { RefObject } from "react";

export const getHeaderGradient = (isDarkMode: boolean): string => {
  const bg = isDarkMode ? "#111111" : "#eeeeee";
  if (isDarkMode) {
    return `linear-gradient(to bottom, ${bg}00 0%, ${bg}00 15%, ${bg}33 30%, ${bg}88 50%, ${bg}cc 70%, ${bg} 85%, ${bg} 100%)`;
  }
  return `linear-gradient(to bottom, ${bg}00 0%, ${bg}00 60%, ${bg}66 75%, ${bg}cc 88%, ${bg} 100%)`;
};

export const crossfadeVideo = (
  fromRef: RefObject<HTMLVideoElement | null>,
  toRef: RefObject<HTMLVideoElement | null>,
  nextSrc: string,
  onComplete: () => void,
) => {
  const tl = gsap.timeline();
  tl.set(toRef.current, { opacity: 0, src: nextSrc });
  tl.call(() => {
    if (toRef.current) {
      void toRef.current.play();
    }
  });
  tl.to(toRef.current, { duration: 0.5, ease: "power2.inOut", opacity: 1 });
  tl.to(fromRef.current, { duration: 0.5, ease: "power2.inOut", opacity: 0 }, "<");
  tl.call(() => {
    onComplete();
    if (fromRef.current) {
      fromRef.current.pause();
    }
  });
};
