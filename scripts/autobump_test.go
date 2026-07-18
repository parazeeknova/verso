package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestBumpPatch(t *testing.T) {
	cases := []struct {
		in      string
		want    string
		wantErr bool
	}{
		{"0.3.76", "0.3.77", false},
		{"0.3.99", "0.3.100", false},
		{"0.3.100", "0.4.0", false},
		{"1.2.3", "1.2.4", false},
		{"not-semver", "", true},
	}
	for _, c := range cases {
		got, err := bumpPatch(c.in)
		if c.wantErr {
			if err == nil {
				t.Errorf("bumpPatch(%q): expected error, got %q", c.in, got)
			}
			continue
		}
		if err != nil {
			t.Errorf("bumpPatch(%q): unexpected error: %v", c.in, err)
			continue
		}
		if got != c.want {
			t.Errorf("bumpPatch(%q) = %q, want %q", c.in, got, c.want)
		}
	}
}

func TestManagedFilesIncludesNative(t *testing.T) {
	found := false
	for _, f := range managedFiles {
		if f == "packages/native/package.json" {
			found = true
		}
	}
	if !found {
		t.Errorf("managedFiles is missing packages/native/package.json: %v", managedFiles)
	}
}

func TestHasMeaningfulStagedChanges(t *testing.T) {
	cases := []struct {
		name   string
		staged []string
		want   bool
	}{
		{"empty", nil, false},
		{"only managed", []string{"package.json", "flake.nix"}, false},
		{"non-managed", []string{"package.json", "packages/weby/src/foo.ts"}, true},
	}
	for _, c := range cases {
		if got := hasMeaningfulStagedChanges(c.staged); got != c.want {
			t.Errorf("%s: hasMeaningfulStagedChanges = %v, want %v", c.name, got, c.want)
		}
	}
}

// writeManaged writes a managed file of the given base name with the given
// version into a fresh temp dir and returns (dir, rel).
func writeManaged(t *testing.T, base, version string) (string, string) {
	t.Helper()
	dir := t.TempDir()
	rel := base
	var content string
	switch base {
	case "flake.nix":
		content = "version = \"" + version + "\"; # Dynamically updated by release scripts\n"
	case "PKGBUILD":
		content = "pkgver=" + version + "\n"
	default:
		content = "  \"version\": \"" + version + "\",\n"
	}
	path := filepath.Join(dir, rel)
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
	return dir, rel
}

func TestReadManagedVersion(t *testing.T) {
	cases := []struct {
		base    string
		version string
	}{
		{"package.json", "1.2.3"},
		{"lerna.json", "1.2.3"},
		{"packages/backy/package.json", "1.2.3"},
		{"packages/weby/package.json", "1.2.3"},
		{"packages/native/package.json", "1.2.3"},
		{"flake.nix", "1.2.3"},
		{"PKGBUILD", "1.2.3"},
	}
	for _, c := range cases {
		dir, rel := writeManaged(t, c.base, c.version)
		got, err := readManagedVersion(dir, rel)
		if err != nil {
			t.Errorf("readManagedVersion(%q): %v", c.base, err)
			continue
		}
		if got != c.version {
			t.Errorf("readManagedVersion(%q) = %q, want %q", c.base, got, c.version)
		}
	}
}

func TestSetVersion(t *testing.T) {
	bases := []string{
		"package.json",
		"lerna.json",
		"packages/backy/package.json",
		"packages/weby/package.json",
		"packages/native/package.json",
		"flake.nix",
		"PKGBUILD",
	}
	for _, base := range bases {
		dir, rel := writeManaged(t, base, "1.2.3")

		if err := setVersion(dir, rel, "9.9.9"); err != nil {
			t.Errorf("setVersion(%q): %v", base, err)
			continue
		}
		got, err := readManagedVersion(dir, rel)
		if err != nil {
			t.Errorf("readManagedVersion after set(%q): %v", base, err)
			continue
		}
		if got != "9.9.9" {
			t.Errorf("setVersion(%q) -> read %q, want 9.9.9", base, got)
		}

		// No-op when already at the target: the file content must not change.
		before, err := os.ReadFile(filepath.Join(dir, rel))
		if err != nil {
			t.Fatal(err)
		}
		if err := setVersion(dir, rel, "9.9.9"); err != nil {
			t.Errorf("setVersion no-op(%q): %v", base, err)
			continue
		}
		after, err := os.ReadFile(filepath.Join(dir, rel))
		if err != nil {
			t.Fatal(err)
		}
		if string(before) != string(after) {
			t.Errorf("setVersion(%q) changed file content on no-op", base)
		}
	}
}

func TestReadVersion(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "package.json")
	content := "{\n  \"name\": \"x\",\n  \"version\": \"4.5.6\"\n}\n"
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
	got, err := readVersion(dir, "package.json")
	if err != nil {
		t.Fatal(err)
	}
	if got != "4.5.6" {
		t.Errorf("readVersion = %q, want 4.5.6", got)
	}
}
