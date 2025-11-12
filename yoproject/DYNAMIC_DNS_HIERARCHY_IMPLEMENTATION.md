# Dynamic DNS Hierarchy Implementation Plan

## Problem Statement
The current DNS visualization uses a static graph with fixed server nodes:
- Root Server (.)
- TLD Server (.com, .org, etc.)
- Authoritative Server

This doesn't properly represent complex domains like `ims.iitgn.ac.in` which have multiple delegation levels:
1. Root (.)
2. TLD (.in)
3. SLD (.ac.in) - Academic institutions in India
4. Organization (.iitgn.ac.in) - IIT Gandhinagar
5. Host (ims.iitgn.ac.in) - Specific service

## Solution Overview

### 1. Domain Parser Module (`backend/src/domainParser.js`) ✅ CREATED
Intelligent domain parsing that:
- Recognizes known second-level domains (SLDs) like `.ac.in`, `.co.uk`, `.com.au`
- Builds hierarchical structure from root to host
- Identifies delegation boundaries
- Supports 50+ common SLD patterns across multiple countries

### 2. Backend Changes Required

#### A. Update `dnsResolver.js`
**Location**: `backend/src/dnsResolver.js`

**Changes Needed**:

1. **Import domainParser**:
```javascript
const { parseDomain, getServerTypeForDomain } = require('./domainParser');
```

2. **Update `recursiveResolution` method** to generate dynamic stages:

Instead of hardcoded stages:
```javascript
// OLD - Hardcoded:
recursive_to_root_query → recursive_to_root_response
recursive_to_tld_query → recursive_to_tld_response
recursive_to_auth_query → recursive_to_auth_response
```

Generate based on domain structure:
```javascript
// NEW - Dynamic:
For ims.iitgn.ac.in:
  recursive_to_root_query → recursive_to_root_response
  recursive_to_tld_query → recursive_to_tld_response (.in)
  recursive_to_sld_query → recursive_to_sld_response (.ac.in)
  recursive_to_intermediate_3_query → recursive_to_intermediate_3_response (.iitgn.ac.in)
  recursive_to_authoritative_query → recursive_to_authoritative_response (ims.iitgn.ac.in)
```

3. **Add helper function to generate delegation stages**:
```javascript
generateDelegationStages(domain, recordType, settings) {
  const parsed = parseDomain(domain);
  const stages = [];
  
  // For each level in hierarchy (skip root, start from TLD)
  for (let i = 1; i < parsed.hierarchy.length; i++) {
    const level = parsed.hierarchy[i];
    const isLast = i === parsed.hierarchy.length - 1;
    
    // Query stage
    stages.push({
      stage: `recursive_to_${level.type}_query`,
      name: `Query to ${level.description || level.type} Server`,
      server: { 
        name: `${level.name} NS`, 
        type: level.type,
        domain: level.fullDomain 
      },
      messageType: 'QUERY',
      query: { domain, type: recordType, class: 'IN' },
      // ... other properties
    });
    
    // Response stage
    stages.push({
      stage: `${level.type}_to_recursive_response`,
      name: `Response from ${level.description || level.type} Server`,
      server: { 
        name: `${level.name} NS`, 
        type: level.type,
        domain: level.fullDomain 
      },
      messageType: 'RESPONSE',
      response: {
        found: isLast, // Only last level has the answer
        referral: !isLast, // All except last are referrals
        // ... other properties
      },
      // ... other properties
    });
  }
  
  return stages;
}
```

#### B. Update `liveDNSResolver.js`
**Location**: `backend/src/liveDNSResolver.js`

Similar changes to generate dynamic stages based on actual DNS responses.

### 3. Frontend Changes Required

#### A. Update `VisualizationPanel.jsx`
**Location**: `frontend/src/components/VisualizationPanel.jsx`

**Major Changes**:

1. **Dynamic Server Generation**:
```javascript
// OLD - Static servers array
const servers = [
  { id: 'client', name: 'Client', x: 100, y: height / 2, ... },
  { id: 'root', name: 'Root Server', x: 700, y: 150, ... },
  { id: 'tld', name: 'TLD Server', x: 700, y: 300, ... },
  { id: 'authoritative', name: 'Authoritative Server', x: 700, y: 450, ... }
];

// NEW - Dynamic server generation based on domain
const generateServers = (domain, width, height) => {
  const parsed = parseDomain(domain);
  const baseServers = [
    { id: 'client', name: 'Client', x: 100, y: height / 2, ... },
    { id: 'browser_cache', name: 'Browser Cache', x: 250, y: 150, ... },
    { id: 'os_cache', name: 'OS Cache', x: 250, y: 350, ... },
    { id: 'recursive_resolver', name: 'Recursive Resolver', x: 450, y: height / 2, ... }
  ];
  
  // Calculate positions for DNS hierarchy servers
  const dnsServers = [];
  const startX = 700;
  const startY = 100;
  const verticalSpacing = Math.min(80, (height - 200) / parsed.hierarchy.length);
  
  parsed.hierarchy.forEach((level, index) => {
    dnsServers.push({
      id: getServerId(level),
      name: getServerName(level),
      x: startX,
      y: startY + (index * verticalSpacing),
      color: getServerColor(level),
      type: level.type,
      domain: level.fullDomain,
      ...
    });
  });
  
  return [...baseServers, ...dnsServers];
};
```

