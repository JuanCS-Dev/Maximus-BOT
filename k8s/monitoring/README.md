# Monitoring Stack - Discord Bot Vértice

## Installed Components

- **Prometheus**: Metrics collection and alerting engine
- **Grafana**: Visualization and dashboards
- **Jaeger**: Distributed tracing
- **AlertManager**: Alert routing and notifications
- **Metrics Server**: Kubernetes metrics for HPA

## Accessing Services

### Prometheus
```bash
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090
```
Access at: http://localhost:9090

### Grafana
```bash
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
```
Access at: http://localhost:3000

**Login credentials:**
- Username: `admin`
- Password: `VerticeSecure2025!`

### Jaeger UI
```bash
kubectl port-forward -n observability svc/jaeger-query 16686:16686
```
Access at: http://localhost:16686

### AlertManager
```bash
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-alertmanager 9093:9093
```
Access at: http://localhost:9093

## Configuring Slack Alerts

### 1. Create Slack Webhook

1. Go to https://api.slack.com/apps
2. Create a new app or select existing app
3. Enable "Incoming Webhooks"
4. Create webhook for your channel
5. Copy the webhook URL

### 2. Configure AlertManager

Edit `alertmanager-config.yaml.template`:
```bash
cp k8s/monitoring/alertmanager-config.yaml.template k8s/monitoring/alertmanager-config.yaml
```

Replace `SLACK_WEBHOOK_URL_PLACEHOLDER` with your webhook URL.

### 3. Apply Configuration

```bash
kubectl apply -f k8s/monitoring/alertmanager-config.yaml

# Update AlertManager configuration
kubectl create secret generic alertmanager-prometheus-kube-prometheus-alertmanager \
  --from-file=alertmanager.yaml=k8s/monitoring/alertmanager-config.yaml \
  --namespace=monitoring \
  --dry-run=client -o yaml | kubectl apply -f -
```

## Importing Grafana Dashboard

1. Access Grafana (see above)
2. Click "+" → "Import"
3. Copy contents of `grafana-dashboard-overview.json`
4. Paste into "Import via panel json"
5. Click "Load"
6. Select "Prometheus" as data source
7. Click "Import"

## Available Prometheus Alerts

The following alerts are configured in `prometheus-rules.yaml`:

| Alert | Severity | Description |
|-------|----------|-------------|
| DiscordBotDown | Critical | Bot unreachable for 2+ minutes |
| DiscordBotHighErrorRate | Warning | Error rate > 10% for 5 minutes |
| DiscordBotHighLatency | Warning | P95 latency > 2s for 10 minutes |
| DiscordBotHighMemoryUsage | Warning | Memory usage > 85% for 5 minutes |
| DiscordBotHighCPUUsage | Warning | CPU usage > 80% for 5 minutes |
| DiscordBotDatabaseConnectionFailed | Critical | Database connection lost |
| DiscordBotRedisConnectionFailed | Critical | Redis connection lost |
| DiscordBotFrequentRestarts | Warning | Pod restarts > 0.1/min for 15 minutes |
| DiscordBotRateLimited | Warning | Discord API rate limit hits |
| DiscordBotLowCommandSuccessRate | Warning | Success rate < 95% for 10 minutes |

## Viewing Metrics in Prometheus

Access Prometheus UI and try these queries:

```promql
# Bot uptime
up{job="discord-bot-metrics"}

# Command rate (per second)
rate(discord_bot_commands_total[5m])

# Command success rate
rate(discord_bot_commands_success_total[5m]) /
(rate(discord_bot_commands_success_total[5m]) + rate(discord_bot_commands_failed_total[5m]))

# Memory usage percentage
container_memory_usage_bytes{pod=~"discord-bot-vertice-.*", container="bot"} /
container_spec_memory_limit_bytes{pod=~"discord-bot-vertice-.*", container="bot"} * 100

# CPU usage percentage
rate(container_cpu_usage_seconds_total{pod=~"discord-bot-vertice-.*", container="bot"}[5m]) /
container_spec_cpu_quota{pod=~"discord-bot-vertice-.*", container="bot"} * 100

# Discord gateway latency
discord_bot_gateway_ping_ms
```

## Troubleshooting

### ServiceMonitor not discovering metrics

```bash
# Check if ServiceMonitor exists
kubectl get servicemonitor -n discord-bot

# Check Prometheus targets
# Access Prometheus UI → Status → Targets
# Look for "discord-bot-metrics"
```

### Alerts not firing

```bash
# Check PrometheusRule
kubectl get prometheusrule -n monitoring discord-bot-alerts -o yaml

# Check AlertManager status
kubectl logs -n monitoring alertmanager-prometheus-kube-prometheus-alertmanager-0
```

### Grafana dashboard shows no data

1. Check data source: Configuration → Data Sources → Prometheus
2. Verify URL: `http://prometheus-kube-prometheus-prometheus.monitoring.svc.cluster.local:9090`
3. Click "Save & Test"
4. Check that metrics exist in Prometheus first

## Resource Usage

Current monitoring stack resource allocation:

| Component | Memory Request | Memory Limit | CPU Request | CPU Limit |
|-----------|---------------|--------------|-------------|-----------|
| Prometheus | 400Mi | 2Gi | 100m | 1000m |
| Grafana | 128Mi | 256Mi | 50m | 200m |
| AlertManager | 64Mi | 128Mi | 50m | 100m |
| Jaeger | 256Mi | 512Mi | 100m | 500m |
| Metrics Server | 200Mi | 400Mi | 100m | 200m |

**Total**: ~1.2Gi memory, ~500m CPU (requests)

## Next Steps

1. ✅ Monitoring stack installed
2. ⏳ Configure Slack webhook for alerts
3. ⏳ Convert StatefulSet to Deployment for better HPA support
4. ⏳ Create HPA with custom metrics
5. ⏳ Add OpenTelemetry instrumentation to bot code
6. ⏳ Verify end-to-end tracing in Jaeger
