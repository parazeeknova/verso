import { useEffect, useRef, useState } from "react";
import { useProjects } from "../hooks/use-data";
import { gsap } from "gsap";
import { ArrowUpRightIcon } from "@phosphor-icons/react";
import type { Project } from "#/shared/types";
import { LoadingDots } from "#/shared/components/loading";

interface ProjectCardProps {
  index: number;
  onDetail?: (project: Project) => void;
  project: Project;
}

const isDesktopHoverAvailable = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }
  return window.innerWidth >= 768 && window.matchMedia("(hover: hover)").matches;
};

const ProjectCard = ({ index, onDetail, project }: ProjectCardProps) => {
  const [stackOpen, setStackOpen] = useState(false);
  const thumbRef = useRef<HTMLAnchorElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const previewImgRef = useRef<HTMLImageElement>(null);
  const isEven = index % 2 === 0;

  const linkUrl = project.productUrl || project.repoUrl;

  const handlePreviewEnter = () => {
    if (!isDesktopHoverAvailable()) {
      return;
    }
    if (!thumbRef.current || !previewRef.current || !previewImgRef.current) {
      return;
    }
    const rect = thumbRef.current.getBoundingClientRect();
    const previewEl = previewRef.current;
    const imgEl = previewImgRef.current;

    gsap.killTweensOf(previewEl);
    gsap.killTweensOf(imgEl);
    gsap.set(previewEl, {
      display: "block",
      height: rect.height,
      left: rect.left,
      opacity: 1,
      top: rect.top,
      width: rect.width,
      x: 0,
      y: 0,
    });
    gsap.set(imgEl, { scale: 1 });

    const previewWidth = 288;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    let previewLeft = isEven ? rect.right + 16 : rect.left - previewWidth - 16;
    if (previewLeft + previewWidth > screenWidth - 16) {
      previewLeft = rect.left - previewWidth - 16;
    }
    if (previewLeft < 16) {
      previewLeft = rect.right + 16;
    }
    previewLeft = Math.max(16, Math.min(previewLeft, screenWidth - previewWidth - 16));

    let previewTop = rect.top + rect.height / 2;
    const previewHeight = 240;
    previewTop = Math.max(
      previewHeight / 2 + 16,
      Math.min(previewTop, screenHeight - previewHeight / 2 - 16),
    );

    gsap.to(previewEl, {
      duration: 0.45,
      ease: "power3.out",
      left: previewLeft,
      rotateX: 0,
      rotateY: 0,
      top: previewTop,
      width: previewWidth,
      yPercent: -50,
    });
    gsap.fromTo(imgEl, { scale: 1.2 }, { duration: 0.5, ease: "power3.out", scale: 1 });
  };

  const handlePreviewMove = (e: React.MouseEvent) => {
    if (!isDesktopHoverAvailable()) {
      return;
    }
    if (!previewRef.current || !thumbRef.current) {
      return;
    }
    const thumbRect = thumbRef.current.getBoundingClientRect();
    const previewWidth = 288;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    let baseLeft = isEven ? thumbRect.right + 16 : thumbRect.left - previewWidth - 16;
    if (baseLeft + previewWidth > screenWidth - 16) {
      baseLeft = thumbRect.left - previewWidth - 16;
    }
    if (baseLeft < 16) {
      baseLeft = thumbRect.right + 16;
    }
    baseLeft = Math.max(16, Math.min(baseLeft, screenWidth - previewWidth - 16));

    let baseTop = thumbRect.top + thumbRect.height / 2;
    const previewHeight = 240;
    baseTop = Math.max(
      previewHeight / 2 + 16,
      Math.min(baseTop, screenHeight - previewHeight / 2 - 16),
    );

    const dx = e.clientX - thumbRect.left - thumbRect.width / 2;
    const dy = e.clientY - thumbRect.top - thumbRect.height / 2;
    gsap.to(previewRef.current, {
      duration: 0.35,
      ease: "power2.out",
      left: baseLeft + dx * 0.06,
      rotateX: -dy * 0.015,
      rotateY: dx * 0.015,
      top: baseTop + dy * 0.06,
    });
  };

  const handlePreviewLeave = () => {
    if (!previewRef.current || !thumbRef.current) {
      return;
    }
    const rect = thumbRef.current.getBoundingClientRect();
    gsap.killTweensOf(previewRef.current);
    gsap.to(previewRef.current, {
      duration: 0.3,
      ease: "power2.in",
      height: rect.height,
      left: rect.left,
      onComplete: () => {
        gsap.set(previewRef.current, { display: "none", yPercent: 0 });
      },
      opacity: 0,
      rotateX: 0,
      rotateY: 0,
      top: rect.top,
      width: rect.width,
      x: 0,
      y: 0,
      yPercent: 0,
    });
  };

  const renderThumbnail = () => {
    if (!project.image) {
      return null;
    }
    if (linkUrl) {
      return (
        <>
          <a
            ref={thumbRef}
            className="group relative shrink-0 block w-28 h-28 sm:w-36 sm:h-36 overflow-hidden"
            href={linkUrl}
            onMouseEnter={handlePreviewEnter}
            onMouseMove={handlePreviewMove}
            onMouseLeave={handlePreviewLeave}
            rel="noopener noreferrer"
            style={{ transform: isEven ? "rotate(-3deg)" : "rotate(3deg)" }}
            target="_blank"
          >
            <img
              alt={project.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              src={project.image}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-300 group-hover:bg-black/50 group-hover:opacity-100">
              <ArrowUpRightIcon className="text-white" size={24} />
            </div>
          </a>
          <div
            ref={previewRef}
            className="pointer-events-none fixed left-0 top-0 z-50 hidden origin-left"
            style={{ perspective: 800 }}
          >
            <div className="overflow-hidden shadow-2xl border border-white/10 bg-black/80 backdrop-blur-sm">
              <img
                ref={previewImgRef}
                alt={project.title}
                className="block w-72 max-h-96 object-contain"
                src={project.image}
              />
            </div>
          </div>
        </>
      );
    }
    return (
      <div
        className="relative shrink-0 block w-28 h-28 sm:w-36 sm:h-36 overflow-hidden"
        style={{ transform: isEven ? "rotate(-3deg)" : "rotate(3deg)" }}
      >
        <img alt={project.title} className="w-full h-full object-cover" src={project.image} />
      </div>
    );
  };

  return (
    <div className={`flex items-start gap-4 ${isEven ? "" : "flex-row-reverse"}`}>
      {renderThumbnail()}
      <div>
        <h3 className="font-medium text-xs sm:text-sm">{project.title}</h3>
        <p className="mt-1 text-gray-500 text-xs sm:text-sm">{project.desc}</p>
        <p className="mt-1 flex items-center gap-2 text-gray-400 text-xs">
          {stackOpen ? (
            <>
              {project.stack}{" "}
              <button
                className="text-gray-500 text-[11px] lowercase hover:text-gray-300 focus:outline-none"
                onClick={(e) => {
                  e.stopPropagation();
                  setStackOpen(false);
                }}
                type="button"
              >
                collapse
              </button>
            </>
          ) : (
            <>
              <button
                className="text-gray-500 text-[11px] lowercase hover:text-gray-300 focus:outline-none"
                onClick={(e) => {
                  e.stopPropagation();
                  setStackOpen(true);
                }}
                type="button"
              >
                stack
              </button>
              {project.readmeUrl && onDetail ? (
                <button
                  className="text-[#b58cff] text-[11px] lowercase hover:opacity-70 focus:outline-none"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDetail(project);
                  }}
                  type="button"
                >
                  detail
                </button>
              ) : null}
              {project.repoUrl && (
                <a
                  className="text-[#b58cff] text-[11px] lowercase hover:opacity-70"
                  href={project.repoUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  repo
                </a>
              )}
              {project.productUrl && (
                <a
                  className="text-[#b58cff] text-[11px] lowercase hover:opacity-70"
                  href={project.productUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  product
                </a>
              )}
            </>
          )}
        </p>
      </div>
    </div>
  );
};

interface ProjectListProps {
  onDetail?: (project: Project) => void;
}

export const ProjectList = ({ onDetail }: ProjectListProps) => {
  const { data: projectData, isPending } = useProjects();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isPending || !projectData || projectData.length === 0) {
      return;
    }
    const el = listRef.current;
    if (!el) {
      return;
    }

    const items = [...el.children];
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
        y: 18,
      },
      {
        duration: 0.65,
        ease: "power2.out",
        filter: "blur(0px)",
        opacity: 1,
        scale: 1,
        stagger: 0.09,
        y: 0,
      },
    );
  }, [isPending, projectData]);

  return (
    <div className="space-y-3 sm:space-y-4" ref={listRef} style={{ perspective: 1000 }}>
      {isPending ? (
        <LoadingDots />
      ) : (
        projectData?.map((project, index) => (
          <ProjectCard key={project.title} index={index} onDetail={onDetail} project={project} />
        ))
      )}
    </div>
  );
};

