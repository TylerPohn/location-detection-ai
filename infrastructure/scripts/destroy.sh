#!/bin/bash
set -e

read -p "Are you sure you want to destroy all infrastructure? (yes/no) " -n 3 -r
echo
if [[ ! $REPLY =~ ^yes$ ]]; then
  echo "Cancelled."
  exit 1
fi

# Source environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

echo "Destroying infrastructure..."
npm run destroy -- --force

echo "Infrastructure destroyed."
