package main

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
)

// managedFiles is the single source of truth for where the version lives.
// The root package.json "version" is authoritative; every other file is kept
// in sync with it by this tool (locally through the pre-commit hook, and in
// CI during the release job).
var managedFiles = []string{
	"package.json",
	"lerna.json",
	"packages/backy/package.json",
	"packages/weby/package.json",
	"packages/native/package.json",
	"flake.nix",
	"packaging/arch/PKGBUILD",
}

var (
	semverPattern     = regexp.MustCompile(`^(\d+)\.(\d+)\.(\d+)$`)
	versionPattern    = regexp.MustCompile(`("version"\s*:\s*")[^"]*(")`)
	nixVersionPattern = regexp.MustCompile(`(version\s*=\s*")[^"]*(")`)
	pkgverPattern     = regexp.MustCompile(`(pkgver=)[^\n]*`)
)

func main() {
	args := os.Args[1:]
	cmd := "bump"
	if len(args) > 0 {
		cmd = args[0]
		args = args[1:]
	}

	switch cmd {
	case "bump":
		runBump()
	case "set":
		if len(args) < 1 {
			fail("usage: autobump set <version>")
		}
		runSet(args[0])
	case "sync":
		runSync()
	case "check":
		runCheck()
	case "get":
		root, err := repoRoot()
		if err != nil {
			fail("%v", err)
		}
		v, err := readVersion(root, "package.json")
		if err != nil {
			fail("%v", err)
		}
		fmt.Println(v)
	default:
		fail("unknown command %q (expected bump|set|sync|check|get)", cmd)
	}
}

func runBump() {
	root, err := repoRoot()
	if err != nil {
		fail("%v", err)
	}

	staged, err := getStagedFiles(root)
	if err != nil {
		fail("%v", err)
	}

	// Only bump when there are real (non-version) changes staged, so a
	// commit produced by this tool itself does not trigger another bump.
	if !hasMeaningfulStagedChanges(staged) {
		return
	}

	current, err := readVersion(root, "package.json")
	if err != nil {
		fail("%v", err)
	}

	next, err := bumpPatch(current)
	if err != nil {
		fail("%v", err)
	}

	for _, file := range managedFiles {
		if err := setVersion(root, file, next); err != nil {
			fail("failed to update %s: %v", file, err)
		}
	}

	if err := stageFiles(root, managedFiles); err != nil {
		fail("%v", err)
	}

	fmt.Printf("Bumped versions: %s -> %s\n", current, next)
}

func runSet(version string) {
	if !semverPattern.MatchString(version) {
		fail("invalid semver: %s", version)
	}
	root, err := repoRoot()
	if err != nil {
		fail("%v", err)
	}
	for _, file := range managedFiles {
		if err := setVersion(root, file, version); err != nil {
			fail("failed to update %s: %v", file, err)
		}
	}
	if err := stageFiles(root, managedFiles); err != nil {
		fail("%v", err)
	}
	fmt.Printf("Set version: %s\n", version)
}

func runSync() {
	root, err := repoRoot()
	if err != nil {
		fail("%v", err)
	}
	current, err := readVersion(root, "package.json")
	if err != nil {
		fail("%v", err)
	}
	for _, file := range managedFiles {
		if err := setVersion(root, file, current); err != nil {
			fail("failed to update %s: %v", file, err)
		}
	}
	if err := stageFiles(root, managedFiles); err != nil {
		fail("%v", err)
	}
	fmt.Printf("Synced all files to %s\n", current)
}

func runCheck() {
	root, err := repoRoot()
	if err != nil {
		fail("%v", err)
	}
	current, err := readVersion(root, "package.json")
	if err != nil {
		fail("%v", err)
	}

	ok := true
	for _, file := range managedFiles {
		v, err := readManagedVersion(root, file)
		if err != nil {
			fmt.Printf("  MISSING version in %s: %v\n", file, err)
			ok = false
			continue
		}
		if v != current {
			fmt.Printf("  MISMATCH %s: %s != %s\n", file, v, current)
			ok = false
		}
	}

	if !ok {
		fail("version consistency check failed")
	}
	fmt.Printf("All %d files consistent at %s\n", len(managedFiles), current)
}

func hasMeaningfulStagedChanges(stagedFiles []string) bool {
	managedSet := make(map[string]struct{}, len(managedFiles))
	for _, file := range managedFiles {
		managedSet[file] = struct{}{}
	}

	for _, file := range stagedFiles {
		if _, managed := managedSet[file]; !managed {
			return true
		}
	}

	return false
}

