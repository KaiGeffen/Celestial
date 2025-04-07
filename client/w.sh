#!/bin/bash
 # Translates all image files in within assets folder into webp format

# Script to recursively convert all image files to WebP format
# Usage: ./convert-to-webp.sh [cwebp parameters]

# Default parameters for cwebp
DEFAULT_PARAMS="-m 6 -q 70 -mt -af -progress"

# Use provided parameters or defaults
PARAMS=${@:-$DEFAULT_PARAMS}

# Enable extended globbing
shopt -s nullglob nocaseglob extglob

# Function to process a directory
process_directory() {
    local dir="$1"
    
    # Process all image files in current directory
    for file in "$dir"/*.@(jpg|jpeg|tif|tiff|png|gif|bmp); do
        if [ -f "$file" ]; then
            echo "Converting: $file"
            cwebp $PARAMS "$file" -o "${file%.*}".webp
            if [ $? -eq 0 ]; then
                echo "Successfully converted: $file"
                rm "$file"
            else
                echo "Failed to convert: $file"
            fi
        fi
    done
    
    # Recursively process subdirectories
    for subdir in "$dir"/*/; do
        if [ -d "$subdir" ]; then
            process_directory "$subdir"
        fi
    done
}

# Check if cwebp is installed
if ! command -v cwebp &> /dev/null; then
    echo "Error: cwebp is not installed. Please install it first."
    echo "On macOS: brew install webp"
    echo "On Ubuntu/Debian: sudo apt-get install webp"
    exit 1
fi

# Start processing from the assets directory
if [ -d "./assets" ]; then
    echo "Starting conversion process..."
    process_directory "./assets"
    echo "Conversion complete!"
else
    echo "Error: assets directory not found!"
    exit 1
fi
