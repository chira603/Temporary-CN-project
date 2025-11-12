# 🚀 Quick Start: Real DNS Delegation Feature

## Open the Application
```
http://localhost:3000
```

## Enable the Feature (3 Steps)

### 1️⃣ Ensure Deterministic Mode
```
Configuration Panel → Query Mode → 🎯 Deterministic Mode (not Live)
```

### 2️⃣ Enable Real DNS Delegation
```
Configuration Panel → Real DNS Delegation → Toggle ON
```

### 3️⃣ Test with a Domain
```
Query Input → Enter: ims.iitgn.ac.in → Click Resolve
```

---

## What You'll See

### ✅ With Real DNS (Accurate)
```
Root Server
  ↓
.in TLD Server
  NS: ns10.trs-dns.org 🌐 (REAL)
  ↓
.ac.in SLD Server  
  NS: ns01.trs-dns.net 🌐 (REAL)
  ↓
iitgn.ac.in Authoritative
  NS: ns1-06.azure-dns.com 🌐 (REAL)

⚠️ ims.iitgn.ac.in is NOT a separate zone!
```

### ❌ With Simulated (Fictional)
```
Root Server
  ↓
.in TLD Server (simulated)
  ↓
.ac.in SLD Server (simulated)
  ↓
.iitgn.ac.in Intermediate (FICTIONAL!)
  ↓
ims.iitgn.ac.in Authoritative (FICTIONAL!)
```

---

## Try These Domains

1. **ims.iitgn.ac.in** → Shows .ac.in SLD, no ims delegation
2. **www.google.com** → Only 3 levels (no SLD)
3. **github.com** → Fastly CDN nameservers
4. **cloudflare.com** → Cloudflare's own DNS

---

## Status Indicators

### Configuration Panel
```
🌐 Real DNS Delegation
☑ ✓ Using Real DNS Data
```

### Results Panel
```
Real DNS Delegation: 🌐 Enabled (Real Data)
```

### Visualization Panel (Hover on servers)
```
🌐 Real DNS Server
Zone: iitgn.ac.in
All NS: ns1-06.azure-dns.com, ns2-06.azure-dns.net, ...
```

---

## Quick Comparison

| Feature | Real DNS | Simulated |
|---------|----------|-----------|
| Speed | ~500ms-1s | ~50-200ms |
| Accuracy | ✅ Perfect | ⚠️ May differ |
| Internet | Required | Not required |
| Learning | ✅ Real world | 📚 Theoretical |

---

## Troubleshooting

**Q: Toggle not visible?**
→ Make sure you're in Deterministic Mode (not Live Mode)

**Q: Slow response?**
→ Real DNS queries take time, try disabling cache

**Q: Different results?**
→ DNS changes over time, this is normal!

---

## Documentation

- **User Guide:** REAL_DNS_FEATURE_GUIDE.md
- **Technical:** REAL_DNS_IMPLEMENTATION_SUMMARY.md
- **Research:** REAL_DNS_BEHAVIOR_FINDINGS.md
- **Complete:** FEATURE_COMPLETE.md

---

**Ready to explore real DNS! 🎉**

Access: http://localhost:3000
