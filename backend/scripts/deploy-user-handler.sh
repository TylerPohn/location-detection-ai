#!/bin/bash
set -e

echo "Building UserHandler Lambda for Linux x86_64 using Docker..."

# Navigate to the user-handler directory
cd "$(dirname "$0")/../src/lambdas/user-handler"

# Create a temporary build directory
BUILD_DIR=$(mktemp -d)
echo "Build directory: $BUILD_DIR"

# Copy source files to build directory
cp -r . "$BUILD_DIR/"

# Create tsconfig.json if it doesn't exist
if [ ! -f "$BUILD_DIR/tsconfig.json" ]; then
  echo "Creating tsconfig.json..."
  cat > "$BUILD_DIR/tsconfig.json" <<EOF
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["*.ts"],
  "exclude": ["node_modules"]
}
EOF
fi

# Build using Docker with Linux platform
echo "Installing dependencies and compiling TypeScript in Docker..."
docker run --rm \
  --platform linux/amd64 \
  -v "$BUILD_DIR:/build" \
  -w /build \
  node:18-alpine \
  sh -c "npm install && npm run build && npm install --omit=dev && npm prune --production"

# Create deployment package (zip from INSIDE the build directory)
echo "Creating deployment package..."
cd "$BUILD_DIR"
zip -r /tmp/user-handler-function.zip . -x "*.git*" -x "*.DS_Store" -x "node_modules/.cache/*"

echo "Deployment package created: /tmp/user-handler-function.zip"
echo "Package size: $(du -h /tmp/user-handler-function.zip | cut -f1)"

# Verify the structure
echo ""
echo "Verifying package structure..."
unzip -l /tmp/user-handler-function.zip | head -20

# Cleanup
rm -rf "$BUILD_DIR"

echo ""
echo "Package is ready for deployment!"
