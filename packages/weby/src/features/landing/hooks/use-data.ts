import type { BlogManifestSection, ExperienceItem, Profile, Project } from "#/shared/types";
import { useQuery } from "@tanstack/react-query";

const fetchJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
};

export const DEFAULT_PROFILE: Profile = {
  description:
    "verso is a self-hosted personal knowledge base, blog, and portfolio built as one app with two access tiers. Publicly, it shows a portfolio and blog anyone can browse. Behind authentication, it's a full markdown editor and workspace — notes, documents, and long-term memory entries — with docmost-style editing and workspace management. The whole knowledge base is retrieval-augmented: markdown content is chunked, embedded, and stored in a vector index so it can be searched semantically and asked questions about directly, with recency-aware ranking so recent memory entries surface above older ones when relevant.",
  email: "hello@verso.app",
  links: {
    github: { label: "GitHub", url: "https://github.com/parazeeknova/verso" },
    portfolio: { label: "portfolio", url: "https://verso.app" },
  },
  name: "verso",
  tagline: "personal knowledge base & folio",
  username: "verso",
};

export const DEFAULT_EXPERIENCES: ExperienceItem[] = [
  {
    location: "Core Architecture",
    period: "Knowledge Base",
    title: "Retrieval-Augmented Generation & Vector Index",
  },
  {
    location: "Omnichannel Integrations",
    period: "Messaging & Capture",
    title: "WhatsApp, Telegram & Discord Memory Capture",
  },
  {
    location: "Media Engine",
    period: "OCR & Document Processing",
    title: "Automatic Image OCR & Voice Memo Transcription",
  },
  {
    location: "Access Control",
    period: "Dual Access Tiers",
    title: "Public Folio & Private Authenticated Brain",
  },
];

export const DEFAULT_PROJECTS: Project[] = [
  {
    desc: "A personal knowledge system that remembers everything written into it and can be talked to — with a public face for visitors and a private mind for its owner, unified in a single app. Content can be captured from anywhere — WhatsApp, Telegram, Discord — with automatic document OCR, voice transcription, and recency-aware vector RAG.",
    image: "/verso.svg",
    productUrl: "https://github.com/parazeeknova/verso",
    readmeUrl:
      "https://raw.githubusercontent.com/parazeeknova/verso/refs/heads/main/.github/README.md",
    repoUrl: "https://github.com/parazeeknova/verso",
    stack: "TanStack Start, Vite, Go, TypeScript, PostgreSQL, Vector Index, TipTap, Tailwind CSS",
    title: "Verso — Self-hosted Knowledge Base & Folio",
  },
];

export const useProfile = () =>
  useQuery<Profile>({
    queryFn: ({ signal }) => fetchJson<Profile>("/api/profile", { signal }),
    queryKey: ["profile"],
  });

export const useExperience = () =>
  useQuery<ExperienceItem[]>({
    queryFn: ({ signal }) => fetchJson<ExperienceItem[]>("/api/experience", { signal }),
    queryKey: ["experience"],
  });

export const useProjects = () =>
  useQuery<Project[]>({
    queryFn: ({ signal }) => fetchJson<Project[]>("/api/projects", { signal }),
    queryKey: ["projects"],
  });

export const useBlogManifest = () =>
  useQuery<BlogManifestSection[]>({
    queryFn: ({ signal }) => fetchJson<BlogManifestSection[]>("/api/blogs", { signal }),
    queryKey: ["blogManifest"],
  });

export const useIsFetchingData = (): boolean => {
  const profile = useProfile();
  const experience = useExperience();
  const projects = useProjects();

  return profile.isPending || experience.isPending || projects.isPending;
};
