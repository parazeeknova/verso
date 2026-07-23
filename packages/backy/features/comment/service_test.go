package comment

import (
	"testing"
)

func TestExtractMentionIDs(t *testing.T) {
	t.Run("ignores UUIDs in plain text", func(t *testing.T) {
		text := "Hello @550e8400-e29b-41d4-a716-446655440000 check this out @123e4567-e89b-12d3-a456-426614174000"
		ids := extractMentionIDs(text)
		if len(ids) != 0 {
			t.Fatalf("expected 0 mention IDs from plain text, got %d", len(ids))
		}
	})

	t.Run("extracts mention nodes from JSON", func(t *testing.T) {
		jsonContent := `{
			"type": "doc",
			"content": [
				{
					"type": "paragraph",
					"content": [
						{
							"type": "mention",
							"attrs": { "id": "550e8400-e29b-41d4-a716-446655440000", "label": "Alice" }
						}
					]
				}
			]
		}`
		ids := extractMentionIDs(jsonContent)
		if len(ids) != 1 {
			t.Fatalf("expected 1 mention ID from JSON, got %d", len(ids))
		}
		if ids[0] != "550e8400-e29b-41d4-a716-446655440000" {
			t.Errorf("expected ID 550e8400-e29b-41d4-a716-446655440000, got %s", ids[0])
		}
	})

	t.Run("deduplicates mention IDs in JSON", func(t *testing.T) {
		jsonContent := `{
			"type": "doc",
			"content": [
				{
					"type": "paragraph",
					"content": [
						{
							"type": "mention",
							"attrs": { "id": "550e8400-e29b-41d4-a716-446655440000", "label": "Alice" }
						},
						{
							"type": "text",
							"text": " and "
						},
						{
							"type": "mention",
							"attrs": { "id": "550e8400-e29b-41d4-a716-446655440000", "label": "Alice" }
						}
					]
				}
			]
		}`
		ids := extractMentionIDs(jsonContent)
		if len(ids) != 1 {
			t.Fatalf("expected 1 unique mention ID, got %d", len(ids))
		}
	})

	t.Run("returns empty for invalid JSON", func(t *testing.T) {
		ids := extractMentionIDs("just some text with a uuid 550e8400-e29b-41d4-a716-446655440000")
		if len(ids) != 0 {
			t.Fatalf("expected 0 mention IDs from non-JSON, got %d", len(ids))
		}
	})
}
