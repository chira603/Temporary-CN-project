# Dynamic DNS Hierarchy - Implementation Status

## ✅ COMPLETED

### 1. Domain Parser (Backend)
**File**: `backend/src/domainParser.js`
- ✅ Comprehensive domain parsing with SLD recognition
- ✅ 50+ known SLD patterns (ac.in, co.uk, com.au, etc.)
- ✅ Hierarchical structure generation
- ✅ Server type identification

### 2. Backend Integration
**File**: `backend/src/dnsResolver.js`
- ✅ Imported domain parser module
- ✅ Created `generateDelegationStages()` method to dynamically generate query/response pairs for each delegation level
- ✅ Replaced static `simulateRecursiveResolverWork()` with dynamic version
- ✅ Now supports:
  - Simple domains: `google.com` → 3 levels (root, TLD, authoritative)
  - Complex domains: `ims.iitgn.ac.in` → 5 levels (root, TLD .in, SLD .ac.in, NS .iitgn.ac.in, authoritative ims)
  - Multi-level delegations: `subdomain.example.co.uk` → 5 levels (root, TLD .uk, SLD .co.uk, NS .example.co.uk, authoritative)

### 3. Domain Parser (Frontend)
**File**: `frontend/src/utils/domainParser.js`
- ✅ Created frontend version of domain parser
- ✅ Helper functions: `parseDomain()`, `generateServerHierarchy()`, `getServerColor()`, `getServerIcon()`
- ✅ Matching SLD patterns with backend

## ⏳ PENDING - Frontend Visualization Integration

### Required Changes to `frontend/src/components/VisualizationPanel.jsx`

#### Step 1: Import domain parser
Add at top of file:
```javascript
import { parseDomain, getServerColor, getServerIcon } from '../utils/domainParser';
```

#### Step 2: Replace static servers array
Find the `updateNetworkView` function (around line 521) and replace the static `servers` array with dynamic generation:

```javascript
// OLD - Static servers (REMOVE THIS)
const servers = [
  { id: 'client', name: 'Client', x: 100, y: height / 2, ... },
  { id: 'browser_cache', name: 'Browser Cache', x: 250, y: 150, ... },
  // ... fixed list
];

// NEW - Dynamic server generation
const generateServers = (domain, width, height) => {
  if (!domain) {
    // Default simple structure
    domain = 'example.com';
  }
  
  const parsed = parseDomain(domain);
  
  // Static positions for client, caches, resolver
  const baseServers = [
    { id: 'client', name: 'Client', x: 100, y: height / 2, color: '#10b981', gradient: ['#10b981', '#059669'], ip: 'Local', type: 'Client Device', icon: '💻' },
    { id: 'browser_cache', name: 'Browser Cache', x: 250, y: 150, color: '#3b82f6', gradient: ['#3b82f6', '#2563eb'], ip: 'Local', type: 'Browser DNS Cache', icon: '🗄️' },
    { id: 'os_cache', name: 'OS Cache', x: 250, y: 350, color: '#06b6d4', gradient: ['#06b6d4', '#0891b2'], ip: 'Local', type: 'OS Resolver Cache', icon: '💾' },
    { id: 'recursive_resolver', name: 'Recursive Resolver', x: 450, y: height / 2, color: '#f59e0b', gradient: ['#f59e0b', '#d97706'], ip: '8.8.8.8', type: 'Recursive DNS Server', icon: '🔄' }
  ];
  
  // Calculate positions for DNS hierarchy servers (root, TLD, SLD, intermediate, authoritative)
  const dnsHierarchyServers = [];
  const startX = 700;
  const startY = 100;
  const totalHeight = height - 200;  // Leave margin at top and bottom
  const verticalSpacing = parsed.hierarchy.length > 1 ? totalHeight / (parsed.hierarchy.length - 1) : 0;
  
  parsed.hierarchy.forEach((level, index) => {
    const colors = getServerColor(level.type);
    const icon = getServerIcon(level.type);
    
    // Determine server ID
    let serverId;
    if (level.type === 'root') serverId = 'root';
    else if (level.type === 'tld') serverId = 'tld';
    else if (level.type === 'sld') serverId = 'sld';
    else if (level.type === 'intermediate') serverId = `intermediate_${level.level}`;
    else if (level.type === 'authoritative') serverId = 'authoritative';
    
    dnsHierarchyServers.push({
      id: serverId,
      name: level.description || level.fullDomain,
      x: startX,
      y: startY + (index * verticalSpacing),
      color: colors.color,
      gradient: colors.gradient,
      ip: level.type === 'root' ? '198.41.0.4' : 'NS IP',
      type: level.description || level.type,
      icon: icon,
      levelInfo: level  // Store the level info for reference
    });
  });
  
  return [...baseServers, ...dnsHierarchyServers];
};

// Call this function instead of static array
const servers = generateServers(results?.domain || 'example.com', width, height);
```

