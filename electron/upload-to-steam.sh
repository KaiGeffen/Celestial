#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STEAM_APP_ID="$(node -p "require('$SCRIPT_DIR/../shared/steam.json').steamAppId")"

CONTENT_DIR=~/Downloads/sdk/tools/ContentBuilder/content
SCRIPTS_DIR=~/Downloads/sdk/tools/ContentBuilder/scripts
DIST_DIR=~/Celestial/electron-dist
STEAMCMD=~/Steam/steamcmd.sh

echo "Copying build files..."
cp -r "$DIST_DIR/mac/" "$CONTENT_DIR/mac/"
cp -r "$DIST_DIR/win-unpacked/" "$CONTENT_DIR/win/"
cp -r "$DIST_DIR/linux-unpacked/" "$CONTENT_DIR/linux/"

echo "Uploading Steam build (app $STEAM_APP_ID)..."
"$STEAMCMD" +login kivaent +run_app_build "$SCRIPTS_DIR/app_build_${STEAM_APP_ID}.vdf" +quit

echo "All platforms uploaded."
