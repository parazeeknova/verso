package store

import "verso/backy/database/models"

var Profile = models.Profile{
	Name:     "Harsh Sahu",
	Tagline:  "designer portfolio",
	Username: "parazeeknova",
	Email:    "harsh@itssingularity.com",
	Description: "Engineer and founder, building systems, infrastructure, and tools. " +
		"Author of [asocialmedia](https://www.asocialmedia.cc). Runs [Singularity Works](https://www.itsingularity.com), an opinionated product studio. " +
		"CS undergrad who builds things that shouldn't exist yet, then open-sources them so you can too. " +
		"Occasional [hackathon](https://www.linkedin.com/in/hashk/details/honors/) winner, published [researcher](https://www.orcid.org/0009-0008-9861-9181).",
	Links: map[string]models.Link{
		"portfolio":    {Label: "designer portfolio", URL: "https://folio.przknv.cc"},
		"asocialmedia": {Label: "asocialmedia", URL: "https://www.asocialmedia.cc"},
		"singularity":  {Label: "Singularity Works", URL: "https://www.itsingularity.com"},
		"github":       {Label: "GitHub", URL: "https://www.github.com/parazeeknova"},
		"linkedin":     {Label: "LinkedIn", URL: "https://www.linkedin.com/in/hashk"},
		"twitter":      {Label: "X", URL: "https://www.x.com/parazeeknova"},
	},
}

var Experiences = []models.ExperienceItem{
	{
		Title:    "Founder & Infrastructure Engineer — Singularity Works",
		Location: "Remote (India)",
		Period:   "August 25' –Present",
	},
	{
		Title:    "Full Stack Developer Intern — amasQIS.ai",
		Location: "Remote (Muscat, Oman)",
		Period:   "April 25'–November 25'",
	},
	{
		Title:    "President — Mozilla Firefox Club (VIT)",
		Location: "University (VIT)",
		Period:   "June 25'–February 26'",
	},
	{
		Title:    "Operations Manager — AI Club (VIT)",
		Location: "University (VIT)",
		Period:   "June 25'–January 26'",
	},
	{
		Title:    "Frontend Developer — Operation Smile Foundation (NGO,Non-profit)",
		Location: "Remote (India)",
		Period:   "April 24'–June 24'",
	},
}

