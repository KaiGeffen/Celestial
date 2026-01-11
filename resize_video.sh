#!/bin/bash

# Script to reduce video file size using ffmpeg
# Usage: ./resize_video.sh input.mp4 [output.mp4]
# Example: ./resize_video.sh video.mp4 video_smaller.mp4

# Check if ffmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "Error: ffmpeg is not installed. Install it with: brew install ffmpeg"
    exit 1
fi

# Check if input file is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <input_video> [output_video]"
    echo "Example: $0 video.mp4 video_smaller.mp4"
    echo ""
    echo "This script reduces video file size by:"
    echo "  - Scaling down to max 1280x720 (preserves aspect ratio)"
    echo "  - Using higher compression (CRF 28)"
    echo "  - Re-encoding audio at lower bitrate (128k)"
    exit 1
fi

INPUT_FILE="$1"

# Check if input file exists
if [ ! -f "$INPUT_FILE" ]; then
    echo "Error: Input file '$INPUT_FILE' not found"
    exit 1
fi

# Determine output filename
if [ -z "$2" ]; then
    # No output specified, create default name
    FILENAME=$(basename "$INPUT_FILE" | sed 's/\.[^.]*$//')
    EXTENSION="${INPUT_FILE##*.}"
    OUTPUT_FILE="${FILENAME}_smaller.${EXTENSION}"
else
    OUTPUT_FILE="$2"
fi

# Get original file size for comparison
INPUT_SIZE_BYTES=$(stat -f%z "$INPUT_FILE" 2>/dev/null || stat -c%s "$INPUT_FILE" 2>/dev/null)
INPUT_SIZE=$(du -h "$INPUT_FILE" | cut -f1)

echo "Reducing video file size..."
echo "Input:  $INPUT_FILE ($INPUT_SIZE)"
echo "Output: $OUTPUT_FILE"
echo ""

# Run ffmpeg with aggressive compression settings
# - Scale to max 1280x720 while preserving aspect ratio (no padding)
# - CRF 28 = higher compression, lower quality but much smaller files
# - Preset fast = faster encoding
# - Audio re-encoded at 128k for smaller size
ffmpeg -i "$INPUT_FILE" \
    -vf "scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease" \
    -c:v libx264 \
    -crf 28 \
    -preset fast \
    -c:a aac \
    -b:a 128k \
    -movflags +faststart \
    "$OUTPUT_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Success! Compressed video saved to: $OUTPUT_FILE"
    
    # Show file sizes and compression ratio
    OUTPUT_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
    OUTPUT_SIZE_BYTES=$(stat -f%z "$OUTPUT_FILE" 2>/dev/null || stat -c%s "$OUTPUT_FILE" 2>/dev/null)
    
    if [ -n "$INPUT_SIZE_BYTES" ] && [ -n "$OUTPUT_SIZE_BYTES" ] && [ "$INPUT_SIZE_BYTES" -gt 0 ]; then
        RATIO=$(echo "scale=1; $OUTPUT_SIZE_BYTES * 100 / $INPUT_SIZE_BYTES" | bc)
        REDUCTION=$(echo "scale=1; 100 - $RATIO" | bc)
        echo "Original size: $INPUT_SIZE"
        echo "New size:      $OUTPUT_SIZE"
        echo "Reduction:     ${REDUCTION}%"
    else
        echo "Original size: $INPUT_SIZE"
        echo "New size:      $OUTPUT_SIZE"
    fi
else
    echo ""
    echo "✗ Error: Failed to compress video"
    exit 1
fi
