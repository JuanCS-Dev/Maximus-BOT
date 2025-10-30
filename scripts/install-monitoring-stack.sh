#!/bin/bash
set -e

echo "🚀 Installing Production Monitoring Stack for Discord Bot Vértice"
echo "=================================================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if helm is available
if ! command -v helm &> /dev/null; then
    echo -e "${RED}❌ Helm not found. Installing...${NC}"
    cd /tmp
    wget -q https://get.helm.sh/helm-v3.16.0-linux-amd64.tar.gz
    tar -zxf helm-v3.16.0-linux-amd64.tar.gz
    mkdir -p ~/bin
    mv linux-amd64/helm ~/bin/helm
    chmod +x ~/bin/helm
    export PATH="$HOME/bin:$PATH"
fi

echo -e "${GREEN}✅ Helm ready${NC}"

# Add Helm repos
echo -e "${YELLOW}📦 Adding Helm repositories...${NC}"
~/bin/helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
~/bin/helm repo add jaegertracing https://jaegertracing.github.io/helm-charts
~/bin/helm repo update

# Install kube-prometheus-stack
echo -e "${YELLOW}📊 Installing Prometheus + Grafana...${NC}"
kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -

~/bin/helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false \
  --set prometheus.prometheusSpec.retention=7d \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=10Gi \
  --set grafana.adminPassword=VerticeSecure2025! \
  --set grafana.persistence.enabled=true \
  --set grafana.persistence.size=5Gi \
  --wait \
  --timeout=10m

echo -e "${GREEN}✅ Prometheus + Grafana installed${NC}"

# Install Jaeger
echo -e "${YELLOW}🔍 Installing Jaeger for tracing...${NC}"
kubectl create namespace observability --dry-run=client -o yaml | kubectl apply -f -

~/bin/helm upgrade --install jaeger jaegertracing/jaeger \
  --namespace observability \
  --set provisionDataStore.cassandra=false \
  --set allInOne.enabled=true \
  --set storage.type=memory \
  --set agent.enabled=false \
  --set collector.enabled=false \
  --set query.enabled=false \
  --wait \
  --timeout=5m

echo -e "${GREEN}✅ Jaeger installed${NC}"

# Install Metrics Server
echo -e "${YELLOW}📈 Installing Metrics Server...${NC}"
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

echo -e "${GREEN}✅ Metrics Server installed${NC}"

# Apply custom monitoring resources
echo -e "${YELLOW}⚙️  Applying custom monitoring resources...${NC}"
kubectl apply -f k8s/monitoring/

echo -e "${GREEN}✅ Custom monitoring resources applied${NC}"

echo ""
echo "🎉 Installation Complete!"
echo "========================="
echo ""
echo "Access services:"
echo -e "  ${YELLOW}Prometheus:${NC} kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090"
echo -e "  ${YELLOW}Grafana:${NC}    kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80"
echo -e "    Login: admin / VerticeSecure2025!"
echo -e "  ${YELLOW}Jaeger:${NC}     kubectl port-forward -n observability svc/jaeger-all-in-one-query 16686:16686"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo "  1. Configure Slack webhook in k8s/monitoring/alertmanager-config.yaml"
echo "  2. Apply: kubectl apply -f k8s/monitoring/alertmanager-config.yaml"
echo "  3. Import Grafana dashboards from k8s/monitoring/grafana-dashboards/"
