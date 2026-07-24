import { useEffect, useMemo, useRef, useState } from "react";
import type { ExperienceItem, Link, Profile } from "#/shared/types";
import { gsap } from "gsap";
import {
  GithubLogoIcon,
  LinkedinLogoIcon,
  XLogoIcon,
  EnvelopeSimpleIcon,
} from "@phosphor-icons/react";
import { AnimatedLink } from "#/shared/components/animated-link";
import { LoadingDots } from "#/shared/components/loading";
import { markdownToHtml } from "#/features/blog/lib/markdown-to-html";

const getLink = (links: Record<string, Link> | undefined, key: string): Link | undefined =>
  links?.[key];

interface ProfileSectionProps {
  isMobile?: boolean;
  isPending?: boolean;
  profile: Profile | undefined;
}

export const ProfileSection = ({ profile, isPending, isMobile }: ProfileSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const profileDescRef = useRef<HTMLDivElement>(null);
  const profileFadeRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  const portfolio = getLink(profile?.links, "portfolio");

  useEffect(() => {
    if (isPending || !profile) {
      return;
    }
    const el = sectionRef.current;
    if (!el) {
      return;
    }

    const children = [...el.children];
    if (children.length === 0) {
      return;
    }

    gsap.killTweensOf(children);
    gsap.fromTo(
      children,
      {
        filter: "blur(12px)",
        opacity: 0,
        scale: 0.98,
        y: 16,
      },
      {
        duration: 0.65,
        ease: "power2.out",
        filter: "blur(0px)",
        opacity: 1,
        scale: 1,
        stagger: 0.08,
        y: 0,
      },
    );
  }, [isPending, profile]);

  useEffect(() => {
    const desc = profileDescRef.current;
    const fade = profileFadeRef.current;
    if (!desc) {
      return;
    }

    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (isExpanded) {
      gsap.fromTo(
        desc,
        { height: 96 },
        {
          duration: 0.3,
          ease: "power2.inOut",
          height: "auto",
          onComplete: () => {
            desc.style.overflow = "";
          },
          onStart: () => {
            desc.style.overflow = "hidden";
          },
        },
      );
      if (fade) {
        gsap.to(fade, {
          duration: 0.3,
          ease: "power2.inOut",
          opacity: 0,
        });
      }
    } else {
      gsap.to(desc, {
        duration: 0.3,
        ease: "power2.inOut",
        height: 96,
        onStart: () => {
          desc.style.overflow = "hidden";
        },
      });
      if (fade) {
        gsap.to(fade, {
          duration: 0.3,
          ease: "power2.inOut",
          opacity: 1,
        });
      }
    }
  }, [isExpanded]);

  const descriptionHtml = useMemo(
    () => (profile?.description ? markdownToHtml(profile.description) : ""),
    [profile?.description],
  );

  let description: React.ReactNode = null;
  if (isPending) {
    description = <LoadingDots />;
  } else if (descriptionHtml) {
    description = (
      <span className="prose-desc" dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
    );
  }

  return (
    <div className="shrink-0" ref={sectionRef} style={{ perspective: 1000 }}>
      {profile?.name && (
        <h1
          className="font-normal text-5xl sm:text-7xl pl-2"
          style={{ fontFamily: '"Louison Adriana", cursive' }}
        >
          {profile.name}
          {profile.username && (
            <span
              className="ml-2 text-sm opacity-50"
              style={{ fontFamily: '"Ubuntu Mono", monospace' }}
            >
              @{profile.username}
            </span>
          )}
        </h1>
      )}

      {(portfolio || profile?.email) && (
        <p className="mb-6 text-sm sm:mb-8 sm:text-base">
          {portfolio && (
            <AnimatedLink href={portfolio.url} rel="noopener noreferrer" target="_blank">
              {portfolio.label}
            </AnimatedLink>
          )}
          {portfolio && profile?.email && " · "}
          {profile?.email && (
            <AnimatedLink href={`mailto:${profile.email}`} rel="noopener noreferrer">
              {profile.email}
            </AnimatedLink>
          )}
        </p>
      )}

      {description && (
        <>
          {isMobile ? (
            <div>
              <div
                className="relative overflow-hidden text-sm leading-relaxed lowercase"
                ref={profileDescRef}
                style={{ height: 96 }}
              >
                {description}
                <div
                  className="pointer-events-none absolute right-0 bottom-0 left-0 h-16 fade-overlay"
                  ref={profileFadeRef}
                />
              </div>
              <button
                className="link-underline mt-1 block text-center text-gray-400 text-xs w-full select-none cursor-pointer"
                onClick={() => setIsExpanded((prev) => !prev)}
                type="button"
              >
                {isExpanded ? "view less" : "more"}
              </button>
            </div>
          ) : (
            <p className="text-sm leading-relaxed sm:text-base lowercase">{description}</p>
          )}
        </>
      )}
    </div>
  );
};

interface ExperienceSectionProps {
  experience: ExperienceItem[] | undefined;
  isPending?: boolean;
}

