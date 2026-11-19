{
  description = "Portfolio de Vincent Douin, monteur vidéo et motion designer";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      inherit (nixpkgs) lib;

      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];

      forEachSystem = f: lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      # Node for the site, ffmpeg for scripts/encode-videos.sh. The Astro
      # CLI reports usage statistics unless told not to.
      devShells = forEachSystem (pkgs: {
        default = pkgs.mkShell {
          packages = [
            pkgs.nodejs_24
            pkgs.ffmpeg
          ];

          env.ASTRO_TELEMETRY_DISABLED = "1";
        };
      });

      # Static site, built offline from package-lock.json: every npm
      # dependency becomes a Nix fetch pinned by the lock's integrity
      # hashes, so there is no separate hash to maintain here.
      packages = forEachSystem (pkgs: {
        default = pkgs.buildNpmPackage {
          pname = "vincent-portfolio";
          version = (lib.importJSON ./package.json).version;

          src = lib.fileset.toSource {
            root = ./.;
            fileset = lib.fileset.unions [
              ./package.json
              ./package-lock.json
              ./tsconfig.json
              ./astro.config.ts
              ./public
              ./scripts
              ./src
            ];
          };

          env.ASTRO_TELEMETRY_DISABLED = "1";

          nodejs = pkgs.nodejs_24;
          npmDeps = pkgs.importNpmLock { npmRoot = ./.; };
          npmConfigHook = pkgs.importNpmLock.npmConfigHook;

          installPhase = ''
            runHook preInstall
            cp -r dist $out
            runHook postInstall
          '';
        };
      });
    };
}
