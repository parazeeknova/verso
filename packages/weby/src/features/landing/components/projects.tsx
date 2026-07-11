import { useEffect, useRef, useState } from "react";
import { useProjects } from "../hooks/use-data";
import { gsap } from "gsap";
import type { Project } from "#/shared/types";
import { LoadingDots } from "#/shared/components/loading";

interface ProjectCardProps {
  onDetail?: (project: Project) => void;
  project: Project;
}

const ProjectCard = ({ onDetail, project }: ProjectCardProps) => {
  const [stackOpen, setStackOpen] = useState(false);

  return (
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
  );
};

interface ProjectListProps {
  onDetail?: (project: Project) => void;
}

export const ProjectList = ({ onDetail }: ProjectListProps) => {
  const { data: projectData, isPending } = useProjects();

  return (
    <div className="space-y-3 sm:space-y-4">
      {isPending ? (
        <LoadingDots />
      ) : (
        projectData?.map((project) => (
          <ProjectCard key={project.title} onDetail={onDetail} project={project} />
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
    return <LoadingDots />;
  }

  if (!projectData || projectData.length === 0) {
    return null;
  }

  const hasMore = projectData.length > 3;

  return (
    <div>
      <div className="relative space-y-3 sm:space-y-4">
        {projectData.slice(0, 3).map((project) => (
          <ProjectCard key={project.title} onDetail={onDetail} project={project} />
        ))}

        {hasMore && (
          <div
            className="space-y-3 sm:space-y-4 overflow-hidden mt-3 sm:mt-4"
            ref={extraRef}
            style={{ height: 0, opacity: 0 }}
          >
            {projectData.slice(3).map((project) => (
              <ProjectCard key={project.title} onDetail={onDetail} project={project} />
            ))}
          </div>
        )}

        {hasMore && (
          <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-16" ref={fadeRef}>
            <div className="absolute inset-0 fade-overlay-light" />
            <div className="absolute inset-0 fade-overlay-dark" />
          </div>
        )}
      </div>

      {hasMore && (
        <button
          className="link-underline mt-1 text-gray-400 text-xs w-full text-center select-none cursor-pointer"
          onClick={() => setIsExpanded((prev) => !prev)}
          type="button"
        >
          {isExpanded ? "view less" : "view more"}
        </button>
      )}
    </div>
  );
};
