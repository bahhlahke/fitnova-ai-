#!/bin/bash

# Koda AI: Open Wearables Railway Deployment Script
# This script automates the setup of the Open Wearables aggregator on Railway.

# 1. Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting Open Wearables Deployment...${NC}"

# 2. Check for Railway CLI
if ! command -v railway &> /dev/null
then
    echo -e "${RED}Railway CLI not found.${NC} Please install it first: 'npm i -g @railway/cli'"
    exit 1
fi

# 3. Target Directory
TARGET_DIR="../open-wearables-deploy"

if [ -d "$TARGET_DIR" ]; then
    echo -e "${BLUE}Target directory $TARGET_DIR already exists. Pulling latest...${NC}"
    cd "$TARGET_DIR" || exit
    git pull
else
    echo -e "${BLUE}Cloning Open Wearables repository...${NC}"
    git clone https://github.com/the-momentum/open-wearables.git "$TARGET_DIR"
    cd "$TARGET_DIR" || exit
fi

# 4. Initialize Railway Project
echo -e "${BLUE}Initializing Railway project...${NC}"
# Use 'railway link' if the user has a project ID, otherwise 'railway init'
railway init

# 5. Add PostgreSQL Database
echo -e "${BLUE}Adding PostgreSQL database to Railway...${NC}"
railway add --database postgres

# 6. Set Environment Variables
# Pull the secret from the Koda AI .env.local if available
KODA_ENV_PATH="../fitnessAI/.env.local"
SECRET="simulated_secret_2026"

if [ -f "$KODA_ENV_PATH" ]; then
    EXTRACTED_SECRET=$(grep OPEN_WEARABLES_SECRET "$KODA_ENV_PATH" | cut -d '"' -f 2)
    if [ -n "$EXTRACTED_SECRET" ]; then
        SECRET=$EXTRACTED_SECRET
    fi
fi

echo -e "${BLUE}Creating and linking service on Railway...${NC}"
# Use a default name or let Railway generate it
railway add --service open-wearables

echo -e "${BLUE}Configuring environment variables on Railway...${NC}"
# Use 'railway variables' instead of 'railway vars' (which is deprecated in some versions)
# Also link to the newly created service
railway variables set --service open-wearables WEBHOOK_SECRET="$SECRET"
railway variables set --service open-wearables WEBHOOK_URL="https://your-koda-app.vercel.app/api/v1/integrations/webhook"

echo -e "${GREEN}Deployment setup complete!${NC}"
echo -e "Next steps:"
echo -e "1. Run ${BLUE}railway up${NC} to deploy."
echo -e "2. Get your public URL via ${BLUE}railway domain${NC}."
echo -e "3. Add your OURA_CLIENT_ID and GARMIN_CLIENT_ID to Railway variables."
