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
          version = "0.2.92"; # Dynamically updated by release scripts

          src = pkgs.fetchurl {
            url = "https://github.com/parazeeknova/verso/releases/download/v${version}/stable-linux-x64-Verso-Setup.tar.gz";
            sha256 = "sha256-h9DM4Uhjp77luNMEoa7k2oqAlIOj/i4hp4DlY9Mswjk="; # Updated with each release hash
          };

          nativeBuildInputs = [ pkgs.makeWrapper pkgs.autoPatchelfHook ];

          buildInputs = [
            pkgs.webkitgtk_4_1
            pkgs.gtk3
            pkgs.cairo
            pkgs.gdk-pixbuf
            pkgs.glib
            pkgs.libsoup_3
            pkgs.libayatana-appindicator
            pkgs.glib-networking
            pkgs.stdenv.cc.cc.lib
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
              --set WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS 1 \
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
