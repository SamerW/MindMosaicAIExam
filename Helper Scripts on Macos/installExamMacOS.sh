#!/bin/bash

# Function to print error message and exit with error code
function error_exit {
  echo "[ERROR] $1" >&2
  exit 1
}

# Function to check if a command exists
function command_exists {
  command -v "$1" >/dev/null 2>&1
}

# Function to show a dynamic progress bar based on percentage
function show_progress_dynamic {
  local percent=$1
  printf "\r[%-50s] %d%%" $(printf '#%.0s' $(seq 1 $((percent / 2)))) "$percent"
}

# Detect macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
  error_exit "This script is intended for macOS."
fi

# Announce the start of the installation process
echo "Starting the installation process for Homebrew, Docker, and Ollama. Please wait..."

# Check if Homebrew is installed
if command_exists brew; then
  echo "Homebrew is already installed."
else
  echo "Homebrew is not installed. Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" || error_exit "Failed to install Homebrew."
  echo "Homebrew installed successfully."
fi

# Check if Docker is installed
if command_exists docker; then
  echo "Docker is already installed."
else
  echo "Docker is not installed. Installing Docker Desktop..."
  brew install --cask docker || error_exit "Failed to install Docker Desktop."
  echo "Docker Desktop installed successfully. Please start Docker manually if it's not running."
fi

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
  error_exit "Docker is not running. Please start Docker Desktop."
fi

# Check if Ollama is installed
if command_exists ollama; then
  echo "Ollama is already installed."
else
  echo "Ollama is not installed. Installing Ollama..."
  brew install --cask ollama || error_exit "Failed to install Ollama."
  echo "Ollama installed successfully."
fi

# Set OLLAMA_HOST environment variable
echo "Setting OLLAMA_HOST environment variable..."
launchctl setenv OLLAMA_HOST "0.0.0.0" || error_exit "Failed to set OLLAMA_HOST environment variable."
echo "OLLAMA_HOST set to 0.0.0.0 successfully."

