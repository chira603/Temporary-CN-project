# 🌐 DNS Resolution Simulator

<div align="center">

![DNS Simulator](https://img.shields.io/badge/DNS-Simulator-blue.svg)
![Version](https://img.shields.io/badge/version-2.0.0-green.svg)
![License](https://img.shields.io/badge/license-ISC-lightgrey.svg)
![Educational](https://img.shields.io/badge/Educational-Tool-orange.svg)

**An Interactive, Visual DNS Resolution Learning Platform**

[Features](#-features) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [Learning Guide](#-learning-guide) • [API](#-api-reference)

</div>

---

## 📖 About

The **DNS Resolution Simulator** is a comprehensive educational tool designed to help students, developers, and network engineers understand how Domain Name System (DNS) works. Through interactive visualizations, real-time simulations, and detailed explanations, users can explore the complete DNS resolution process from browser cache to authoritative nameservers.

### 🎯 Educational Goals

- **Visualize** the complete DNS resolution process with animated packet flows
- **Understand** the difference between recursive and iterative DNS resolution
- **Explore** DNS caching mechanisms at browser, OS, and resolver levels
- **Learn** about DNSSEC (DNS Security Extensions) and cryptographic validation
- **Simulate** real-world network conditions including latency and packet loss
- **Experiment** with different record types (A, AAAA, CNAME, MX, NS, TXT, SOA)

---

## ✨ Features

### 🎨 Interactive Visualizations
- **Animated Network Diagram**: Watch DNS queries travel through the internet infrastructure
- **Timeline View**: Step-through mode to understand each resolution stage
- **Real-time Packet Animation**: See queries and responses with visual feedback
- **Color-coded Connections**: Understand query types at a glance

### 📚 Educational Features
- **Detailed Explanations**: Every step includes technical details and "what this means"
- **Impact Analysis**: Understand performance, security, and troubleshooting implications
- **DNS Packet Inspector**: View raw packet structure in human-readable, hex, and wire formats
- **DNSSEC Visualization**: See the complete chain of trust with cryptographic validation
- **Network Simulation**: Experience how latency and packet loss affect DNS resolution

### ⚙️ Configuration Options
- **Resolution Modes**: Recursive vs. Iterative
- **Query Types**: Deterministic (simulated) vs. Live (real DNS queries)
- **Record Types**: A, AAAA, CNAME, MX, NS, TXT, SOA, PTR
- **Cache Control**: Enable/disable caching with custom TTL
- **Network Simulation**: Adjust latency (10-500ms) and packet loss (0-50%)
- **Security**: DNSSEC validation with failure simulation

### 🔍 Advanced Features
- **Packet Loss & Retry Logic**: Visualize exponential backoff retry mechanisms
- **Latency Indicators**: Color-coded network performance analysis
- **DNSSEC Chain of Trust**: Complete validation path from root to authoritative server
- **Multi-format Export**: Copy DNS packets in JSON, Hex, or Wire format

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 14.x or higher
- **npm** or **yarn**
- **Docker** (optional, for containerized deployment)

### Installation

#### Option 1: Manual Setup (Recommended for Development)

```bash
# Clone the repository
git clone <repository-url>
cd yoproject

# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..

# Start the application
./start.sh
```

#### Option 2: Docker (Recommended for Production)

```bash
# Build and run with Docker Compose
docker-compose up --build

# Or run in detached mode
docker-compose up -d
```

#### Option 3: Separate Terminal Windows

```bash
# Terminal 1: Start backend
node backend/src/server.js

# Terminal 2: Start frontend
cd frontend
npm run dev
```

### Access the Application

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:5001
- **Health Check**: http://localhost:5001/api/health

---

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     DNS Simulator Frontend                   │
│                    (React + D3.js + Vite)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Query   │  │  Config  │  │  Visual  │  │ Results  │   │
│  │  Input   │  │  Panel   │  │  Panel   │  │  Panel   │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │            │             │             │            │
│       └────────────┴─────────────┴─────────────┘            │
│                         │                                    │
│                    API Service                               │
└────────────────────────┼────────────────────────────────────┘
                         │
                    HTTP/JSON
                         │
┌────────────────────────┼────────────────────────────────────┐
│                Backend Server (Express.js)                   │
│                         │                                    │
│       ┌─────────────────┴─────────────────┐                │
│       │                                    │                │
│  ┌────▼────────┐                 ┌────────▼──────┐         │
│  │ Deterministic│                 │ Live DNS      │         │
│  │ Resolver     │                 │ Resolver      │         │
│  │ (Simulated)  │                 │ (Real Queries)│         │
│  └─────┬────────┘                 └───────┬───────┘         │
│        │                                  │                 │
│        │  - Cache Simulation              │  - Real DNS     │
│        │  - DNSSEC Chain                  │  - System DNS   │
│        │  - Packet Loss                   │  - Actual TTL   │
│        │  - Network Latency               │                 │
│        └──────────────┬───────────────────┘                 │
│                       │                                     │
│                  DNS Cache                                  │
│        (Browser, OS, Resolver Caches)                      │
└─────────────────────────────────────────────────────────────┘
                       │
                       │
                   Real DNS
                   Hierarchy
                       │
           ┌───────────┼───────────┐
           │           │           │
      ┌────▼───┐  ┌───▼────┐ ┌───▼────────┐
      │ Root   │  │  TLD   │ │Authoritative│
      │Servers │  │Servers │ │  Servers    │
      └────────┘  └────────┘ └─────────────┘
```

### Technology Stack

**Frontend**
- ⚛️ **React 18** - Component-based UI framework
- 📊 **D3.js v7** - Data visualization and animations
- ⚡ **Vite** - Fast build tool and dev server
- 🎨 **CSS3** - Custom animations and gradients

**Backend**
- 🟢 **Node.js** - JavaScript runtime
- 🚂 **Express.js** - Web framework
- 📦 **dns-packet** - DNS packet parsing
- 💾 **node-cache** - In-memory caching

**DevOps**
- 🐳 **Docker** - Containerization
- 🔧 **docker-compose** - Multi-container orchestration

---

## 📚 Learning Guide

### DNS Basics

#### What is DNS?

DNS (Domain Name System) is the "phonebook of the internet." It translates human-readable domain names (like `google.com`) into IP addresses (like `142.250.185.46`) that computers use to communicate.

#### The DNS Hierarchy

```
                      Root (.)
                         │
         ┌───────────────┼───────────────┐
         │               │               │
       .com            .org            .net
         │               │               │
    ┌────┴────┐     ┌────┴────┐    ┌────┴────┐
  google.com  │   wikipedia.org│  cloudflare.net
              │                │                │
         example.com    mozilla.org      cdn.net
```

### Resolution Modes

#### Recursive Resolution

In **recursive mode**, the client sends a query to a recursive resolver, which does all the work:

1. **Client → Recursive Resolver**: "What is google.com?"
2. **Recursive Resolver → Root Server**: "Where is .com?"
3. **Recursive Resolver → TLD Server**: "Where is google.com?"
4. **Recursive Resolver → Authoritative Server**: "What is google.com's IP?"
5. **Recursive Resolver → Client**: "Here's the answer!"

**Advantages**: Simple for clients, caching benefits all users
**Use Case**: Most common mode, used by default in browsers

#### Iterative Resolution

In **iterative mode**, the client queries each server directly:

1. **Client → Root Server**: "What is google.com?" → "Ask .com server"
2. **Client → TLD Server**: "What is google.com?" → "Ask google.com's nameserver"
3. **Client → Authoritative Server**: "What is google.com?" → "Here's the IP!"

**Advantages**: More control, better for debugging
**Use Case**: DNS servers, troubleshooting tools like `dig`

### Caching Levels

DNS uses multi-level caching to improve performance:

| Cache Level | Location | Typical TTL | Speed |
|------------|----------|-------------|--------|
| Browser Cache | Browser memory | 5-30 minutes | <1ms ⚡ |
| OS Cache | System resolver | 10-60 minutes | 1-10ms ⚡ |
| Recursive Resolver | ISP/Public DNS | 1-24 hours | 20-50ms 🚀 |
| Authoritative Server | Domain's NS | Configured by owner | 50-200ms 🐢 |

### Record Types

| Type | Purpose | Example |
|------|---------|---------|
| **A** | IPv4 address | `93.184.216.34` |
| **AAAA** | IPv6 address | `2606:2800:220:1:248:1893:25c8:1946` |
| **CNAME** | Alias to another domain | `www.example.com → example.com` |
| **MX** | Mail exchange server | `10 mail.example.com` |
| **NS** | Nameserver | `ns1.example.com` |
| **TXT** | Text records | `v=spf1 include:_spf.google.com ~all` |
| **SOA** | Start of Authority | Zone metadata |
| **PTR** | Reverse DNS lookup | `34.216.184.93.in-addr.arpa → example.com` |

### DNSSEC (DNS Security Extensions)

DNSSEC adds cryptographic signatures to DNS records to prevent tampering:

```
Root DNSKEY (Trust Anchor)
    │
    ├─ Root DS Record → Signs TLD
    │
TLD DNSKEY
    │
    ├─ TLD DS Record → Signs Domain
    │
Authoritative DNSKEY
    │
    └─ RRSIG → Signs DNS Records
```

**Security Benefits**:
- ✅ Authenticates DNS responses
- ✅ Prevents DNS spoofing/cache poisoning
- ✅ Ensures data integrity
- ❌ Does NOT encrypt DNS traffic (use DNS-over-HTTPS for that)

---

## 🎮 How to Use

### Basic Workflow

1. **Enter a Domain**: Type any domain name (e.g., `google.com`, `github.com`)
2. **Configure Settings**: 
   - Choose resolution mode (Recursive/Iterative)
   - Select record type (A, AAAA, MX, etc.)
   - Adjust network conditions (latency, packet loss)
   - Enable DNSSEC if desired
3. **Click Resolve**: Watch the animated visualization
4. **Explore Results**:
   - Step through the timeline
   - Read detailed explanations
   - Inspect DNS packets
   - Analyze performance

### Example Scenarios

#### Scenario 1: Understanding Cache Hits

```
1. Query "google.com" (first time)
   → Full resolution through all DNS servers
   → Takes ~150-300ms
   
2. Query "google.com" again immediately
   → Browser cache hit
   → Takes <10ms
   
Learning: Caching dramatically improves performance!
```

#### Scenario 2: Simulating Network Issues

```
1. Set Packet Loss to 30%
2. Set Latency to 200ms
3. Query any domain
   → Watch retry mechanisms
   → See exponential backoff
   → Understand real-world challenges
   
Learning: DNS is resilient to network failures!
```

#### Scenario 3: DNSSEC Validation

```
1. Enable DNSSEC
2. Query a DNSSEC-enabled domain
   → See the complete chain of trust
   → Understand cryptographic validation
   → Learn about security
   
3. Enable "Simulate DNSSEC Failure"
   → See what happens when validation fails
   
Learning: DNSSEC protects against DNS attacks!
```

---

## 🔧 API Reference

### Health Check

**Endpoint**: `GET /api/health`

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-11-11T10:30:00.000Z"
}
```

### DNS Resolution

**Endpoint**: `POST /api/resolve`

**Request Body**:
```json
{
  "domain": "example.com",
  "recordType": "A",
  "mode": "recursive",
  "config": {
    "queryMode": "deterministic",
    "cacheEnabled": true,
    "cacheTTL": 300,
    "networkLatency": 50,
    "packetLoss": 0,
    "dnssecEnabled": false,
    "simulateDNSSECFailure": false,
    "customDNS": null,
    "simulateFailures": false
  }
}
```

**Response** (Success):
```json
{
  "success": true,
  "domain": "example.com",
  "recordType": "A",
  "mode": "recursive",
  "steps": [
    {
      "stage": "browser_cache",
      "name": "Browser Cache Lookup",
      "description": "Checking browser's local cache",
      "timing": 10,
      "response": {
        "found": false
      }
    }
    // ... more steps
  ],
  "totalTime": 245,
  "config": { /* configuration used */ }
}
```

---

## 🎓 Educational Use Cases

### For Students

- **Computer Networking Courses**: Understand DNS as part of the internet infrastructure
- **Cybersecurity Classes**: Learn about DNSSEC and DNS attacks
- **Web Development**: Understand how browsers resolve domain names

### For Developers

- **Debugging**: Understand why DNS queries fail or are slow
- **Performance Optimization**: Learn about DNS caching strategies
- **Infrastructure**: Understand DNS requirements for deploying applications

### For Network Engineers

- **Troubleshooting**: Visualize the resolution process
- **Training**: Teach juniors about DNS internals
- **Documentation**: Generate visual diagrams for documentation

---

## 🐛 Troubleshooting

### Common Issues

#### Port Already in Use

**Problem**: Error `EADDRINUSE: address already in use :::5001`

**Solution**:
```bash
# Find process using port 5001
lsof -i :5001

# Kill the process
kill -9 <PID>

# Or change the port in backend/src/server.js
```

#### Dependencies Not Installing

**Problem**: `npm install` fails

**Solution**:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

#### CORS Errors

**Problem**: Frontend can't connect to backend

**Solution**:
- Ensure backend is running on port 5001
- Check `cors` middleware is enabled in `backend/src/server.js`
- Verify frontend API URL in `frontend/src/services/api.js`

#### DNS Resolution Fails

**Problem**: Real DNS queries return "simulated response"

**Solution**:
- Check internet connectivity
- Verify domain name spelling
- Try a well-known domain like `google.com`
- Some domains may block DNS queries from certain sources

---

## 📊 Performance Considerations

### Optimization Tips

1. **Cache Hits**: ~10ms (excellent)
2. **Local Resolver**: ~20-50ms (good)
3. **Full Resolution**: ~50-200ms (normal)
4. **Slow Resolution**: >500ms (investigate)

### Factors Affecting Speed

- **Geographic Distance**: Servers farther away = higher latency
- **DNS Provider**: Some providers are faster than others
- **Network Congestion**: Peak hours may slow queries
- **DNSSEC**: Adds ~10-30ms for validation
- **TTL Values**: Lower TTL = more queries

---

## 🔐 Security Considerations

### Educational Tool Disclaimer

⚠️ **This is an educational simulation tool. Do NOT use in production for actual DNS resolution.**

### What This Tool Does

- ✅ Simulates DNS resolution for learning
- ✅ Makes real DNS queries in "Live Mode"
- ✅ Simulates DNSSEC validation (not actual cryptographic verification)
- ✅ Demonstrates network conditions

### What This Tool Does NOT Do

- ❌ Perform actual DNSSEC cryptographic validation
- ❌ Encrypt DNS queries (no DNS-over-HTTPS/TLS)
- ❌ Provide production-grade DNS resolution
- ❌ Guarantee security or privacy

### Recommendations for Production

For real-world DNS needs, use:
- **DNS-over-HTTPS (DoH)**: Encrypted DNS queries
- **DNS-over-TLS (DoT)**: Encrypted transport
- **Trusted Resolvers**: Google (8.8.8.8), Cloudflare (1.1.1.1), Quad9 (9.9.9.9)
- **DNSSEC Validation**: Use resolvers that validate DNSSEC

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Areas for Contribution

- 🎨 **UI/UX Improvements**: Better visualizations and animations
- 📚 **Educational Content**: More explanations and examples
- 🐛 **Bug Fixes**: Report and fix issues
- ✨ **New Features**: Suggest and implement features
- 📖 **Documentation**: Improve guides and tutorials
- 🌐 **Translations**: Multi-language support

### Development Setup

```bash
# Fork and clone the repository
git clone <your-fork-url>

# Create a feature branch
git checkout -b feature/amazing-feature

# Make your changes

# Test thoroughly
npm test

# Commit with descriptive message
git commit -m "Add amazing feature"

# Push to your fork
git push origin feature/amazing-feature

# Open a Pull Request
```

---

## 📜 License

This project is licensed under the ISC License - see the LICENSE file for details.

---

## 🙏 Acknowledgments

- **Root Server Operators**: For maintaining the internet's DNS infrastructure
- **DNS Community**: RFC authors and implementers
- **Open Source**: React, D3.js, Node.js, and all dependencies
- **Educators**: Teachers using this tool in classrooms

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)
- **Email**: support@example.com

---

## 🗺️ Roadmap

### Upcoming Features

- [ ] Happy Eyeballs (IPv4/IPv6 race) simulation
- [ ] Reverse DNS (PTR) lookups
- [ ] Interactive "What If" scenarios
- [ ] DNS query comparison mode
- [ ] Export reports as PDF
- [ ] Dark/Light theme toggle
- [ ] Mobile-responsive design
- [ ] Multi-language support
- [ ] DNS quiz/assessment mode
- [ ] Integration with dig/nslookup output

---

<div align="center">

**Made with ❤️ for DNS Education**

[⬆ Back to Top](#-dns-resolution-simulator)

</div>
