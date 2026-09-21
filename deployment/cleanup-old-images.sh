#!/bin/bash
# Cleanup old image tags from registry, keeping only the N most recent versions

set -e

REGISTRY="192.168.1.74:30500"
IMAGE_NAME="apartment-oat"
KEEP_LAST=5  # Keep only the last 5 versions

echo "🔍 Fetching all tags for ${IMAGE_NAME}..."

# Get all tags from registry
TAGS=$(curl -s http://${REGISTRY}/v2/${IMAGE_NAME}/tags/list | jq -r '.tags[]' | grep -v "latest" || echo "")

if [ -z "$TAGS" ]; then
    echo "No tags found (except 'latest')"
    exit 0
fi

# Count total tags
TOTAL=$(echo "$TAGS" | wc -l)
echo "Found ${TOTAL} version tags"

# Sort tags by timestamp (format: hash-YYYYMMDD-HHMMSS)
SORTED_TAGS=$(echo "$TAGS" | sort -t'-' -k2,3 -r)

# Calculate how many to delete
TO_DELETE=$((TOTAL - KEEP_LAST))

if [ $TO_DELETE -le 0 ]; then
    echo "✅ Nothing to delete (keeping last ${KEEP_LAST}, found ${TOTAL})"
    exit 0
fi

echo "🗑️  Deleting ${TO_DELETE} old tags (keeping last ${KEEP_LAST})..."

# Get tags to delete (skip the first KEEP_LAST)
DELETE_TAGS=$(echo "$SORTED_TAGS" | tail -n +$((KEEP_LAST + 1)))

echo "Tags to delete:"
echo "$DELETE_TAGS"
echo ""

# Delete each old tag
for TAG in $DELETE_TAGS; do
    echo "Deleting ${IMAGE_NAME}:${TAG}..."
    
    # Get manifest digest
    DIGEST=$(curl -s -H "Accept: application/vnd.docker.distribution.manifest.v2+json" \
        http://${REGISTRY}/v2/${IMAGE_NAME}/manifests/${TAG} | jq -r '.config.digest')
    
    if [ "$DIGEST" != "null" ] && [ -n "$DIGEST" ]; then
        # Delete by digest
        curl -s -X DELETE http://${REGISTRY}/v2/${IMAGE_NAME}/manifests/${DIGEST} > /dev/null
        echo "  ✓ Deleted ${TAG}"
    else
        echo "  ⚠️  Could not get digest for ${TAG}, skipping"
    fi
done

echo ""
echo "✅ Cleanup complete!"
echo "Remaining tags:"
echo "$SORTED_TAGS" | head -n ${KEEP_LAST}
