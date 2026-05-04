#!/bin/bash
set -e

# Verify go is installed
command -v go >/dev/null 2>&1 || { echo "Go is not installed"; exit 1; }

# Add Go bin to PATH safely - capture GOPATH first, then export
GOPATH_BIN=$(go env GOPATH)/bin
export PATH="$PATH:$GOPATH_BIN"

echo "Running gofumpt check..."
GOFUMPT_OUT=$(gofumpt -l -d . 2>&1) || true
if [ -n "$GOFUMPT_OUT" ]; then
    echo "$GOFUMPT_OUT"
    echo "gofumpt found formatting issues"
    exit 1
fi

echo "Running goimports check..."
GOIMPORTS_OUT=$(goimports -local verso/backy -l -d . 2>&1) || true
if [ -n "$GOIMPORTS_OUT" ]; then
    echo "$GOIMPORTS_OUT"
    echo "goimports found import issues"
    exit 1
fi

echo "Running golangci-lint..."
golangci-lint run
