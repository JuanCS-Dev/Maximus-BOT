#!/bin/bash
set -e

echo "📦 Populating Kubernetes secrets from Google Secret Manager..."

# Fetch secrets from GSM
DISCORD_TOKEN=$(gcloud secrets versions access latest --secret=discord-token)
CLIENT_ID=$(gcloud secrets versions access latest --secret=client-id)
VIRUSTOTAL_API_KEY=$(gcloud secrets versions access latest --secret=virustotal-api-key)
ANTHROPIC_API_KEY=$(gcloud secrets versions access latest --secret=openai-api-key)
DATABASE_URL=$(gcloud secrets versions access latest --secret=database-url)
# Extract password from DATABASE_URL
DB_PASSWORD=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')

# Generate secrets.yaml from template
cat k8s/secrets.yaml.template | \
  sed "s|DISCORD_TOKEN_PLACEHOLDER|${DISCORD_TOKEN}|g" | \
  sed "s|CLIENT_ID_PLACEHOLDER|${CLIENT_ID}|g" | \
  sed "s|VIRUSTOTAL_API_KEY_PLACEHOLDER|${VIRUSTOTAL_API_KEY}|g" | \
  sed "s|ANTHROPIC_API_KEY_PLACEHOLDER|${ANTHROPIC_API_KEY}|g" | \
  sed "s|PASSWORD_PLACEHOLDER|${DB_PASSWORD}|g" \
  > k8s/secrets.yaml

echo "✅ Secrets populated successfully in k8s/secrets.yaml"
echo "⚠️  WARNING: secrets.yaml contains sensitive data. Do NOT commit to git!"