#### Step 3: Update stage mapping logic
Find the code that maps stages to server IDs (around line 540-560) and update it to handle dynamic server types:

```javascript
// OLD - Hardcoded stage checks
if (step.stage.includes('root')) activeServerIds.add('root');
else if (step.stage.includes('tld')) activeServerIds.add('tld');
else if (step.stage.includes('authoritative')) activeServerIds.add('authoritative');

// NEW - Dynamic stage mapping
stepsToShow.forEach(step => {
  // Cache servers
  if (step.stage.includes('browser_cache')) activeServerIds.add('browser_cache');
  else if (step.stage.includes('os_cache')) activeServerIds.add('os_cache');
  // Recursive resolver
  else if (step.stage.includes('recursive')) activeServerIds.add('recursive_resolver');
  // DNS hierarchy servers - use server.type from backend
  else if (step.server?.type) {
    const serverType = step.server.type.toLowerCase();
    
    if (serverType === 'root') {
      activeServerIds.add('root');
    } else if (serverType === 'tld') {
      activeServerIds.add('tld');
    } else if (serverType === 'sld') {
      activeServerIds.add('sld');
    } else if (serverType.includes('intermediate')) {
      // Extract level from server data
      const level = step.server.levelInfo?.level || step.stage.match(/intermediate_(\d+)/)?.[1];
      activeServerIds.add(`intermediate_${level}`);
    } else if (serverType === 'authoritative') {
      activeServerIds.add('authoritative');
    }
  }
});
```

#### Step 4: Update packet animation path mapping
Find the code that determines source and target for packet animations (around line 900-950):

```javascript
// OLD - Hardcoded mappings
if (stage === 'recursive_to_root_query') { sourceId = 'recursive_resolver'; targetId = 'root'; }
else if (stage === 'recursive_to_tld_query') { sourceId = 'recursive_resolver'; targetId = 'tld'; }
// ... etc

// NEW - Dynamic pattern matching
let sourceId, targetId;

// Pattern: client_to_XXX or XXX_to_client
if (stage.startsWith('client_to_')) {
  sourceId = 'client';
  targetId = stage.replace('client_to_', '').replace('_query', '').replace('_response', '');
} else if (stage.endsWith('_to_client_response')) {
  sourceId = stage.replace('_to_client_response', '');
  targetId = 'client';
}
// Pattern: recursive_to_XXX
else if (stage.match(/recursive_to_(\w+)_query/)) {
  sourceId = 'recursive_resolver';
  const match = stage.match(/recursive_to_(\w+)_query/);
  targetId = match[1];  // Could be 'root', 'tld', 'sld', 'intermediate_3', 'authoritative'
}
// Pattern: XXX_to_recursive
else if (stage.match(/(\w+)_to_recursive_response/)) {
  const match = stage.match(/(\w+)_to_recursive_response/);
  sourceId = match[1];  // Could be 'root', 'tld', 'sld', 'intermediate_3', 'authoritative'
  targetId = 'recursive_resolver';
}
// Cache patterns
else if (stage.includes('browser_cache')) {
  if (stage.endsWith('_query')) {
    sourceId = 'client';
    targetId = 'browser_cache';
  } else {
    sourceId = 'browser_cache';
    targetId = 'client';
  }
}
else if (stage.includes('os_cache')) {
  if (stage.endsWith('_query')) {
    sourceId = 'client';
    targetId = 'os_cache';
  } else {
    sourceId = 'os_cache';
    targetId = 'client';
  }
}

// Fallback: use step.server.type to find server
if (!sourceId || !targetId) {
  // Use server type from backend
  if (step.server?.type) {
    // Logic to map server type to server ID
  }
}
```