func getStagedFiles(rootDir string) ([]string, error) {
	cmd := exec.Command("git", "diff", "--cached", "--name-only", "--diff-filter=ACMR")
	cmd.Dir = rootDir

	out, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("git diff --cached failed: %w (%s)", err, strings.TrimSpace(string(out)))
	}

	trimmed := strings.TrimSpace(string(out))
	if trimmed == "" {
		return []string{}, nil
	}

	entries := strings.Split(trimmed, "\n")
	files := make([]string, 0, len(entries))
	for _, entry := range entries {
		file := strings.TrimSpace(entry)
		if file != "" {
			files = append(files, file)
		}
	}

	return files, nil
}

func readVersion(rootDir, relativePath string) (string, error) {
	path := filepath.Join(rootDir, relativePath)
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}

	var payload struct {
		Version string `json:"version"`
	}

	if err := json.Unmarshal(data, &payload); err != nil {
		return "", err
	}

	if payload.Version == "" {
		return "", fmt.Errorf("missing version field in %s", relativePath)
	}

	return payload.Version, nil
}

func readManagedVersion(rootDir, relativePath string) (string, error) {
	path := filepath.Join(rootDir, relativePath)
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}

	base := filepath.Base(relativePath)
	var re *regexp.Regexp
	switch base {
	case "flake.nix":
		re = nixVersionPattern
	case "PKGBUILD":
		re = pkgverPattern
	default:
		re = versionPattern
	}

	m := re.FindStringSubmatch(string(data))
	if m == nil {
		return "", fmt.Errorf("version field not found in %s", relativePath)
	}

	if base == "PKGBUILD" {
		// pkgverPattern has a single capture group (the "pkgver=" prefix);
		// the value is the remainder of the match.
		return strings.TrimSpace(strings.TrimPrefix(m[0], m[1])), nil
	}

	// versionPattern / nixVersionPattern capture: group1 = prefix
	// (inclosing opening quote), group2 = suffix (closing quote).
	// The value sits between them; group2 is not the value.
	inner := strings.TrimPrefix(m[0], m[1])
	inner = strings.TrimSuffix(inner, m[2])
	return inner, nil
}

func bumpPatch(version string) (string, error) {
	if !semverPattern.MatchString(version) {
		return "", fmt.Errorf("invalid semver: %s", version)
	}

	var major, minor, patch int
	if _, err := fmt.Sscanf(version, "%d.%d.%d", &major, &minor, &patch); err != nil {
		return "", err
	}

	if patch >= 100 {
		return fmt.Sprintf("%d.%d.0", major, minor+1), nil
	}

	return fmt.Sprintf("%d.%d.%d", major, minor, patch+1), nil
}

func setVersion(rootDir, relativePath, nextVersion string) error {
	path := filepath.Join(rootDir, relativePath)
	originalBytes, err := os.ReadFile(path)
	if err != nil {
		return err
	}

	original := string(originalBytes)
	var updated string
	switch filepath.Base(relativePath) {
	case "flake.nix":
		updated = nixVersionPattern.ReplaceAllString(original, `${1}`+nextVersion+`${2}`)
	case "PKGBUILD":
		updated = pkgverPattern.ReplaceAllString(original, `${1}`+nextVersion)
	default:
		updated = versionPattern.ReplaceAllString(original, `${1}`+nextVersion+`${2}`)
	}

	if updated == original {
		// Already at the target version (or field absent): treat as a no-op.
		return nil
	}

	return os.WriteFile(path, []byte(updated), 0o644)
}

func stageFiles(rootDir string, files []string) error {
	if len(files) == 0 {
		return nil
	}

	args := append([]string{"add", "--"}, files...)
	cmd := exec.Command("git", args...)
	cmd.Dir = rootDir

	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("git add failed: %w (%s)", err, strings.TrimSpace(string(out)))
	}

	return nil
}

func repoRoot() (string, error) {
	return gitOutput("rev-parse", "--show-toplevel")
}

func gitOutput(args ...string) (string, error) {
	cmd := exec.Command("git", args...)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("git %s failed: %w (%s)", strings.Join(args, " "), err, strings.TrimSpace(string(out)))
	}

	return strings.TrimSpace(string(out)), nil
}

func fail(format string, a ...any) {
	fmt.Fprintf(os.Stderr, format+"\n", a...)
	os.Exit(1)
}
