#!/bin/bash
# Upload preprocessed training data to S3 for SageMaker training

set -e

# Configuration
REGION="${AWS_REGION:-us-east-1}"
BUCKET="${S3_BUCKET}"
PREFIX="${S3_PREFIX:-yolo-training}"
DATA_DIR="${DATA_DIR:-data/processed}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "============================================================"
echo "Upload Training Data to S3"
echo "============================================================"

# Validate inputs
if [ -z "$BUCKET" ]; then
    echo -e "${RED}Error: S3_BUCKET environment variable not set${NC}"
    echo "Usage: S3_BUCKET=your-bucket ./upload_to_s3.sh"
    exit 1
fi

if [ ! -d "$DATA_DIR" ]; then
    echo -e "${RED}Error: Data directory not found: $DATA_DIR${NC}"
    exit 1
fi

echo "Configuration:"
echo "  Region: $REGION"
echo "  Bucket: $BUCKET"
echo "  Prefix: $PREFIX"
echo "  Data dir: $DATA_DIR"
echo "============================================================"

# Check AWS credentials
echo "Checking AWS credentials..."
aws sts get-caller-identity --region $REGION > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: AWS credentials not configured${NC}"
    echo "Run: aws configure"
    exit 1
fi
echo -e "${GREEN}✓ AWS credentials valid${NC}"

# Check if bucket exists
echo "Checking if bucket exists..."
aws s3api head-bucket --bucket $BUCKET --region $REGION > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Bucket does not exist. Creating...${NC}"
    aws s3 mb s3://$BUCKET --region $REGION
    echo -e "${GREEN}✓ Bucket created${NC}"
else
    echo -e "${GREEN}✓ Bucket exists${NC}"
fi

# Upload data
echo ""
echo "Uploading training data..."
aws s3 sync $DATA_DIR s3://$BUCKET/$PREFIX/data/ \
    --region $REGION \
    --delete \
    --exclude "*.pyc" \
    --exclude "__pycache__/*" \
    --exclude ".DS_Store"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Data uploaded successfully${NC}"

    # Print summary
    echo ""
    echo "============================================================"
    echo "Upload Summary"
    echo "============================================================"
    echo "S3 URI: s3://$BUCKET/$PREFIX/data/"
    echo ""
    echo "Directory structure:"
    aws s3 ls s3://$BUCKET/$PREFIX/data/ --recursive --human-readable --summarize | tail -20

    echo ""
    echo -e "${GREEN}✅ Ready for SageMaker training!${NC}"
else
    echo -e "${RED}❌ Upload failed${NC}"
    exit 1
fi
