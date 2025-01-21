#!/bin/bash

# Enable debugging and exit on errors
set -e
set -o pipefail
set -x

# Define variables
USER_HOME="/Users/$USER"
DESKTOP_DIR="$USER_HOME/Desktop"
EXAM_DIR="$DESKTOP_DIR/exam"
VOLUME_NAME="isourceit_isourceit-data"
ISOURCEIT_DIR="$USER_HOME/isourceit"
BACKUP_TAR="$EXAM_DIR/isourceit-data.tar"
COMPRESSED_FOLDER="$EXAM_DIR/isourceitfolder.tar.gz"

# Step 1: Stop and remove previous isourceit containers
echo "Stopping and removing previous isourceit containers..."
docker ps --filter "name=isourceit" -q | xargs -r docker stop || echo "No containers to stop."
docker ps -a --filter "name=isourceit" -q | xargs -r docker rm -f || echo "No containers to remove."

# Step 2: Delete or clone the old volume
if docker volume ls | grep -q "$VOLUME_NAME"; then
  echo "Removing old volume $VOLUME_NAME..."
  docker volume rm "$VOLUME_NAME"
else
  echo "Volume $VOLUME_NAME does not exist. Skipping removal."
fi

# Step 3: Create a new volume
echo "Creating new volume $VOLUME_NAME..."
docker volume create "$VOLUME_NAME"

# Step 4: Import data into the new volume
echo "Importing data into the new volume..."
if [ -f "$BACKUP_TAR" ]; then
  cd "$EXAM_DIR"
  docker run --rm -v "$VOLUME_NAME:/data" -v "$(pwd):/backup" alpine tar xvf /backup/isourceit-data.tar -C / || {
    echo "Error: Failed to extract data to the volume."
    exit 1
  }
else
  echo "Error: File $BACKUP_TAR not found. Ensure the file exists in $EXAM_DIR and try again."
  exit 1
fi

# Step 5: Delete the old folder that contains logs and server volume
if [ -d "$ISOURCEIT_DIR" ]; then
  echo "Deleting old isourceit folder..."
  rm -rf "$ISOURCEIT_DIR"
else
  echo "No existing isourceit folder found. Skipping deletion."
fi

# Step 6: Decompress the folder containing logs and server volume
echo "Decompressing isourceit folder from $COMPRESSED_FOLDER..."
if [ -f "$COMPRESSED_FOLDER" ]; then
  tar -xvzf "$COMPRESSED_FOLDER" -C "$USER_HOME" || {
    echo "Error: Failed to decompress $COMPRESSED_FOLDER."
    exit 1
  }
else
  echo "Error: File $COMPRESSED_FOLDER not found. Ensure the file exists in $EXAM_DIR and try again."
  exit 1
fi

# Step 7: Run containers with Docker Compose
if [ -d "$ISOURCEIT_DIR" ]; then
  echo "Starting containers with Docker Compose..."
  cd "$ISOURCEIT_DIR"
  docker compose --profile server --profile proxy up -d || {
    echo "Error: Failed to start Docker Compose containers."
    exit 1
  }
  echo "Containers started successfully!"
else
  echo "Error: Folder $ISOURCEIT_DIR not found. Ensure the decompression step succeeded."
  exit 1
fi

echo "Import process completed successfully!"