#### Step 5: Make SVG height dynamic
Find where SVG dimensions are set and make height responsive to domain depth:

```javascript
const calculateSVGHeight = (domain) => {
  if (!domain) return 600;
  const parsed = parseDomain(domain);
  const minHeight = 600;
  const levelHeight = 100;  // 100px per DNS hierarchy level
  return Math.max(minHeight, parsed.hierarchy.length * levelHeight + 200);
};

// Use in render
const svgHeight = calculateSVGHeight(results?.domain);
```

## 🧪 Testing Plan

### Test Domains

1. **Simple (3 levels)**:
   - `google.com` → root, TLD (.com), authoritative
   - `example.org` → root, TLD (.org), authoritative

2. **Complex with SLD (5 levels)**:
   - `ims.iitgn.ac.in` → root, TLD (.in), SLD (.ac.in), NS (.iitgn.ac.in), authoritative
   - `www.bbc.co.uk` → root, TLD (.uk), SLD (.co.uk), NS (.bbc.co.uk), authoritative

3. **With subdomains (4-6 levels)**:
   - `mail.google.com` → root, TLD, intermediate (google.com), authoritative (mail)
   - `deep.sub.example.com` → root, TLD, intermediate levels, authoritative

### Expected Behavior

For `ims.iitgn.ac.in`:
1. Client queries recursive resolver
2. Recursive resolver queries Root (.)
3. Root refers to .in TLD
4. Recursive resolver queries .in TLD
5. .in refers to .ac.in SLD
6. Recursive resolver queries .ac.in SLD
7. .ac.in refers to .iitgn.ac.in NS
8. Recursive resolver queries .iitgn.ac.in NS
9. .iitgn.ac.in refers to ims authoritative
10. Recursive resolver queries ims.iitgn.ac.in authoritative
11. ims.iitgn.ac.in returns answer
12. Recursive resolver returns answer to client

**Total**: 12 steps (6 queries + 6 responses)

## 📊 Visual Layout Example

For `ims.iitgn.ac.in`:

```
Client ──────► Browser Cache ──────► OS Cache
   ▲                                     │
   │                                     ▼
   │                              Recursive Resolver
   │                                     │
   │                                     ▼
   │                               Root Server (.)
   │                                     │
   │                                     ▼
   │                               TLD Server (.in)
   │                                     │
   │                                     ▼
   │                               SLD Server (.ac.in)
   │                                     │
   │                                     ▼
   │                               NS Server (.iitgn.ac.in)
   │                                     │
   │                                     ▼
   └─────────────────────────── Authoritative (ims.iitgn.ac.in)
```

## 🎨 Color Scheme

- **Root**: Purple (#8b5cf6) - 🌍
- **TLD**: Pink (#ec4899) - 🏢  
- **SLD**: Orange (#fb923c) - 🏛️
- **Intermediate**: Cyan (#06b6d4) - 🔗
- **Authoritative**: Red (#ef4444) - 📋
- **Recursive Resolver**: Amber (#f59e0b) - 🔄
- **Caches**: Blue shades - 🗄️ 💾
- **Client**: Green (#10b981) - 💻

## 🚀 Next Steps

1. Update `VisualizationPanel.jsx` with the changes above
2. Test with simple domain (`google.com`) first
3. Test with complex domain (`ims.iitgn.ac.in`)
4. Adjust vertical spacing if servers overlap
5. Add zoom/pan if hierarchy is too tall
6. Update documentation with examples

## 📝 Notes

- Backend generates stages with naming pattern: `recursive_to_{type}_query` and `{type}_to_recursive_response`
- For intermediate levels, type is `intermediate_{level_number}` (e.g., `intermediate_3`)
- Frontend must parse these stage names to map to correct server IDs
- Server positions are calculated dynamically based on domain depth
- Yellow packets for referral queries (root/TLD/SLD), orange for referral responses

## ⚠️ Known Issues to Handle

1. Very deep hierarchies (7+ levels) may need scrolling or zoom
2. Server names may overlap if domain names are long - consider truncation
3. Packet animation speed may need adjustment for more steps
4. Ensure proper handling of edge cases (single-label domains, invalid domains)

---

**Status**: Backend complete ✅ | Frontend integration pending ⏳
