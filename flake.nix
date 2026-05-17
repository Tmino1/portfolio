{
  description = "Three.js development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_22
            lazynpm

            playwright-driver
            chromium

            mesa
            mesa-demos
          ];

          shellHook = ''
            echo "🟢 Three.js dev environment ready"
            echo "Node: $(node --version)"
            echo "npm:  $(npm --version)"
          '';
        };
      });
}
