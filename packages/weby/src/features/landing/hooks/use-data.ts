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
    "Engineer and founder, building systems, infrastructure, and tools. Author of [asocialmedia](https://www.asocialmedia.cc). Runs [Singularity Works](https://www.itsingularity.com), an opinionated product studio. CS undergrad who builds things that shouldn't exist yet, then open-sources them so you can too. Occasional [hackathon](https://www.linkedin.com/in/hashk/details/honors/) winner, published [researcher](https://www.orcid.org/0009-0008-9861-9181).",
  email: "harsh@itssingularity.com",
  links: {
    asocialmedia: { label: "asocialmedia", url: "https://www.asocialmedia.cc" },
    github: { label: "GitHub", url: "https://www.github.com/parazeeknova" },
    linkedin: { label: "LinkedIn", url: "https://www.linkedin.com/in/hashk" },
    portfolio: { label: "designer portfolio", url: "https://folio.przknv.cc" },
    singularity: { label: "Singularity Works", url: "https://www.itsingularity.com" },
    twitter: { label: "X", url: "https://www.x.com/parazeeknova" },
  },
  name: "Harsh Sahu",
  tagline: "designer portfolio",
  username: "parazeeknova",
};

export const DEFAULT_EXPERIENCES: ExperienceItem[] = [
  {
    location: "Remote (India)",
    period: "August 25' –Present",
    title: "Founder & Infrastructure Engineer — Singularity Works",
  },
  {
    location: "Remote (Muscat, Oman)",
    period: "April 25'–November 25'",
    title: "Full Stack Developer Intern — amasQIS.ai",
  },
  {
    location: "University (VIT)",
    period: "June 25'–February 26'",
    title: "President — Mozilla Firefox Club (VIT)",
  },
  {
    location: "University (VIT)",
    period: "June 25'–January 26'",
    title: "Operations Manager — AI Club (VIT)",
  },
  {
    location: "Remote (India)",
    period: "April 24'–June 24'",
    title: "Frontend Developer — Operation Smile Foundation (NGO,Non-profit)",
  },
];

export const DEFAULT_PROJECTS: Project[] = [
  {
    desc: "A fully declarative, highly opinionated, and reproducible NixOS/Hyprland desktop environment. Equipped with a custom Rust-based daemon (wabi), interactive QML-based Quickshell widgets, and dynamic Material You color schemes generated from your wallpapers via Matugen. Includes local AI workflows (OCR, Speech-to-Text, and LLMs) along with Waydroid virtualization and Cockpit server panel integration out of the box. Designed to look gorgeous without bloated overhead.",
    image: "https://img.przknv.cc/t/doty.png",
    productUrl: "https://github.com/parazeeknova/doty",
    readmeUrl:
      "https://raw.githubusercontent.com/parazeeknova/doty/refs/heads/main/.github/README.md",
    repoUrl: "https://github.com/parazeeknova/doty",
    stack:
      "Nix, NixOS, Hyprland, Quickshell, Qt, QML, Rust, Matugen, Waydroid, Distrobox, Home Manager",
    title: "Doty is an over-configured nix flake for opinionated developers",
  },
  {
    desc: "A local-first git visualizer built in Rust with egui. Commit graph, syntax-highlighted diffs, file tree with git status, and drag-to-merge all in a ~5MB binary with no Electron, no webview, no cloud, and no subscription for a picture of your own repo. Talks directly to libgit2. Named at 2am. No regrets.",
    image: "https://img.przknv.cc/t/gitcha.png",
    productUrl: "https://github.com/parazeeknova/gitcha/releases",
    readmeUrl:
      "https://raw.githubusercontent.com/parazeeknova/gitcha/refs/heads/main/.github/README.md",
    repoUrl: "https://github.com/parazeeknova/gitcha",
    stack: "Rust, egui, eframe, git2, libgit2, diffy, similar, syntect, egui-arbor, egui-phosphor",
    title: "Gitcha is a native git GUI written in rust to be blazing fast and light that goes brr",
  },
  {
    desc: "A local-first spatial workspace for free-form kanban, structured tasks, durable offline work, and realtime collaboration with other goodies.",
    image: "https://img.przknv.cc/t/Screenshot_2026-07-08_22.51.03.png",
    productUrl: "https://lumen.itssingularity.com",
    readmeUrl:
      "https://raw.githubusercontent.com/singularityworks-xyz/lumen/refs/heads/origin/.github/README.md",
    repoUrl: "https://github.com/singularityworks-xyz/lumen",
    stack:
      "Next.js, Elysia, Elixir, Typescript, Bun, PostgreSQL, Redis, Yjs, Zustand, Tailwind, Tauri, CRDTs, Docker, Playwright, Bun Test, K6 and more",
    title: "Lumen is a spatial system for organizing work.",
  },
  {
    desc: "A social platform that brings your entire internet into one place. Unified feed, communities, real-time chat, rich media and tipping all tied together by Aura, a reputation system that grows with you, and Zeph, an AI companion that actually remembers you. Built by one person. Slightly unhinged in ambition.",
    image: "https://img.przknv.cc/t/Gk8Fy0aaMAARWSc.jpg",
    productUrl: "https://asocialmedia.cc",
    readmeUrl:
      "https://raw.githubusercontent.com/asocialmedia/social/refs/heads/main/.github/README.md",
    repoUrl: "https://github.com/asocialmedia/social",
    stack:
      "Next.js, React, Elysia, Elixir, TypeScript, Tailwind CSS, PostgreSQL, Redis, RustFS, RabbitMQ, MeiliSearch, AI-sdk, Docker and more",
    title:
      "asocialmedia formerly zephyr is the last social platform you'll ever need. Open source, cozy, and slightly unhinged.",
  },
];

export const useProfile = () =>
  useQuery<Profile>({
    placeholderData: DEFAULT_PROFILE,
    queryFn: ({ signal }) => fetchJson<Profile>("/api/profile", { signal }),
    queryKey: ["profile"],
  });

export const useExperience = () =>
  useQuery<ExperienceItem[]>({
    placeholderData: DEFAULT_EXPERIENCES,
    queryFn: ({ signal }) => fetchJson<ExperienceItem[]>("/api/experience", { signal }),
    queryKey: ["experience"],
  });

export const useProjects = () =>
  useQuery<Project[]>({
    placeholderData: DEFAULT_PROJECTS,
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
