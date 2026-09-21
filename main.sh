#!/bin/bash
# Main deployment script for Apartment-Oat
# Usage: ./main.sh [build|deploy|cleanup|all]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOYMENT_DIR="${SCRIPT_DIR}/deployment"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

function print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

function print_step() {
    echo -e "${GREEN}▶ $1${NC}"
}

function print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

function print_error() {
    echo -e "${RED}✗ $1${NC}"
}

function step_build() {
    print_header "Step 1: Build and Push Image"
    cd "${SCRIPT_DIR}"
    "${DEPLOYMENT_DIR}/build-and-push.sh"
    
    # Read the tag saved by build-and-push.sh
    LATEST_TAG=$(cat "${DEPLOYMENT_DIR}/.latest-tag")
    echo ""
    print_info "Image tag: ${LATEST_TAG}"
    echo ""
}

function step_deploy() {
    print_header "Step 2: Deploy to K3s"
    
    if [ ! -f "${DEPLOYMENT_DIR}/.latest-tag" ]; then
        print_error "No image tag found. Run 'build' first."
        exit 1
    fi
    
    LATEST_TAG=$(cat "${DEPLOYMENT_DIR}/.latest-tag")
    print_info "Deploying image tag: ${LATEST_TAG}"
    echo ""
    
    cd "${SCRIPT_DIR}"
    "${DEPLOYMENT_DIR}/deploy.sh" "${LATEST_TAG}"
    echo ""
}

function step_cleanup() {
    print_header "Step 3: Cleanup Old Images"
    cd "${SCRIPT_DIR}"
    "${DEPLOYMENT_DIR}/cleanup-old-images.sh"
    echo ""
}

function step_all() {
    print_header "Apartment-Oat Full Deployment"
    echo ""
    
    step_build
    step_deploy
    
    echo ""
    print_step "Deployment complete!"
    echo ""
    print_info "Do you want to cleanup old images? (y/N)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        step_cleanup
    else
        print_info "Skipping cleanup. You can run './main.sh cleanup' later."
    fi
    
    echo ""
    print_header "Summary"
    echo -e "${GREEN}✓${NC} Build and push: Done"
    echo -e "${GREEN}✓${NC} Deploy to K3s: Done"
    echo ""
    echo -e "${BLUE}🌐 Application URL:${NC} https://apartments.daiyooo.com"
    echo ""
    print_info "To check status: kubectl get all -n apartment-oat"
    print_info "To view logs: kubectl logs -n apartment-oat -l app=apartment-oat -f"
    echo ""
}

function show_usage() {
    cat << EOF
Apartment-Oat Deployment Tool

Usage: ./main.sh [COMMAND]

Commands:
    build      Build and push Docker image to registry
    deploy     Deploy the latest built image to K3s
    cleanup    Cleanup old images from registry (keep last 5)
    all        Run full deployment (build + deploy + optional cleanup)
    help       Show this help message

Examples:
    ./main.sh all          # Full deployment workflow
    ./main.sh build        # Just build and push
    ./main.sh deploy       # Deploy latest built image
    ./main.sh cleanup      # Cleanup old registry tags

Files:
    deployment/
    ├── build-and-push.sh    # Build & push image
    ├── deploy.sh            # Deploy to K3s
    ├── cleanup-old-images.sh # Cleanup registry
    └── *.yaml               # K8s manifests

EOF
}

# Main logic
case "${1:-all}" in
    build)
        step_build
        ;;
    deploy)
        step_deploy
        ;;
    cleanup)
        step_cleanup
        ;;
    all)
        step_all
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_usage
        exit 1
        ;;
esac
