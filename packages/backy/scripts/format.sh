#!/usr/bin/env bash
set -e

# Change to the script directory (packages/backy root)
cd "$(dirname "$0")/.." || exit 1

# Verify go is installed
command -v go >/dev/null 2>&1 || { echo "Go is not installed"; exit 1; }

# Add Go bin to PATH safely - capture GOPATH first, then export
GOPATH_BIN=$(go env GOPATH)/bin
export PATH="$PATH:$GOPATH_BIN"

# Install missing formatting tools to GOPATH bin if not available
if ! command -v gofumpt >/dev/null 2>&1; then
    echo "gofumpt not found, installing to $GOPATH_BIN..."
    go install mvdan.cc/gofumpt@v0.7.0
fi

if ! command -v goimports >/dev/null 2>&1; then
    echo "goimports not found, installing to $GOPATH_BIN..."
    go install golang.org/x/tools/cmd/goimports@latest
fi

echo "Running gofumpt..."
gofumpt -w .

echo "Running goimports..."
goimports -w .
