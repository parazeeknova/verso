#!/usr/bin/env bash
set -e

# Change to the script directory (packages/backy root)
cd "$(dirname "$0")/.." || exit 1

# Verify go is installed
command -v go >/dev/null 2>&1 || { echo "Go is not installed"; exit 1; }

# Add Go bin to PATH safely - capture GOPATH first, then export to the FRONT of PATH
GOPATH_BIN=$(go env GOPATH)/bin
export PATH="$GOPATH_BIN:$PATH"

# Install missing formatting tools to GOPATH bin if not available there
if ! [ -x "$GOPATH_BIN/gofumpt" ]; then
    echo "gofumpt not found in $GOPATH_BIN, installing..."
    go install mvdan.cc/gofumpt@v0.7.0
fi

if ! [ -x "$GOPATH_BIN/goimports" ]; then
    echo "goimports not found in $GOPATH_BIN, installing..."
    go install golang.org/x/tools/cmd/goimports@latest
fi

echo "Running gofumpt..."
gofumpt -w .

echo "Running goimports..."
goimports -w .