# Validate models
MODELS=($@)
if [ ${#MODELS[@]} -eq 0 ]; then
  echo "No models specified for installation."
else
  for MODEL in "${MODELS[@]}"; do
    echo "Installing model '$MODEL'..."
    ollama run "$MODEL" "Test message" 2>&1 | while read -r line; do
      # Extract progress percentage from output (assuming JSON or similar structured output)
      if [[ $line =~ \"progress\"\:\ ([0-9]+) ]]; then
        percent="${BASH_REMATCH[1]}"
        show_progress_dynamic "$percent"
      fi
    done || error_exit "Failed to install model '$MODEL'. Ensure the model name is correct."
    echo -e "\nModel '$MODEL' is available and ready for use."
  done
fi

# Create the Docker network if it doesn't exist
NETWORK_NAME="isourceit-net"
if ! docker network inspect "$NETWORK_NAME" >/dev/null 2>&1; then
  echo "Docker network '$NETWORK_NAME' does not exist. Creating it..."
  docker network create "$NETWORK_NAME" || error_exit "Failed to create Docker network '$NETWORK_NAME'."
  echo "Docker network '$NETWORK_NAME' created successfully."
else
  echo "Docker network '$NETWORK_NAME' already exists. Skipping creation."
fi

# Clone the GitHub repository
REPO_URL="https://github.com/SamerW/MindMosaicAIExam/MindMosaicAIExam.git"
BRANCH="main"
CLONE_DIR="MindMosaicAIExam"

# Check if the current directory is inside the isourceit directory
if [[ "$(pwd)" == *"/$CLONE_DIR"* ]]; then
  echo "The current directory is inside '$CLONE_DIR'. Changing directory one step up..."
  cd .. || error_exit "Failed to change directory to the parent directory."
  echo "Changed to parent directory: $(pwd)"
fi

# Remove the isourceit directory if it exists
if [ -d "$CLONE_DIR" ]; then
  echo "The directory '$CLONE_DIR' already exists. Removing it..."
  rm -rf "$CLONE_DIR" || error_exit "Failed to remove the existing '$CLONE_DIR' directory."
  echo "Directory '$CLONE_DIR' removed successfully."
fi

# Clone the repository
echo "Cloning repository from branch '$BRANCH'..."
git clone --branch "$BRANCH" "$REPO_URL" "$CLONE_DIR" || error_exit "Failed to clone repository."
echo "Repository cloned successfully."

# Change to the cloned repository directory
cd "$CLONE_DIR" || error_exit "Failed to change directory to '$CLONE_DIR'."

# Pull the required Python Docker image
PYTHON_IMAGE="python:3.11"
if ! docker image inspect "$PYTHON_IMAGE" >/dev/null 2>&1; then
  echo "Pulling Python Docker image ($PYTHON_IMAGE)..."
  docker pull "$PYTHON_IMAGE" || error_exit "Failed to pull Python Docker image."
  echo "Python Docker image pulled successfully."
else
  echo "Python Docker image ($PYTHON_IMAGE) already exists locally."
fi

# Check for existing containers, images, and volumes
ISOURCEIT_IMAGE=$(docker images -q isourceit-server)
ISOURCEIT_VOLUME=$(docker volume ls -q --filter "name=isourceit_isourceit-data")

# Find all containers by image names
HTTPD_CONTAINERS=$(docker ps -aq --filter "ancestor=httpd:2.4")
ISOURCEIT_SERVER_CONTAINERS=$(docker ps -aq --filter "ancestor=isourceit-server")
MONGO_CONTAINERS=$(docker ps -aq --filter "ancestor=mongo:6.0")
REDIS_CONTAINERS=$(docker ps -aq --filter "ancestor=redis:7")

# Find all corresponding images
MONGO_IMAGE=$(docker images -q mongo)
REDIS_IMAGE=$(docker images -q redis)
HTTPD_IMAGE=$(docker images -q httpd)

if [ -n "$ISOURCEIT_IMAGE" ] || [ -n "$ISOURCEIT_VOLUME" ] || [ -n "$MONGO_IMAGE" ] || [ -n "$REDIS_IMAGE" ] || [ -n "$HTTPD_IMAGE" ]; then
  echo "An existing isourceIt containers, images, data volume, or related images (mongo, redis, httpd) were found."
  echo "Do you want to stop the containers, delete the images, and remove the 'isourceit-data' volume? (yes/no)"
  read -r RESPONSE
  if [[ "$RESPONSE" == "yes" ]]; then
    # Stop and remove the iSourceIt container
    if [ -n "$ISOURCEIT_CONTAINER" ]; then
      echo "Stopping and removing the iSourceIt container..."
      docker stop "$ISOURCEIT_CONTAINER" && docker rm "$ISOURCEIT_CONTAINER"
    fi

    # Stop and remove all containers associated with httpd, isourceit-server, mongo, and redis
    for CONTAINER in $HTTPD_CONTAINERS $ISOURCEIT_SERVER_CONTAINERS $MONGO_CONTAINERS $REDIS_CONTAINERS; do
      if [ -n "$CONTAINER" ]; then
        echo "Stopping and removing container: $CONTAINER..."
        docker stop "$CONTAINER" && docker rm "$CONTAINER"
      fi
    done

    # Remove the iSourceIt image
    if [ -n "$ISOURCEIT_IMAGE" ]; then
      echo "Removing the iSourceIt image..."
      docker rmi "$ISOURCEIT_IMAGE"
    fi

    # Remove the Mongo image
    if [ -n "$MONGO_IMAGE" ]; then
      echo "Removing the Mongo image..."
      docker rmi "$MONGO_IMAGE"
    fi

    # Remove the Redis image
    if [ -n "$REDIS_IMAGE" ]; then
      echo "Removing the Redis image..."
      docker rmi "$REDIS_IMAGE"
    fi

    # Remove the HTTPD image
    if [ -n "$HTTPD_IMAGE" ]; then
      echo "Removing the HTTPD image..."
      docker rmi "$HTTPD_IMAGE"
    fi

    # Remove the iSourceIt data volume
    if [ -n "$ISOURCEIT_VOLUME" ]; then
      echo "Removing the 'isourceit-data' volume..."
      docker volume rm "$ISOURCEIT_VOLUME"
    fi
  else
    echo "Skipping container, image, and volume cleanup. Proceeding with the existing setup."
  fi
fi

# Execute Docker Compose commands
echo "Running Docker Compose commands..."
docker compose --profile front-builder run --rm npm || error_exit "Failed to run front-builder profile."
echo -e "\n\n Enter your sudo password..."
sudo docker compose --profile server --profile proxy build || error_exit "Failed to build server and proxy profiles."
docker compose --profile server --profile proxy up -d || error_exit "Failed to start server and proxy profiles."

# Prompt the user for admin credentials
echo "Please enter the admin username you want to set:"
read -r ADMIN_USERNAME
echo "Please enter the admin password you want to set:"
read -r -s ADMIN_PASSWORD

# Create admin user
echo "Creating admin user..."
docker compose --profile server exec server python create-user.py -p "$ADMIN_PASSWORD" "$ADMIN_USERNAME" || error_exit "Failed to create admin user."

# Open the default browser to the specified address
echo "Opening the default browser to the administrative exams page..."
open "http://localhost:8888/isourceit/administrative/exams" || error_exit "Failed to open the browser."

echo "All requested installations are complete."
