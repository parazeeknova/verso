{
  description = "Personal knowledge base and folio, blog for public face & private brain, one app";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
        
        # Derivation that fetches the release tarball and wraps it
        verso = pkgs.stdenv.mkDerivation rec {
          pname = "verso";
          version = "0.4.5"; # Dynamically updated by release scripts

          src = pkgs.fetchurl {
            url = "https://github.com/parazeeknova/verso/releases/download/v${version}/stable-linux-x64-Verso-Setup.tar.gz";
            sha256 = "sha256-0rOINom3BJmcluNbBwJRBpsrmqwzEol3qZH+LsrEdJk="; # Updated with each release hash
          };

          nativeBuildInputs = [ pkgs.makeWrapper pkgs.autoPatchelfHook ];

          buildInputs = [
            pkgs.webkitgtk_4_1
            pkgs.gtk3
            pkgs.gsettings-desktop-schemas
            pkgs.cairo
            pkgs.gdk-pixbuf
            pkgs.glib
            pkgs.libsoup_3
            pkgs.libayatana-appindicator
            pkgs.glib-networking
            pkgs.stdenv.cc.cc.lib
            pkgs.gst_all_1.gstreamer
            pkgs.gst_all_1.gst-plugins-base
            pkgs.gst_all_1.gst-plugins-good
            pkgs.gst_all_1.gst-plugins-bad
          ];

          dontBuild = true;
          dontConfigure = true;

          unpackPhase = ''
            mkdir -p src
            tar -xzf $src -C src
          '';

          installPhase = ''
            mkdir -p $out/opt/verso
            cp -r src/* $out/opt/verso/

            mkdir -p $out/bin
            makeWrapper $out/opt/verso/Verso $out/bin/verso \
              --prefix LD_LIBRARY_PATH : "${pkgs.lib.makeLibraryPath buildInputs}" \
              --prefix GIO_EXTRA_MODULES : "${pkgs.glib-networking}/lib/gio/modules" \
              --prefix GST_PLUGIN_PATH : "${pkgs.lib.makeSearchPath "lib/gstreamer-1.0" [ pkgs.gst_all_1.gst-plugins-base pkgs.gst_all_1.gst-plugins-good pkgs.gst_all_1.gst-plugins-bad ]}" \
              --prefix XDG_DATA_DIRS : "${pkgs.gsettings-desktop-schemas}/share/gsettings-schemas/${pkgs.gsettings-desktop-schemas.name}:${pkgs.gtk3}/share/gsettings-schemas/${pkgs.gtk3.name}" \
              --set SSL_CERT_FILE "${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt" \
              --set NIX_SSL_CERT_FILE "${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt"
          '';
        };
      in
      {
        packages.default = verso;
        packages.verso = verso;
      }
    );
}
