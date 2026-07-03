#!/usr/bin/env bash
# Nuru — local Android build (no Expo cloud queue).
#
# Runs eas build --local inside WSL Ubuntu, producing a signed production .aab.
# One-time setup (JDK 17, Android SDK, Node via nvm, eas-cli, EXPO_TOKEN) lives
# in the WSL home dir — see apps/nuru/scripts/LOCAL-BUILD.md for how it was set up.
#
# Usage (from Windows, in Git Bash / this repo):
#   MSYS_NO_PATHCONV=1 wsl -d Ubuntu -- bash -ic 'bash ~/nuru-build/scripts/local-build.sh'
#
# Or from inside a WSL Ubuntu terminal:
#   bash ~/nuru-build/scripts/local-build.sh
#
# It re-syncs the latest app source from the Windows repo into the WSL native
# fs (~/nuru-build) before building, so you always build current code.

set -euo pipefail

WIN_SRC="/mnt/c/Users/busie/mcloud-1/apps/nuru"
BUILD_DIR="$HOME/nuru-build"
PROFILE="${1:-production}"

# Toolchain (nvm-managed node + linux Android SDK + JDK 17).
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22 >/dev/null
export ANDROID_HOME="$HOME/android-sdk"
export ANDROID_SDK_ROOT="$HOME/android-sdk"
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools"
# EXPO_TOKEN is exported from ~/.bashrc (non-interactive EAS auth).

echo ">> syncing latest source from Windows repo..."
rsync -a --delete \
  --exclude node_modules --exclude .git --exclude .expo \
  --exclude android --exclude ios --exclude '*.aab' --exclude '*.apk' \
  "$WIN_SRC/" "$BUILD_DIR/"

cd "$BUILD_DIR"

# EAS needs deps present and a git repo to determine the build file set.
echo ">> ensuring deps..."
[ -d node_modules ] || npm install

if [ ! -d .git ]; then
  printf 'node_modules/\n.expo/\ndist/\n*.aab\n*.apk\n' > .gitignore
  git init -q && git config user.email build@local && git config user.name "local build"
fi
git add -A
git commit -q -m "local build snapshot $(date +%Y%m%d-%H%M%S)" || true

echo ">> building ($PROFILE) — this is the long step..."
eas build --local --platform android --profile "$PROFILE" \
  --non-interactive --output "./nuru-$PROFILE.aab"

echo ">> DONE. Artifact:"
ls -lh "./nuru-$PROFILE.aab"
echo ">> Copy it to Windows with:"
echo "   cp $BUILD_DIR/nuru-$PROFILE.aab /mnt/c/Users/busie/Desktop/"
