package store

import "verso/backy/database/models"

var Profile = models.Profile{
	Name:     "verso",
	Tagline:  "personal knowledge base & folio",
	Username: "verso",
	Email:    "hello@verso.app",
	Description: "verso is a self-hosted personal knowledge base, blog, and portfolio built as one app with two access tiers. " +
		"Publicly, it shows a portfolio and blog anyone can browse. Behind authentication, it's a full markdown editor and workspace " +
		"— notes, documents, and long-term memory entries — with docmost-style editing and workspace management. " +
		"The whole knowledge base is retrieval-augmented: markdown content is chunked, embedded, and stored in a vector index " +
		"so it can be searched semantically and asked questions about directly, with recency-aware ranking so recent memory entries " +
		"surface above older ones when relevant.",
	Links: map[string]models.Link{
		"portfolio": {Label: "portfolio", URL: "https://verso.app"},
		"github":    {Label: "GitHub", URL: "https://github.com/parazeeknova/verso"},
	},
}

var Experiences = []models.ExperienceItem{
	{
		Title:    "Retrieval-Augmented Generation & Vector Index",
		Location: "Core Architecture",
		Period:   "Knowledge Base",
	},
	{
		Title:    "WhatsApp, Telegram & Discord Memory Capture",
		Location: "Omnichannel Integrations",
		Period:   "Messaging & Capture",
	},
	{
		Title:    "Automatic Image OCR & Voice Memo Transcription",
		Location: "Media Engine",
		Period:   "OCR & Document Processing",
	},
	{
		Title:    "Public Folio & Private Authenticated Brain",
		Location: "Access Control",
		Period:   "Dual Access Tiers",
	},
}

var Projects = []models.Project{
	{
		Title: "Verso — Self-hosted Knowledge Base & Folio",
		Desc: "A personal knowledge system that remembers everything written into it and can be talked to " +
			"— with a public face for visitors and a private mind for its owner, unified in a single app. " +
			"Content can be captured from anywhere — WhatsApp, Telegram, Discord — with automatic document OCR, " +
			"voice transcription, and recency-aware vector RAG.",
		Image:      "/verso.svg",
		Stack:      "TanStack Start, Vite, Go, TypeScript, PostgreSQL, Vector Index, TipTap, Tailwind CSS",
		ReadmeURL:  "https://raw.githubusercontent.com/parazeeknova/verso/refs/heads/main/.github/README.md",
		RepoURL:    "https://github.com/parazeeknova/verso",
		ProductURL: "https://github.com/parazeeknova/verso",
	},
}
