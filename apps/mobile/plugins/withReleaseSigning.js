// Local Expo config plugin: wire a RELEASE signingConfig into the generated
// android/app/build.gradle so CI can sign the AAB with our upload keystore.
//
// Expo's prebuild template signs `release` with the DEBUG keystore by default,
// which Play rejects. This plugin rewrites the release buildType to use a
// `release` signingConfig whose values come from Gradle properties (passed as
// -P flags / gradle.properties in CI). Locally / on EAS those properties are
// absent and the block falls back to the debug keystore, so `expo run:android`
// and EAS builds keep working unchanged.
const { withAppBuildGradle } = require('@expo/config-plugins')

const SIGNING_CONFIG = `
        release {
            if (project.hasProperty('MYAPP_UPLOAD_STORE_FILE')) {
                storeFile file(MYAPP_UPLOAD_STORE_FILE)
                storePassword MYAPP_UPLOAD_STORE_PASSWORD
                keyAlias MYAPP_UPLOAD_KEY_ALIAS
                keyPassword MYAPP_UPLOAD_KEY_PASSWORD
            }
        }`

function addReleaseSigningConfig(gradle) {
  // Insert a `release { ... }` entry inside the existing signingConfigs block,
  // right after the `debug { ... }` entry the template always emits.
  if (gradle.includes('MYAPP_UPLOAD_STORE_FILE')) return gradle // idempotent
  const anchor = gradle.match(/signingConfigs\s*{\s*debug\s*{[^}]*}/)
  if (!anchor) {
    throw new Error('[withReleaseSigning] could not find signingConfigs.debug anchor')
  }
  return gradle.replace(anchor[0], `${anchor[0]}${SIGNING_CONFIG}`)
}

function useReleaseSigningForReleaseBuildType(gradle) {
  // Point the release buildType at signingConfigs.release ONLY when the upload
  // properties are present; otherwise keep the template's debug signing so local
  // builds still work without secrets.
  return gradle.replace(
    /buildTypes\s*{([\s\S]*?)release\s*{([\s\S]*?)signingConfig signingConfigs\.debug/m,
    (match) =>
      match.replace(
        'signingConfig signingConfigs.debug',
        "signingConfig project.hasProperty('MYAPP_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug",
      ),
  )
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error('[withReleaseSigning] expected groovy build.gradle')
    }
    let gradle = cfg.modResults.contents
    gradle = addReleaseSigningConfig(gradle)
    gradle = useReleaseSigningForReleaseBuildType(gradle)
    cfg.modResults.contents = gradle
    return cfg
  })
}
