#!/usr/bin/env bash
set -e

# Verify go is installed
command -v go >/dev/null 2>&1 || { echo "Go is not installed"; exit 1; }

# Add Go bin to PATH safely - capture GOPATH first, then export
GOPATH_BIN=$(go env GOPATH)/bin
export PATH="$PATH:$GOPATH_BIN"

# Install missing formatting and linting tools to GOPATH bin if not available
if ! command -v gofumpt >/dev/null 2>&1; then
    echo "gofumpt not found, installing to $GOPATH_BIN..."
    go install mvdan.cc/gofumpt@v0.7.0
fi

if ! command -v goimports >/dev/null 2>&1; then
    echo "goimports not found, installing to $GOPATH_BIN..."
    go install golang.org/x/tools/cmd/goimports@latest
fi

if ! command -v golangci-lint >/dev/null 2>&1; then
    echo "golangci-lint not found, installing to $GOPATH_BIN..."
    curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b "$GOPATH_BIN" v1.61.0
fi

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
