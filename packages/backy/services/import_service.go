package services

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"verso/backy/models"
)

// ImportService handles importing markdown files into DB-backed pages
type ImportService struct {
	pageService *PageService
}

// NewImportService creates a new import service
func NewImportService(pageService *PageService) *ImportService {
	return &ImportService{pageService: pageService}
}

// ConvertMarkdownToProseMirror converts raw markdown text into a ProseMirror/Tiptap JSON doc
func (s *ImportService) ConvertMarkdownToProseMirror(markdown string) (json.RawMessage, string) {
	doc := map[string]any{
		"type":    "doc",
		"content": []any{},
	}

	content := []any{}
	var textContent strings.Builder

	lines := strings.Split(markdown, "\n")
	i := 0
	inCodeBlock := false
	codeBlockLines := []string{}

	for i < len(lines) {
		line := strings.TrimRight(lines[i], "\r")

		if inCodeBlock {
			if strings.HasPrefix(line, "```") {
				codeText := strings.Join(codeBlockLines, "\n")
				content = append(content, map[string]any{
					"type":    "codeBlock",
					"content": []any{map[string]any{"type": "text", "text": codeText}},
				})
				textContent.WriteString(codeText)
				textContent.WriteString("\n")
				codeBlockLines = nil
				inCodeBlock = false
				i++
				continue
			}
			codeBlockLines = append(codeBlockLines, line)
			i++
			continue
		}

		if strings.HasPrefix(line, "```") {
			inCodeBlock = true
			i++
			continue
		}

		if strings.HasPrefix(line, "# ") {
			headingText := strings.TrimPrefix(line, "# ")
			content = append(content, map[string]any{
				"type": "heading",
				"attrs": map[string]any{
					"level": 1,
				},
				"content": []any{map[string]any{"type": "text", "text": headingText}},
			})
			textContent.WriteString(headingText)
			textContent.WriteString("\n")
			i++
			continue
		}
		if strings.HasPrefix(line, "## ") {
			headingText := strings.TrimPrefix(line, "## ")
			content = append(content, map[string]any{
				"type": "heading",
				"attrs": map[string]any{
					"level": 2,
				},
				"content": []any{map[string]any{"type": "text", "text": headingText}},
			})
			textContent.WriteString(headingText)
			textContent.WriteString("\n")
			i++
			continue
		}
		if strings.HasPrefix(line, "### ") {
			headingText := strings.TrimPrefix(line, "### ")
			content = append(content, map[string]any{
				"type": "heading",
				"attrs": map[string]any{
					"level": 3,
				},
				"content": []any{map[string]any{"type": "text", "text": headingText}},
			})
			textContent.WriteString(headingText)
			textContent.WriteString("\n")
			i++
			continue
		}
		if strings.HasPrefix(line, "#### ") {
			headingText := strings.TrimPrefix(line, "#### ")
			content = append(content, map[string]any{
				"type": "heading",
				"attrs": map[string]any{
					"level": 4,
				},
				"content": []any{map[string]any{"type": "text", "text": headingText}},
			})
			textContent.WriteString(headingText)
			textContent.WriteString("\n")
			i++
			continue
		}

		if strings.HasPrefix(line, "> ") {
			quoteText := strings.TrimPrefix(line, "> ")
			content = append(content, map[string]any{
				"type": "blockquote",
				"content": []any{
					map[string]any{
						"type":    "paragraph",
						"content": []any{map[string]any{"type": "text", "text": quoteText}},
					},
				},
			})
			textContent.WriteString(quoteText)
			textContent.WriteString("\n")
			i++
			continue
		}

		if strings.HasPrefix(line, "- ") || isOrderedListItem(line) {
			var listItems []string
			isOrdered := isOrderedListItem(line)
			currentLine := line
			for i < len(lines) {
				trimmed := strings.TrimRight(currentLine, "\r")
				if strings.HasPrefix(trimmed, "- ") {
					listItems = append(listItems, strings.TrimPrefix(trimmed, "- "))
				} else if isOrderedListItem(trimmed) {
					listItems = append(listItems, stripOrderedListItem(trimmed))
					isOrdered = true
				} else {
					break
				}
				textContent.WriteString(trimmed)
				textContent.WriteString("\n")
				i++
				if i < len(lines) {
					currentLine = lines[i]
				}
			}

			items := []any{}
			for _, item := range listItems {
				items = append(items, map[string]any{
					"type": "listItem",
					"content": []any{
						map[string]any{
							"type":    "paragraph",
							"content": []any{map[string]any{"type": "text", "text": item}},
						},
					},
				})
			}
			listType := "bulletList"
			if isOrdered {
				listType = "orderedList"
			}
			content = append(content, map[string]any{
				"type":    listType,
				"content": items,
			})
			continue
		}

		if strings.TrimSpace(line) == "" {
			i++
			continue
		}

		paragraphLines := []string{line}
		i++
		for i < len(lines) {
			nextLine := strings.TrimRight(lines[i], "\r")
			if strings.TrimSpace(nextLine) == "" ||
				strings.HasPrefix(nextLine, "# ") ||
				strings.HasPrefix(nextLine, "## ") ||
				strings.HasPrefix(nextLine, "### ") ||
				strings.HasPrefix(nextLine, "#### ") ||
				strings.HasPrefix(nextLine, "```") ||
				strings.HasPrefix(nextLine, "> ") ||
				strings.HasPrefix(nextLine, "- ") ||
				isOrderedListItem(nextLine) {
				break
			}
			paragraphLines = append(paragraphLines, nextLine)
			i++
		}

		paraText := strings.Join(paragraphLines, " ")
		content = append(content, map[string]any{
			"type": "paragraph",
			"content": []any{
				map[string]any{
					"type": "text",
					"text": paraText,
				},
			},
		})
		textContent.WriteString(paraText)
		textContent.WriteString("\n")
	}

	// Flush any remaining code block lines at EOF
	if inCodeBlock {
		codeText := strings.Join(codeBlockLines, "\n")
		content = append(content, map[string]any{
			"type":    "codeBlock",
			"content": []any{map[string]any{"type": "text", "text": codeText}},
		})
		textContent.WriteString(codeText)
		textContent.WriteString("\n")
	}

	doc["content"] = content
	result, _ := json.Marshal(doc)
	return json.RawMessage(result), strings.TrimSpace(textContent.String())
}

