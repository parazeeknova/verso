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
    pkgs.gsettings-desktop-schemas
    pkgs.libsoup_3
    pkgs.libayatana-appindicator
    pkgs.glib-networking
    pkgs.shellcheck
    pkgs.gst_all_1.gstreamer
    pkgs.gst_all_1.gst-plugins-base
    pkgs.gst_all_1.gst-plugins-good
    pkgs.gst_all_1.gst-plugins-bad
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
    pkgs.gst_all_1.gstreamer
    pkgs.gst_all_1.gst-plugins-base
    pkgs.gst_all_1.gst-plugins-good
    pkgs.gst_all_1.gst-plugins-bad
  ];

  env.XDG_DATA_DIRS = "${pkgs.gsettings-desktop-schemas}/share/gsettings-schemas/${pkgs.gsettings-desktop-schemas.name}:${pkgs.gtk3}/share/gsettings-schemas/${pkgs.gtk3.name}:$XDG_DATA_DIRS";
  env.SSL_CERT_FILE = "${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt";
  env.NIX_SSL_CERT_FILE = "${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt";
  env.WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS = "1";
  env.GIO_EXTRA_MODULES = "${pkgs.glib-networking}/lib/gio/modules";
  env.GST_PLUGIN_PATH = lib.makeSearchPath "lib/gstreamer-1.0" [
    pkgs.gst_all_1.gst-plugins-base
    pkgs.gst_all_1.gst-plugins-good
    pkgs.gst_all_1.gst-plugins-bad
  ];

  # Pre-commit hooks configuration (optional, can be integrated if desired)
  # pre-commit.hooks = {
  #   shellcheck.enable = true;
  # };

  # Processes (optional, can define background processes to run)
  processes = {
    infra.exec = "bun run infra:up";
  };
}
