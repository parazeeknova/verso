{ pkgs, lib, config, inputs, ... }:

{
  # https://devenv.sh/reference/options/

  # Enable Go language support
  languages.go.enable = true;

  # Enable JavaScript/TypeScript support using Bun
  languages.javascript = {
    enable = true;
    bun = {
      enable = true;
      # Automatically run `bun install` when entering the shell
      install.enable = true;
    };
  };

  # Packages to install in the development environment
  packages = [
    pkgs.docker-compose
    pkgs.lefthook
    pkgs.gofumpt
    pkgs.gotools
    pkgs.golangci-lint
  ];

  # Pre-commit hooks configuration (optional, can be integrated if desired)
  # pre-commit.hooks = {
  #   shellcheck.enable = true;
  # };

  # Processes (optional, can define background processes to run)
  # processes = {
  #   infra.exec = "bun run infra:up";
  # };
}