// ImportMarkdownFile reads a markdown file, converts it, and persists as a DB page.
// creatorID is the user ID to record as the page creator (satisfies the FK constraint).
func (s *ImportService) ImportMarkdownFile(
	ctx context.Context,
	slug string,
	title string,
	filePath string,
	creatorID string,
) error {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return fmt.Errorf("reading markdown file %q: %w", filePath, err)
	}

	contentJSON, textContent := s.ConvertMarkdownToProseMirror(string(data))

	now := time.Now()
	page := models.Page{
		ID:          newUUID(),
		SlugID:      slug,
		Title:       title,
		ContentJSON: contentJSON,
		TextContent: textContent,
		IsPublished: true,
		CreatorID:   creatorID,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.pageService.CreatePage(ctx, page); err != nil {
		return fmt.Errorf("persisting imported page %q: %w", slug, err)
	}

	return nil
}

// isOrderedListItem returns true if the line starts with a number followed by ". "
func isOrderedListItem(line string) bool {
	i := 0
	for i < len(line) && line[i] >= '0' && line[i] <= '9' {
		i++
	}
	return i > 0 && i+2 <= len(line) && line[i] == '.' && line[i+1] == ' '
}

// stripOrderedPrefix strips the "N. " prefix from an ordered list item
func stripOrderedListItem(line string) string {
	i := 0
	for i < len(line) && line[i] >= '0' && line[i] <= '9' {
		i++
	}
	if i > 0 && i+2 <= len(line) && line[i] == '.' && line[i+1] == ' ' {
		return line[i+2:]
	}
	return line
}
