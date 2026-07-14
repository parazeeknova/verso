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

var managedFiles = []string{
	"package.json",
	"lerna.json",
	"packages/backy/package.json",
	"packages/weby/package.json",
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
	rootDir, err := gitOutput("rev-parse", "--show-toplevel")
	if err != nil {
		panic(fmt.Sprintf("failed to resolve repository root: %v", err))
	}

	stagedFiles, err := getStagedFiles(rootDir)
	if err != nil {
		panic(fmt.Sprintf("failed to read staged files: %v", err))
	}

	if !hasMeaningfulStagedChanges(stagedFiles) {
		return
	}

	currentVersion, err := readVersion(rootDir, "package.json")
	if err != nil {
		panic(fmt.Sprintf("failed to read current version: %v", err))
	}

	nextVersion, err := bumpPatch(currentVersion)
	if err != nil {
		panic(fmt.Sprintf("failed to bump version: %v", err))
	}

	for _, file := range managedFiles {
		if err := setVersion(rootDir, file, nextVersion); err != nil {
			panic(fmt.Sprintf("failed to update %s: %v", file, err))
		}
	}

	if err := stageFiles(rootDir, managedFiles); err != nil {
		panic(fmt.Sprintf("failed to stage bumped versions: %v", err))
	}

	fmt.Printf("Bumped versions: %s -> %s\n", currentVersion, nextVersion)
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

func bumpPatch(version string) (string, error) {
	match := semverPattern.FindStringSubmatch(version)
	if match == nil {
		return "", fmt.Errorf("invalid semver: %s", version)
	}

	var major int
	var minor int
	var patch int

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
	if filepath.Base(relativePath) == "flake.nix" {
		updated = nixVersionPattern.ReplaceAllString(original, `${1}`+nextVersion+`${2}`)
	} else if filepath.Base(relativePath) == "PKGBUILD" {
		updated = pkgverPattern.ReplaceAllString(original, `${1}`+nextVersion)
	} else {
		updated = versionPattern.ReplaceAllString(original, `${1}`+nextVersion+`${2}`)
	}

	if updated == original {
		return fmt.Errorf("version field not found in %s", relativePath)
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

func gitOutput(args ...string) (string, error) {
	cmd := exec.Command("git", args...)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("git %s failed: %w (%s)", strings.Join(args, " "), err, strings.TrimSpace(string(out)))
	}

	return strings.TrimSpace(string(out)), nil
}