var Projects = []models.Project{
	{
		Title: "Doty is an over-configured nix flake for opinionated developers",
		Desc: "A fully declarative, highly opinionated, and reproducible NixOS/Hyprland desktop environment. " +
			"Equipped with a custom Rust-based daemon (wabi), interactive QML-based Quickshell widgets, " +
			"and dynamic Material You color schemes generated from your wallpapers via Matugen. " +
			"Includes local AI workflows (OCR, Speech-to-Text, and LLMs) along with Waydroid virtualization " +
			"and Cockpit server panel integration out of the box. Designed to look gorgeous without bloated overhead.",
		Image:      "https://img.przknv.cc/t/doty.png",
		Stack:      "Nix, NixOS, Hyprland, Quickshell, Qt, QML, Rust, Matugen, Waydroid, Distrobox, Home Manager",
		ReadmeURL:  "https://raw.githubusercontent.com/parazeeknova/doty/refs/heads/main/.github/README.md",
		RepoURL:    "https://github.com/parazeeknova/doty",
		ProductURL: "https://github.com/parazeeknova/doty",
	},
	{
		Title: "Gitcha is a native git GUI written in rust to be blazing fast and light that goes brr",
		Desc: "A local-first git visualizer built in Rust with egui. " +
			"Commit graph, syntax-highlighted diffs, file tree with git status, " +
			"and drag-to-merge all in a ~5MB binary with no Electron, no webview, " +
			"no cloud, and no subscription for a picture of your own repo. " +
			"Talks directly to libgit2. Named at 2am. No regrets.",
		Image:      "https://img.przknv.cc/t/gitcha.png",
		Stack:      "Rust, egui, eframe, git2, libgit2, diffy, similar, syntect, egui-arbor, egui-phosphor",
		ReadmeURL:  "https://raw.githubusercontent.com/parazeeknova/gitcha/refs/heads/main/.github/README.md",
		RepoURL:    "https://github.com/parazeeknova/gitcha",
		ProductURL: "https://github.com/parazeeknova/gitcha/releases",
	},
	{
		Title:      "Lumen is a spatial system for organizing work.",
		Desc:       "A local-first spatial workspace for free-form kanban, structured tasks, durable offline work, and realtime collaboration with other goodies.",
		Image:      "https://img.przknv.cc/t/Screenshot_2026-07-08_22.51.03.png",
		Stack:      "Next.js, Elysia, Elixir, Typescript, Bun, PostgreSQL, Redis, Yjs, Zustand, Tailwind, Tauri, CRDTs, Docker, Playwright, Bun Test, K6 and more",
		ReadmeURL:  "https://raw.githubusercontent.com/singularityworks-xyz/lumen/refs/heads/origin/.github/README.md",
		RepoURL:    "https://github.com/singularityworks-xyz/lumen",
		ProductURL: "https://lumen.itssingularity.com",
	},
	{
		Title: "asocialmedia formerly zephyr is the last social platform you'll ever need. Open source, cozy, and slightly unhinged. ",
		Desc: "A social platform that brings your entire " +
			"internet into one place. Unified feed, communities, real-time chat, " +
			"rich media and tipping all tied together by Aura, a reputation " +
			"system that grows with you, and Zeph, an AI companion that actually " +
			"remembers you. Built by one person. Slightly unhinged in ambition.",
		Image:      "https://img.przknv.cc/t/Gk8Fy0aaMAARWSc.jpg",
		Stack:      "Next.js, React, Elysia, Elixir, TypeScript, Tailwind CSS, PostgreSQL, Redis, RustFS, RabbitMQ, MeiliSearch, AI-sdk, Docker and more",
		ReadmeURL:  "https://raw.githubusercontent.com/asocialmedia/social/refs/heads/main/.github/README.md",
		RepoURL:    "https://github.com/asocialmedia/social",
		ProductURL: "https://asocialmedia.cc",
	},
	{
		Title:      "Papyrus is a realtime collaborative spreadsheet",
		Desc:       "Realtime collaborative spreadsheet with a local-first document model, CRDT-based syncing, worker-driven evaluation, and a virtualized grid built to stay responsive on 10K+ row datasets.",
		Stack:      "Next.js, Elixir, TypeScript, Bun, Firestore, Yjs, Zustand, Tailwind CSS, CRDTs, Docker and more",
		ReadmeURL:  "https://raw.githubusercontent.com/parazeeknova/papyrus/refs/heads/main/.github/README.md",
		RepoURL:    "https://github.com/parazeeknova/papyrus",
		ProductURL: "https://sheets.przknv.cc",
	},
	{
		Title:      "Personal knowledge base and folio, blog for public face & private brain, one app",
		Desc:       "Personal knowledge base and folio, blog for public face & private brain, one app that doesn't apologize for being both. the left side is where i exist as a person (public face): my projects, my work, my contribution graph. the right side is where i think out loud (private brain): notes, docs, blog posts, half-baked ideas.",
		Stack:      "Tanstack Start, Vite, Vitest, Golang, TypeScript, Postgres, TipTap, CRDTs, Tailwind CSS, Cloudflare, Docker and more",
		ReadmeURL:  "https://raw.githubusercontent.com/parazeeknova/verso/refs/heads/main/.github/README.md",
		RepoURL:    "https://github.com/parazeeknova/verso",
		ProductURL: "https://www.przknv.cc",
	},
	{
		Title:     "Snix is a Terminal snippet manager",
		Desc:      "Fast TUI with hierarchical notebooks, fuzzy search, syntax highlighting for 25+ languages, and versioned storage.",
		Stack:     "Rust, Ratatui",
		ReadmeURL: "https://raw.githubusercontent.com/parazeeknova/snix/refs/heads/main/.github/README.md",
		RepoURL:   "https://github.com/parazeeknova/snix",
	},
	{
		Title:     "Nyxtext Zenith is a Keyboard-first code editor",
		Desc:      "Windows code editor with built-in terminal. Supports 35+ languages, code folding, Lua customization, and QScintilla-based editing.",
		Stack:     "Python, PyQt, QScintilla",
		ReadmeURL: "https://raw.githubusercontent.com/parazeeknova/nyxtext-zenith/refs/heads/main/.github/README.md",
		RepoURL:   "https://github.com/parazeeknova/nyxtext-zenith",
	},
}
