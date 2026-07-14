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
    pkgs.webkitgtk_4_1
    pkgs.gtk3
    pkgs.libsoup_3
    pkgs.libayatana-appindicator
    pkgs.glib-networking
    pkgs.shellcheck
  ];

  env.LD_LIBRARY_PATH = lib.makeLibraryPath [
    pkgs.webkitgtk_4_1
    pkgs.gtk3
    pkgs.cairo
    pkgs.gdk-pixbuf
    pkgs.glib
    pkgs.libsoup_3
    pkgs.libayatana-appindicator
    pkgs.stdenv.cc.cc.lib
  ];

  env.SSL_CERT_FILE = "${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt";
  env.NIX_SSL_CERT_FILE = "${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt";
  env.WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS = "1";
  env.GIO_EXTRA_MODULES = "${pkgs.glib-networking}/lib/gio/modules";

  # Pre-commit hooks configuration (optional, can be integrated if desired)
  # pre-commit.hooks = {
  #   shellcheck.enable = true;
  # };

  # Processes (optional, can define background processes to run)
  processes = {
    infra.exec = "bun run infra:up";
  };
}
