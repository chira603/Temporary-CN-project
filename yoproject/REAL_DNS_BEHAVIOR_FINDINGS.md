# Real DNS Behavior Research Findings

## Executive Summary

**CRITICAL FINDING**: Our simulation is generating fictional DNS servers that don't exist in real DNS infrastructure. Real DNS delegation works differently than our current implementation assumes.

## Research Methods

1. **Standards Review**: RFC 1034 (DNS Concepts and Facilities)
2. **Industry Documentation**: Cloudflare DNS documentation
3. **Real DNS Queries**: Using `dig +trace` to observe actual DNS resolution

---

## Key Findings from Real DNS Queries

### Test Case 1: ims.iitgn.ac.in (Your Example)

**Query**: `dig +trace ims.iitgn.ac.in`

**Actual DNS Resolution Path**:
```
1. Root Servers (.)
   └─> NS: a.root-servers.net, b.root-servers.net, ... (13 root servers)

2. .in TLD Servers
   └─> NS: ns01.trs-dns.net, ns10.trs-dns.info, ns01.trs-dns.com, ns10.trs-dns.org

3. iitgn.ac.in Authoritative Servers (FINAL STEP)
   └─> NS: ns1-06.azure-dns.com, ns2-06.azure-dns.net, 
           ns3-06.azure-dns.org, ns4-06.azure-dns.info
   └─> Returns: ims.iitgn.ac.in A 14.139.98.79
```

**Critical Observations**:
- **Only 3 levels**: Root → TLD (.in) → Authoritative (iitgn.ac.in)
- **NO separate servers** for:
  - ❌ `.ac.in` (no "SLD server")
  - ❌ `ims.iitgn.ac.in` (no separate authoritative server)
- **ims.iitgn.ac.in has NO NS records** - it's just a hostname/subdomain served by iitgn.ac.in's authoritative servers

**Verification**:
```bash
$ dig NS iitgn.ac.in +short
ns1-06.azure-dns.com.
ns2-06.azure-dns.net.
ns3-06.azure-dns.org.
ns4-06.azure-dns.info.

$ dig NS ims.iitgn.ac.in +short
(empty response - no NS records)
```

### Test Case 2: www.google.com (Comparison)

**Query**: `dig +trace www.google.com`

**Actual DNS Resolution Path**:
```
1. Root Servers (.)
2. .com TLD Servers
3. google.com Authoritative Servers (FINAL STEP)
   └─> NS: ns1.google.com, ns2.google.com, ns3.google.com, ns4.google.com
   └─> Returns: www.google.com A 142.251.42.228
```

**Same Pattern**: Only 3 levels (Root → TLD → Authoritative)

---

## What RFC 1034 Says

### DNS Zones (Section 4.2)

> "A zone is a connected region of the domain namespace. Zone boundaries are defined by delegation."

**Key Points**:
1. **Zones are administrative boundaries** - not automatic at every domain label
2. **Delegation happens via NS records** - parent zone adds NS records to create a child zone
3. **One authoritative server can serve multiple levels** - Example from RFC: ISI.EDU zone serves all *.ISI.EDU subdomains

### Authoritative Nameservers (Section 4.2.1)

> "The zone is said to be authoritative for all names in the connected region."

**Example from RFC**:
```
ISI.EDU zone contains:
  - ISI.EDU (domain itself)
  - A.ISI.EDU (subdomain)
  - VAXA.ISI.EDU (subdomain)
  - All served by the SAME authoritative servers
```

---

## What Cloudflare Documentation Says

### DNS Server Types

**Only 4 types exist**:
1. **Recursive Resolver** (DNS recursor)
2. **Root Nameserver**
3. **TLD Nameserver**
4. **Authoritative Nameserver**

**What's MISSING**:
- ❌ No "SLD servers" (Second-Level Domain servers)
- ❌ No "intermediate servers"
- ❌ No automatic servers for each domain label

### Authoritative Nameserver Definition

> "The authoritative nameserver is usually the resolver's last step in the journey for an IP address. It contains information specific to the domain name it serves."

**Key Point**: The authoritative server is the FINAL step after TLD, regardless of how many labels are in the domain.

---

## Our Simulation's Errors

### Current (Incorrect) Behavior

For `ims.iitgn.ac.in`, our simulation generates:

```
1. Root Server
2. TLD Server (.in)
3. SLD Server (.ac.in) ❌ FICTIONAL
4. Intermediate Server (.iitgn.ac.in) ❌ FICTIONAL  
5. Authoritative Server (ims.iitgn.ac.in) ❌ WRONG LEVEL
```