interface MobileProjectListProps {
  onDetail?: (project: Project) => void;
}

export const MobileProjectList = ({ onDetail }: MobileProjectListProps) => {
  const { data: projectData, isPending } = useProjects();
  const [isExpanded, setIsExpanded] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const extraRef = useRef<HTMLDivElement>(null);
  const fadeRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isPending || !projectData || projectData.length === 0) {
      return;
    }
    const el = listRef.current;
    if (!el) {
      return;
    }

    const items = [...el.querySelectorAll(".project-card-visible")];
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
        y: 18,
      },
      {
        duration: 0.65,
        ease: "power2.out",
        filter: "blur(0px)",
        opacity: 1,
        scale: 1,
        stagger: 0.09,
        y: 0,
      },
    );
  }, [isPending, projectData]);

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
    return <LoadingDots />;
  }

  if (!projectData || projectData.length === 0) {
    return null;
  }

  const hasMore = projectData.length > 3;

  return (
    <div>
      <div className="relative space-y-3 sm:space-y-4" ref={listRef} style={{ perspective: 1000 }}>
        {projectData.slice(0, 3).map((project, index) => (
          <div key={project.title} className="project-card-visible">
            <ProjectCard index={index} onDetail={onDetail} project={project} />
          </div>
        ))}

        {hasMore && (
          <div
            className="space-y-3 sm:space-y-4 overflow-hidden mt-3 sm:mt-4"
            ref={extraRef}
            style={{ height: 0, opacity: 0 }}
          >
            {projectData.slice(3).map((project, index) => (
              <ProjectCard
                key={project.title}
                index={index + 3}
                onDetail={onDetail}
                project={project}
              />
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
          className="link-underline mt-1 text-gray-400 text-xs w-full text-center select-none cursor-pointer"
          onClick={() => setIsExpanded((prev) => !prev)}
          type="button"
        >
          {isExpanded ? "view less" : "see more"}
        </button>
      )}
    </div>
  );
};
