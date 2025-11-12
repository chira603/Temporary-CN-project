# DNS Simulator - Quick Start Guide

## 🚀 Getting Started (3 Steps)

### 1. Start the Application
```bash
cd /home/ruchitjagodara/Education/computer_networks/Temporary-CN-project/yoproject
sudo docker-compose up -d
```

### 2. Open in Browser
Navigate to: **http://localhost:3000**

### 3. Use Live Mode
1. Toggle "**Live DNS Mode**" in Configuration Panel
2. Enter domain: `google.com`
3. Click "**Resolve**"
4. View results in the **🌐 Live Data** tab

---

## 🎯 What You'll See

### Live Data Tab Shows:
- ✅ Real `dig +trace` command output
- ✅ 4 Resolution stages (Root → TLD → Authoritative → Final)
- ✅ DNSSEC records (DS, RRSIG, NSEC3)
- ✅ Response times and bytes transferred
- ✅ Real nameserver IPs

---

## 🔬 Example Domains to Try

| Domain | Record Type | Features |
|--------|-------------|----------|
| google.com | A | DNSSEC enabled |
| example.com | A | Simple domain |
| github.com | A | Multiple servers |
| mozilla.org | MX | Mail servers |
| cloudflare.com | A | CDN nameservers |

---

## 🧪 Testing Commands

### Test Backend API
```bash
curl -X POST http://localhost:5001/api/resolve \
  -H "Content-Type: application/json" \
  -d '{"domain": "google.com", "recordType": "A", "mode": "live", "config": {"queryMode": "live"}}' \
  | python3 -m json.tool
```

### Run Full Test Suite
```bash
./test-live-mode-complete.sh
```

### Check Container Status
```bash
sudo docker-compose ps
```

### View Logs
```bash
# Backend logs
sudo docker-compose logs backend

# Frontend logs
sudo docker-compose logs frontend
```

---

## 🛑 Stopping the Application

```bash
sudo docker-compose down
```

---

## 📊 Live Mode vs Simulation Mode

| Feature | Live Mode | Simulation Mode |
|---------|-----------|----------------|
| Data Source | Real DNS servers | Rule-based simulator |
| Accuracy | 100% real-world | Educational approximation |
| DNSSEC | Real signatures | Simulated |
| Speed | Depends on network | Instant |
| Use Case | Learning real DNS | Configurable scenarios |

---

## 🔧 Troubleshooting

### Container won't start?
```bash
sudo docker-compose down
sudo docker-compose up --build -d
```

### Port already in use?
```bash
# Check what's using port 3000 or 5001
sudo lsof -i :3000
sudo lsof -i :5001
```

### Can't reach frontend?
- Check if containers are running: `sudo docker-compose ps`
- Check firewall settings
- Try: http://127.0.0.1:3000

---

## 📚 Learn More

- Read `LIVE_MODE_COMPLETE.md` for full implementation details
- Read `IMPLEMENTATION_STATUS_AND_NEXT_STEPS.md` for architecture
- Check `backend/src/liveDNSTracer.js` for dig +trace parsing logic

---

## 🎓 Educational Use

Perfect for teaching:
- DNS hierarchy (Root → TLD → Authoritative)
- DNSSEC security mechanisms
- Real-world DNS resolution flow
- Network performance analysis
- Protocol understanding

**Enjoy exploring DNS! 🚀**
