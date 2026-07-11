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
  const portfolio = getLink(profile?.links, "portfolio");

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
    <div className="shrink-0">
      {profile?.name && (
        <h1 className="font-normal text-xl sm:text-2xl">
          {profile.name}
          {profile.username && <span className="ml-2 text-sm opacity-50">@{profile.username}</span>}
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
              {isExpanded ? (
                <>
                  <p className="text-sm leading-relaxed">{description}</p>
                  <button
                    className="link-underline mt-1 text-gray-400 text-xs"
                    onClick={() => setIsExpanded(false)}
                    type="button"
                  >
                    view less
                  </button>
                </>
              ) : (
                <button
                  className="w-full text-left"
                  onClick={() => setIsExpanded(true)}
                  type="button"
                >
                  <div className="relative max-h-24 overflow-hidden text-sm leading-relaxed">
                    {description}
                    <div
                      className="pointer-events-none absolute right-0 bottom-0 left-0 h-16"
                      style={{
                        background: `linear-gradient(to top, var(--fade-color) 0%, transparent 100%)`,
                      }}
                    />
                  </div>
                  <span className="link-underline mt-1 block text-center text-gray-400 text-xs">
                    more
                  </span>
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm leading-relaxed sm:text-base">{description}</p>
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
  const extraRef = useRef<HTMLDivElement>(null);
  const fadeRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

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
      <div className="relative space-y-3 sm:space-y-4">
        {experience.slice(0, 3).map((item) => (
          <div key={item.title}>
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
            className="pointer-events-none absolute right-0 bottom-0 left-0 h-16"
            ref={fadeRef}
            style={{
              background: `linear-gradient(to top, var(--fade-color) 0%, transparent 100%)`,
            }}
          />
        )}
      </div>

      {hasMore && (
        <button
          className="link-underline mt-1 text-gray-400 text-xs text-left select-none cursor-pointer"
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
