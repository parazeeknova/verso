#!/usr/bin/env bash
set -e

# Verify go is installed
command -v go >/dev/null 2>&1 || { echo "Go is not installed"; exit 1; }

# Add Go bin to PATH safely - capture GOPATH first, then export to the FRONT of PATH
GOPATH_BIN=$(go env GOPATH)/bin
export PATH="$GOPATH_BIN:$PATH"

# Install missing formatting and linting tools to GOPATH bin if not available there
if ! [ -x "$GOPATH_BIN/gofumpt" ]; then
    echo "gofumpt not found in $GOPATH_BIN, installing..."
    go install mvdan.cc/gofumpt@v0.7.0
fi

if ! [ -x "$GOPATH_BIN/goimports" ]; then
    echo "goimports not found in $GOPATH_BIN, installing..."
    go install golang.org/x/tools/cmd/goimports@latest
fi

if ! [ -x "$GOPATH_BIN/golangci-lint" ]; then
    echo "golangci-lint not found in $GOPATH_BIN, installing..."
    curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b "$GOPATH_BIN" v1.64.8
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