2. **Dynamic Stage Mapping**:
```javascript
// OLD - Hardcoded stage mapping
if (stage === 'recursive_to_root_query') { sourceId = 'recursive_resolver'; targetId = 'root'; }
else if (stage === 'recursive_to_tld_query') { sourceId = 'recursive_resolver'; targetId = 'tld'; }
else if (stage === 'recursive_to_auth_query') { sourceId = 'recursive_resolver'; targetId = 'authoritative'; }

// NEW - Dynamic pattern matching
const stageMatch = stage.match(/recursive_to_(\w+)_query/);
if (stageMatch) {
  sourceId = 'recursive_resolver';
  targetId = stageMatch[1]; // Could be 'root', 'tld', 'sld', 'intermediate_3', 'authoritative'
}

const responseMatch = stage.match(/(\w+)_to_recursive_response/);
if (responseMatch) {
  sourceId = responseMatch[1]; // Could be 'root', 'tld', 'sld', 'intermediate_3', 'authoritative'
  targetId = 'recursive_resolver';
}
```

3. **Responsive Layout**:
```javascript
// Adjust SVG height based on number of levels
const calculateSVGHeight = (domain) => {
  const parsed = parseDomain(domain);
  const minHeight = 600;
  const levelHeight = 100;
  return Math.max(minHeight, parsed.hierarchy.length * levelHeight + 200);
};
```

### 4. Implementation Steps

1. **✅ Phase 1: Domain Parser** (COMPLETED)
   - Created `domainParser.js` with SLD recognition
   - Supports 50+ SLD patterns
   - Hierarchical domain parsing

2. **Phase 2: Backend Integration**
   - Update `dnsResolver.js` to use dynamic stage generation
   - Update `liveDNSResolver.js` similarly
   - Add tests for complex domains

3. **Phase 3: Frontend Integration**
   - Import domain parser in frontend (via API)
   - Update server generation to be dynamic
   - Update stage mapping to handle variable server IDs
   - Adjust visualization layout

4. **Phase 4: Testing**
   - Test with `google.com` (simple: 2 levels)
   - Test with `ims.iitgn.ac.in` (complex: 5 levels)
   - Test with `subdomain.example.co.uk` (SLD pattern)
   - Test with `deep.sub.domain.example.org` (multiple subdomains)

5. **Phase 5: UI Enhancements**
   - Add tooltip showing full delegation chain
   - Color-code servers by type (root, TLD, SLD, intermediate, authoritative)
   - Add zoom/pan for tall hierarchies
   - Collapsible view for very deep hierarchies

### 5. Example Visualization

For `ims.iitgn.ac.in`:

```
Client ────────────► Recursive Resolver
                           │
                           ▼
                     Root Server (.)
                           │
                           ▼
                     TLD Server (.in)
                           │
                           ▼
                     SLD Server (.ac.in)
                           │
                           ▼
                     NS Server (.iitgn.ac.in)
                           │
                           ▼
                     Authoritative (ims.iitgn.ac.in)
```

### 6. Color Scheme for Server Types

- **Root**: Purple (#8b5cf6)
- **TLD**: Pink (#ec4899)
- **SLD**: Amber (#f59e0b)
- **Intermediate**: Cyan (#06b6d4)
- **Authoritative**: Red (#ef4444)
- **Resolver**: Orange (#f97316)
- **Cache**: Blue (#3b82f6)
- **Client**: Green (#10b981)

### 7. Benefits

1. **Educational Accuracy**: Shows actual DNS hierarchy
2. **Scalability**: Handles any depth of domain
3. **International Support**: Recognizes global SLD patterns
4. **Flexibility**: Automatically adapts to domain structure
5. **RFC Compliant**: Follows DNS standards (RFC 1034/1035)

### 8. Next Actions

Given the scope of changes, I recommend:

1. **Review the domain parser** (`domainParser.js`) to ensure it covers your use cases
2. **Let me proceed with backend integration** - updating `dnsResolver.js`
3. **Then frontend integration** - updating `VisualizationPanel.jsx`
4. **Finally, test with various domain types**

Should I proceed with Phase 2 (Backend Integration)?
