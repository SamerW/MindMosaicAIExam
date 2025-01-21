#!/bin/bash

# Ensure the script exits on error
set -e

# Define variables
USER_HOME="/Users/$USER"
ISOURCEIT_DIR="$USER_HOME/isourceit"
DESKTOP_DIR="$USER_HOME/Desktop"
EXAM_DIR="$DESKTOP_DIR/exam"
VOLUME_NAME="isourceit_isourceit-data"
BACKUP_TAR="isourceit-data.tar"
COMPRESSED_FOLDER="isourceitfolder.tar.gz"

# Step 1: Navigate to the isourceit directory
cd "$ISOURCEIT_DIR"

# Step 2: Export the volume
docker run --rm -v $VOLUME_NAME:/data -v $(pwd):/backup alpine tar cvf "/backup/$BACKUP_TAR" /data

# Step 3: Create a directory named 'exam' on the desktop
mkdir -p "$EXAM_DIR"

# Step 4: Move the exported volume tar to the 'exam' directory
mv "$BACKUP_TAR" "$EXAM_DIR"

# Step 5: Navigate to the parent directory
cd ..

# Step 6: Compress the isourceit folder
tar -czf "$COMPRESSED_FOLDER" "$(basename $ISOURCEIT_DIR)"

# Step 7: Move the compressed folder to the 'exam' directory
mv "$COMPRESSED_FOLDER" "$EXAM_DIR"

# Step 8: Compress the 'exam' folder
cd "$DESKTOP_DIR"
zip -r exam.zip "exam"

# Step 9: Display the output location
echo "The 'exam.zip' file has been created at $DESKTOP_DIR/exam.zip"
