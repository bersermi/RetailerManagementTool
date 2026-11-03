#!/bin/sh
# ============================================================================
# RUNS ON EAS ONLY, BEFORE ANYTHING INSTALLS (`eas-build-pre-install` in
# package.json). Plan tasks `10.2a` and `10.4g-i`. ⚠️ Its twin in `itacate/`
# refuses no iPhone build: Itacate carries no iPhone key yet — change both when
# it does (`10.5-iv`).
#
# 1. Copies the Firebase file EAS holds (`GOOGLE_SERVICES_JSON`, a file
#    variable) next to `app.config.ts`, which tells prebuild to use it.
# 2. Refuses an Android STORE build without it or without the Android map key,
#    and an iPhone STORE build without the iPhone map key (`10.4g-i`: Google's
#    map on both phones). A store build is installed by people and kept for
#    months; a key it was made without cannot be added over the air, only by a
#    new build through review. A `preview` build is let through, with an empty
#    map, no search and no push.
# ============================================================================
set -eu

if [ -n "${GOOGLE_SERVICES_JSON:-}" ]; then
  cp "$GOOGLE_SERVICES_JSON" google-services.json
  echo "google-services.json: copied from EAS's environment"
fi

if [ "${EAS_BUILD_PROFILE:-}" = "production" ] && [ "${EAS_BUILD_PLATFORM:-}" = "android" ]; then
  if [ ! -f google-services.json ]; then
    echo "REFUSED: an Android store build without google-services.json — push would never work on it." >&2
    echo "Set the file variable GOOGLE_SERVICES_JSON in EAS's production environment (plan 10.2b)." >&2
    exit 1
  fi
  if [ -z "${GOOGLE_MAPS_ANDROID_API_KEY:-}" ]; then
    echo "REFUSED: an Android store build without GOOGLE_MAPS_ANDROID_API_KEY — every map would be empty." >&2
    echo "Set it in EAS's production environment (plan 10.2b)." >&2
    exit 1
  fi
fi

if [ "${EAS_BUILD_PROFILE:-}" = "production" ] && [ "${EAS_BUILD_PLATFORM:-}" = "ios" ]; then
  if [ -z "${GOOGLE_MAPS_IOS_API_KEY:-}" ]; then
    echo "REFUSED: an iPhone store build without GOOGLE_MAPS_IOS_API_KEY — its map would be empty and its search off." >&2
    echo "Set it in EAS's production environment (the handbook's Google's search for Wera Cocina)." >&2
    exit 1
  fi
fi
