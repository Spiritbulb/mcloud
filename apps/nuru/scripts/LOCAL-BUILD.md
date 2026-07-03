# Nuru — Local Android Builds (no Expo cloud queue)

Build the production `.aab` on this machine instead of waiting in the EAS cloud
queue. Runs `eas build --local` inside **WSL Ubuntu** (Windows can't run EAS
local builds directly).

## Quick build (after setup is done)

From a **WSL Ubuntu** terminal:

```bash
bash ~/nuru-build/scripts/local-build.sh            # production .aab
bash ~/nuru-build/scripts/local-build.sh preview    # preview profile
```

Or from Windows Git Bash (note the path-conversion guard):

```bash
MSYS_NO_PATHCONV=1 wsl -d Ubuntu -- bash -ic 'bash ~/nuru-build/scripts/local-build.sh'
```

The script re-syncs the latest `apps/nuru` source from the Windows repo, ensures
deps + a git repo (EAS requires one), builds, and writes `nuru-production.aab`.
Copy it out with:

```bash
cp ~/nuru-build/nuru-production.aab /mnt/c/Users/busie/Desktop/
```

## Signing

Handled automatically. `eas build --local` pulls the **same upload keystore**
EAS stored for the cloud builds (`Build Credentials mlKnD0_AzD`), so local and
cloud `.aab`s are signed identically. Nothing to manage locally. Google Play App
Signing holds the real distribution key.

## One-time setup (already done on this machine)

Recorded here so it's reproducible. All inside WSL Ubuntu, in `$HOME`:

1. **JDK 17** (`sudo apt-get install openjdk-17-jdk-headless unzip`) —
   `JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64`.
2. **Node via nvm** — the distro `node` had no working npm and PATH fell through
   to the Windows npm.exe (broken `${APPDATA}\npm` prefix). Fixed by installing
   `nvm` + `nvm install 22`, giving a real Linux node+npm.
3. **eas-cli** — `npm i -g eas-cli` (with the nvm node).
4. **Android SDK** — cmdline-tools unzipped to `~/android-sdk`, then
   `sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"`.
   `ANDROID_HOME=$HOME/android-sdk`. The NDK is pulled by EAS on first build.
5. **Auth** — `export EXPO_TOKEN=<token>` in `~/.bashrc` (from
   https://expo.dev/settings/access-tokens). Non-interactive; `eas login` hangs
   in WSL, so a token is used instead.
6. **Source** — `apps/nuru` is rsynced into `~/nuru-build` (WSL native fs, not
   `/mnt/c`, for build speed). `local-build.sh` re-syncs on each run.

## OTA updates (push JS/asset fixes without a rebuild)

EAS Update is configured: each build profile has a `channel` in `eas.json` and
`expo-updates` reads `updates.url` at runtime. A build subscribes to its
channel; publishing to that channel's branch delivers the update on next app
launch.

**Only works for builds made AFTER the channel was added** (commit 0a2fd8f).
Rebuild once so the installed app is OTA-enabled; after that, JS/asset changes
ship over the air.

Publish an update (from WSL, after syncing latest source):

```bash
cd ~/nuru-build
eas update --branch production --message "fix: <what changed>"
```

- **JS + assets** (components, screens, theme, images) → ship via OTA, no rebuild.
- **Native changes** (new native package, permissions, app.json native config,
  version bump) → still need `local-build.sh`. `runtimeVersion=appVersion` means
  an OTA update only reaches builds of the *same* app version, so bump the
  version when you make native changes and rebuild.

The app pulls the update on the next cold start (or configure
`checkAutomatically`/`fetchUpdateAsync` for finer control).

## Gotchas

- **Git Bash mangles WSL paths.** Prefix cross-shell `wsl` calls with
  `MSYS_NO_PATHCONV=1` or `~`/`$HOME` args get rewritten to `C:/...`.
- **`eas login` hangs in WSL** — use `EXPO_TOKEN` instead (already set up).
- **EAS requires a git repo** in the build dir — the script `git init`s it.
- First build is slow (Gradle cold + NDK download). Later builds are much faster.
