#!/bin/bash
set -e

REGISTRY="192.168.1.74:30500"
IMAGE_NAME="apartment-oat"
DEPLOYMENT_DIR="deployment"

# Check if image tag is provided
if [ -z "$1" ]; then
    echo "❌ Error: Image tag required"
    echo ""
    echo "Usage: $0 <image-tag>"
    echo ""
    echo "Example:"
    echo "   $0 a6f12cb-20260921-034805"
    echo ""
    echo "💡 Tip: Run ./build-and-push.sh first to build and push a new image"
    exit 1
fi

IMAGE_TAG="$1"
IMAGE_FULL="${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"

echo "🚀 Deploying Apartment-Oat to K3s"
echo "   Image: ${IMAGE_FULL}"
echo ""

# Check if deployment directory exists
if [ ! -d "${DEPLOYMENT_DIR}" ]; then
    echo "❌ Error: ${DEPLOYMENT_DIR}/ directory not found"
    exit 1
fi

# Create temporary deployment file with replaced image tag
TEMP_DEPLOYMENT=$(mktemp)
trap "rm -f ${TEMP_DEPLOYMENT}" EXIT

echo "📝 Replacing image tag in deployment..."
sed "s|IMAGE_TAG_PLACEHOLDER|${IMAGE_TAG}|g" \
    ${DEPLOYMENT_DIR}/04-deployment.yaml > ${TEMP_DEPLOYMENT}

# Apply all manifests in order
echo "📦 Applying Kubernetes manifests..."
echo ""

for file in ${DEPLOYMENT_DIR}/*.yaml; do
    filename=$(basename "$file")
    
    # Use temporary file for deployment, original for others
    if [ "$filename" = "04-deployment.yaml" ]; then
        echo "   ✓ Applying ${filename} (with image: ${IMAGE_TAG})"
        kubectl apply -f ${TEMP_DEPLOYMENT}
    else
        echo "   ✓ Applying ${filename}"
        kubectl apply -f "$file"
    fi
done

echo ""
echo "⏳ Waiting for rollout to complete..."
kubectl rollout status deployment/apartment-oat-app -n apartment-oat --timeout=300s

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Current status:"
kubectl get pods -n apartment-oat -o wide

echo ""
echo "🔍 To check logs:"
echo "   kubectl logs -n apartment-oat -l app=apartment-oat --tail=50 -f"
echo ""
echo "🌐 Application URL:"
echo "   https://apartments.daiyooo.com"
