package store

import "verso/backy/models"

var Profile = models.Profile{
	Name:     "Harsh Sahu",
	Tagline:  "designer portfolio",
	Username: "parazeeknova",
	Email:    "harsh@itssingularity.com",
	Description: "Engineer and founder, building systems, infrastructure, and tools. " +
		"Author of [Zephyr](https://www.zephyyrr.in). Runs [Singularity Works](https://www.itsingularity.com), an opinionated product studio. " +
		"CS undergrad who builds things that shouldn't exist yet, then open-sources them so you can too. " +
		"Occasional [hackathon](https://www.linkedin.com/in/hashk/details/honors/) winner, published [researcher](https://www.orcid.org/0009-0008-9861-9181).",
	Links: map[string]models.Link{
		"portfolio":   {Label: "designer portfolio", URL: "https://folio.zephyyrr.in"},
		"zephyr":      {Label: "Zephyr", URL: "https://www.zephyyrr.in"},
		"singularity": {Label: "Singularity Works", URL: "https://www.itsingularity.com"},
		"github":      {Label: "GitHub", URL: "https://www.github.com/parazeeknova"},
		"linkedin":    {Label: "LinkedIn", URL: "https://www.linkedin.com/in/hashk"},
		"twitter":     {Label: "Twitter / X", URL: "https://www.x.com/parazeeknova"},
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
		Title: "Zephyr is the last social platform you'll ever need. Open source, cozy, and slightly unhinged. ",
		Desc: "A social platform that brings your entire " +
			"internet into one place. Unified feed, communities, real-time chat, " +
			"rich media and tipping all tied together by Aura, a reputation " +
			"system that grows with you, and Zeph, an AI companion that actually " +
			"remembers you. Built by one person. Slightly unhinged in ambition.",
		Stack:      "Next.js, React, Elysia, Elixir, TypeScript, Tailwind CSS, PostgreSQL, Redis, RustFS, RabbitMQ, MeiliSearch, AI-sdk, Docker and more",
		ReadmeURL:  "https://raw.githubusercontent.com/zephverse/zephyr/refs/heads/main/.github/README.md",
		RepoURL:    "https://github.com/zephverse/zephyr",
		ProductURL: "https://zephyyrr.in",
	},
	{
		Title:      "Lumen is a spatial system for organizing work.",
		Desc:       "A local-first spatial workspace for free-form kanban, structured tasks, durable offline work, and realtime collaboration with other goodies.",
		Stack:      "Next.js, Elysia, Elixir, Typescript, Bun, PostgreSQL, Redis, Yjs, Zustand, Tailwind, Tauri, CRDTs, Docker, Playwright, Bun Test, K6 and more",
		ReadmeURL:  "https://raw.githubusercontent.com/singularityworks-xyz/lumen/refs/heads/origin/.github/README.md",
		RepoURL:    "https://github.com/singularityworks-xyz/lumen",
		ProductURL: "https://lumen.itssingularity.com",
	},
	{
		Title:      "Papyrus is a realtime collaborative spreadsheet",
		Desc:       "Realtime collaborative spreadsheet with a local-first document model, CRDT-based syncing, worker-driven evaluation, and a virtualized grid built to stay responsive on 10K+ row datasets.",
		Stack:      "Next.js, Elixir, TypeScript, Bun, Firestore, Yjs, Zustand, Tailwind CSS, CRDTs, Docker and more",
		ReadmeURL:  "https://raw.githubusercontent.com/parazeeknova/papyrus/refs/heads/main/.github/README.md",
		RepoURL:    "https://github.com/parazeeknova/papyrus",
		ProductURL: "https://sheets.zephyyrr.in",
	},
	{
		Title:      "Verso is a knowledge base, two sides of the same surface.",
		Desc:       "This is my personal portfolio and knowledge base two panels, two purposes, one app that doesn't apologize for being both. the left side is where i exist as a person: my projects, my work, my contribution graph that i pretend isn't a source of anxiety. the right side is where i think out loud: notes, docs, blog posts, half-baked ideas that maybe shouldn't be public but are anyway.",
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
