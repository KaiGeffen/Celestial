#!/bin/bash
set -e

CONTENT_DIR=~/Downloads/sdk/tools/ContentBuilder/content
SCRIPTS_DIR=~/Downloads/sdk/tools/ContentBuilder/scripts
DIST_DIR=~/Celestial/electron-dist
STEAMCMD=~/Steam/steamcmd.sh

echo "Copying build files..."
cp -r "$DIST_DIR/mac/" "$CONTENT_DIR/mac/"
cp -r "$DIST_DIR/win-unpacked/" "$CONTENT_DIR/win/"
cp -r "$DIST_DIR/linux-unpacked/" "$CONTENT_DIR/linux/"

echo "Uploading all platforms..."
"$STEAMCMD" +login kivaent +run_app_build "$SCRIPTS_DIR/app_build_3810590.vdf" +quit

echo "All platforms uploaded."