### Actual Real-World Behavior

For `ims.iitgn.ac.in`, real DNS works like:

```
1. Root Server
2. TLD Server (.in)
3. Authoritative Server (iitgn.ac.in) ✓ SERVES ALL iitgn.ac.in subdomains
   - ims.iitgn.ac.in is just a CNAME/A record in this zone
   - No separate NS records for ims
   - No delegation occurs
```

---

## Why This Matters

### The Problem with Our Approach

1. **We assume**: Every domain label creates a new zone with separate servers
2. **Reality**: Zones are created only when administrators choose to delegate

### Real-World Examples

**Most common pattern** (like ims.iitgn.ac.in):
- **Zone boundary**: At the main domain (e.g., iitgn.ac.in)
- **Subdomains**: Served by the same authoritative servers
- **No separate delegation**: ims, www, mail, etc. are all just records in the parent zone

**Delegation example** (when it does happen):
- **google.com** zone managed by Google
- **youtube.com** zone delegated to separate servers (even though Google owns both)
- **Delegation occurs** via NS records at zone boundary

---

## How to Fix Our Simulation

### Option 1: Realistic Defaults (Deterministic Mode)

For most domains, use this pattern:
```
Root → TLD → Authoritative (at domain level)
```

Only add intermediate zones when:
- Domain has 4+ labels AND
- It's a known pattern (e.g., .ac.in for academic institutions) AND
- We document it as "simulated delegation for educational purposes"

### Option 2: Live DNS Queries (Live Mode)

For real domains:
1. Query actual DNS using `dig +trace` or Node.js `dns` module
2. Parse the actual delegation chain
3. Show REAL servers, REAL delegation points
4. This will be accurate but requires internet access

### Option 3: Hybrid Approach (Recommended)

- **Deterministic Mode**: Use simplified realistic pattern (Root → TLD → Authoritative)
- **Live Mode**: Query real DNS to show actual delegation
- **Educational Notes**: Explain that zone delegation varies by domain administration

---

## Tools We Can Use

### 1. Node.js `dns` Module (Built-in)

```javascript
const dns = require('dns');

// Get authoritative nameservers
dns.resolveNs('iitgn.ac.in', (err, addresses) => {
  console.log(addresses); 
  // ['ns1-06.azure-dns.com', 'ns2-06.azure-dns.net', ...]
});
```

### 2. `dig` Command (External Tool)

```bash
# Full trace showing delegation chain
dig +trace ims.iitgn.ac.in

# Just get NS records
dig NS iitgn.ac.in +short
```

### 3. DNS-over-HTTPS Libraries

- `dohdec` npm package
- `dns-over-http` npm package
- Google/Cloudflare public DNS APIs

---

## Recommendations

### Immediate Actions

1. ✅ **Document this finding** (this file)
2. ⏳ **Implement DNS query capability** in backend
3. ⏳ **Fix domain parser** to detect real zone boundaries
4. ⏳ **Update simulation logic** to match real DNS behavior

### For Educational Value

**Add explanation in UI**:
- "Real DNS delegation varies by domain"
- "Zone boundaries are administrative decisions"
- "Most subdomains are served by parent domain's authoritative servers"
- "Show examples of both delegated and non-delegated subdomains"

### Code Changes Needed

1. **backend/src/dnsResolver.js**:
   - Add function to query real DNS (for live mode)
   - Simplify delegation stages (for deterministic mode)
   - Remove fictional SLD/intermediate server generation

2. **backend/src/domainParser.js**:
   - Don't assume every label = new zone
   - Add real DNS query capability
   - Detect actual zone boundaries

3. **frontend/src/components**:
   - Update tooltips to explain zone vs domain labels
   - Add educational content about delegation
   - Show real vs simulated behavior clearly

---

## Conclusion

**Your intuition was correct**: ims.iitgn.ac.in is an application subdomain with NO separate authoritative server. It's served by the same nameservers as iitgn.ac.in.

**Our simulation was wrong**: We were generating fictional intermediate DNS servers that don't exist in real DNS infrastructure.

**The fix**: We need to either:
1. Query real DNS to find actual delegation points (live mode)
2. Use realistic simplified patterns (deterministic mode)
3. Clearly document when we're simulating vs showing real behavior

---

## Next Steps

**Ready to implement**:
1. Add Node.js DNS query capability
2. Test with multiple real domains
3. Compare real vs simulated behavior
4. Fix backend to match reality

**Your decision**: Should I proceed with implementing real DNS queries?
