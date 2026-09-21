#!/bin/bash
set -e

REGISTRY="192.168.1.74:30500"
IMAGE_NAME="apartment-oat"

# Generate version tag from git commit hash + timestamp
GIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "dev")
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
TAG="${GIT_HASH}-${TIMESTAMP}"

echo "🔨 Building apartment-app service..."
docker compose build apartment-app

echo "🏷️  Tagging images..."
# Tag with specific version
docker tag ${IMAGE_NAME}:latest ${REGISTRY}/${IMAGE_NAME}:${TAG}
# Tag with latest
docker tag ${IMAGE_NAME}:latest ${REGISTRY}/${IMAGE_NAME}:latest

echo "📤 Pushing to registry ${REGISTRY}..."
docker push ${REGISTRY}/${IMAGE_NAME}:${TAG}
docker push ${REGISTRY}/${IMAGE_NAME}:latest

echo "🧹 Cleaning up local tagged images..."
docker rmi ${REGISTRY}/${IMAGE_NAME}:${TAG}
docker rmi ${REGISTRY}/${IMAGE_NAME}:latest

# Save tag for deployment
echo "${TAG}" > "$(dirname "$0")/.latest-tag"

echo ""
echo "✅ Done! Images pushed:"
echo "   ${REGISTRY}/${IMAGE_NAME}:${TAG}"
echo "   ${REGISTRY}/${IMAGE_NAME}:latest"
echo ""
echo "💾 Tag saved to .latest-tag: ${TAG}"
echo ""
echo "🚀 To deploy to K3s:"
echo "   ./deploy.sh ${TAG}"
echo ""
echo "💡 To cleanup old images from registry:"
echo "   ./cleanup-old-images.sh"