export const ExperienceSection = ({ experience, isPending }: ExperienceSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const extraRef = useRef<HTMLDivElement>(null);
  const fadeRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isPending || !experience || experience.length === 0) {
      return;
    }
    const el = listRef.current;
    if (!el) {
      return;
    }

    const items = [...el.querySelectorAll(".experience-item")];
    if (items.length === 0) {
      return;
    }

    gsap.killTweensOf(items);
    gsap.fromTo(
      items,
      {
        filter: "blur(12px)",
        opacity: 0,
        scale: 0.98,
        y: 16,
      },
      {
        duration: 0.65,
        ease: "power2.out",
        filter: "blur(0px)",
        opacity: 1,
        scale: 1,
        stagger: 0.07,
        y: 0,
      },
    );
  }, [isPending, experience]);

  useEffect(() => {
    const extra = extraRef.current;
    const fade = fadeRef.current;
    if (!extra) {
      return;
    }

    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (isExpanded) {
      gsap.fromTo(
        extra,
        { height: 0, opacity: 0 },
        {
          duration: 0.3,
          ease: "power2.inOut",
          height: "auto",
          onComplete: () => {
            extra.style.overflow = "";
          },
          onStart: () => {
            extra.style.overflow = "hidden";
          },
          opacity: 1,
        },
      );
      if (fade) {
        gsap.to(fade, {
          duration: 0.3,
          ease: "power2.inOut",
          opacity: 0,
        });
      }
    } else {
      gsap.to(extra, {
        duration: 0.3,
        ease: "power2.inOut",
        height: 0,
        onStart: () => {
          extra.style.overflow = "hidden";
        },
        opacity: 0,
      });
      if (fade) {
        gsap.to(fade, {
          duration: 0.3,
          ease: "power2.inOut",
          opacity: 1,
        });
      }
    }
  }, [isExpanded]);

  if (isPending) {
    return (
      <div className="shrink-0 space-y-3 sm:space-y-4">
        <LoadingDots />
      </div>
    );
  }

  if (!experience || experience.length === 0) {
    return null;
  }

  const hasMore = experience.length > 3;

  return (
    <div className="shrink-0 space-y-3 sm:space-y-4">
      <div className="relative space-y-3 sm:space-y-4" ref={listRef} style={{ perspective: 1000 }}>
        {experience.slice(0, 3).map((item) => (
          <div key={item.title} className="experience-item">
            <h3 className="font-medium text-xs sm:text-sm">{item.title}</h3>
            <p className="text-gray-500 text-xs sm:text-sm">
              {item.location} | {item.period}
            </p>
          </div>
        ))}

        {hasMore && (
          <div
            className="space-y-3 sm:space-y-4 overflow-hidden mt-3 sm:mt-4"
            ref={extraRef}
            style={{ height: 0, opacity: 0 }}
          >
            {experience.slice(3).map((item) => (
              <div key={item.title}>
                <h3 className="font-medium text-xs sm:text-sm">{item.title}</h3>
                <p className="text-gray-500 text-xs sm:text-sm">
                  {item.location} | {item.period}
                </p>
              </div>
            ))}
          </div>
        )}

        {hasMore && (
          <div
            className="pointer-events-none absolute right-0 bottom-0 left-0 h-16 fade-overlay"
            ref={fadeRef}
          />
        )}
      </div>

      {hasMore && (
        <button
          className="link-underline mt-1 text-gray-400 text-xs w-full text-center sm:text-left sm:w-auto select-none cursor-pointer"
          onClick={() => setIsExpanded((prev) => !prev)}
          type="button"
        >
          {isExpanded ? "view less" : "see more"}
        </button>
      )}
    </div>
  );
};

interface SocialLinksProps {
  profile: Profile | undefined;
}

export const SocialLinks = ({ profile }: SocialLinksProps) => {
  const github = getLink(profile?.links, "github");
  const linkedin = getLink(profile?.links, "linkedin");
  const twitter = getLink(profile?.links, "twitter");

  return (
    <div className="flex items-center gap-4">
      {github?.url && (
        <AnimatedLink
          href={github.url}
          rel="noopener noreferrer"
          target="_blank"
          className="text-text-light/60 dark:text-text-dark/60 hover:text-text-light dark:hover:text-text-dark flex items-center gap-1.5"
          aria-label="GitHub"
        >
          <GithubLogoIcon size={18} />
          <span className="hidden sm:inline text-sm lowercase">{github.label}</span>
        </AnimatedLink>
      )}
      {linkedin?.url && (
        <AnimatedLink
          href={linkedin.url}
          rel="noopener noreferrer"
          target="_blank"
          className="text-text-light/60 dark:text-text-dark/60 hover:text-text-light dark:hover:text-text-dark flex items-center gap-1.5"
          aria-label="LinkedIn"
        >
          <LinkedinLogoIcon size={18} />
          <span className="hidden sm:inline text-sm lowercase">{linkedin.label}</span>
        </AnimatedLink>
      )}
      {twitter?.url && (
        <AnimatedLink
          href={twitter.url}
          rel="noopener noreferrer"
          target="_blank"
          className="text-text-light/60 dark:text-text-dark/60 hover:text-text-light dark:hover:text-text-dark flex items-center gap-1.5"
          aria-label="Twitter/X"
        >
          <XLogoIcon size={18} />
          <span className="hidden sm:inline text-sm lowercase">{twitter.label}</span>
        </AnimatedLink>
      )}
      {profile?.email && (
        <AnimatedLink
          href={`mailto:${profile.email}`}
          rel="noopener noreferrer"
          className="text-text-light/60 dark:text-text-dark/60 hover:text-text-light dark:hover:text-text-dark flex items-center gap-1.5"
          aria-label="Email"
        >
          <EnvelopeSimpleIcon size={18} />
          <span className="hidden sm:inline text-sm lowercase">email</span>
        </AnimatedLink>
      )}
    </div>
  );
};
