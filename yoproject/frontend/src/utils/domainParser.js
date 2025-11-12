/**
 * Domain Parser Utility - Frontend Version
 * Parses domain names into hierarchical structure for dynamic DNS visualization
 * Recognizes known second-level domains (SLDs) like .ac.in, .co.uk, .com.au
 * 
 * This is a simplified frontend version of the backend domainParser
 */

// Known second-level domain patterns (country-code TLDs with structured subdomains)
const KNOWN_SLD_PATTERNS = {
  // United Kingdom
  'co.uk': true, 'ac.uk': true, 'gov.uk': true, 'org.uk': true,
  'net.uk': true, 'sch.uk': true, 'police.uk': true, 'nhs.uk': true,
  
  // India
  'co.in': true, 'ac.in': true, 'gov.in': true, 'org.in': true,
  'edu.in': true, 'net.in': true, 'res.in': true, 'gen.in': true,
  
  // Australia
  'com.au': true, 'net.au': true, 'org.au': true, 'edu.au': true,
  'gov.au': true, 'id.au': true, 'asn.au': true,
  
  // Japan
  'co.jp': true, 'ac.jp': true, 'go.jp': true, 'or.jp': true,
  'ne.jp': true, 'gr.jp': true, 'ed.jp': true, 'lg.jp': true,
  
  // Brazil
  'com.br': true, 'org.br': true, 'net.br': true, 'gov.br': true,
  'edu.br': true, 'mil.br': true,
  
  // China
  'com.cn': true, 'net.cn': true, 'org.cn': true, 'edu.cn': true,
  'gov.cn': true, 'ac.cn': true,
  
  // Germany
  'co.de': true,
  
  // South Africa
  'co.za': true, 'org.za': true, 'net.za': true, 'gov.za': true,
  'edu.za': true, 'ac.za': true,
  
  // New Zealand
  'co.nz': true, 'org.nz': true, 'net.nz': true, 'govt.nz': true,
  'ac.nz': true, 'school.nz': true,
  
  // Russia
  'co.ru': true, 'org.ru': true, 'net.ru': true,
  
  // Other common patterns
  'com.sg': true, 'edu.sg': true, 'gov.sg': true, // Singapore
  'com.my': true, 'edu.my': true, // Malaysia
  'com.hk': true, 'edu.hk': true, // Hong Kong
};

/**
 * Parse a domain into its hierarchical components
 * @param {string} domain - The domain name to parse (e.g., "ims.iitgn.ac.in")
 * @returns {object} Parsed domain structure with hierarchy array
 */
export function parseDomain(domain) {
  // Remove trailing dot if present
  const cleanDomain = domain.endsWith('.') ? domain.slice(0, -1) : domain;
  
  // Split into parts
  const parts = cleanDomain.split('.');
  
  // Build hierarchy from root to host
  const hierarchy = [
    {
      level: 0,
      name: '.',
      type: 'root',
      fullDomain: '.',
      description: 'Root Server'
    }
  ];
  
  let currentLevel = 1;
  
  // Check for known SLD patterns
  if (parts.length >= 2) {
    const potentialSLD = parts.slice(-2).join('.');
    const tld = parts[parts.length - 1];
    
    // Add TLD
    hierarchy.push({
      level: currentLevel++,
      name: tld,
      type: 'tld',
      fullDomain: tld + '.',
      description: `.${tld} TLD Server`
    });
    
    // Add SLD if it's a known pattern
    if (KNOWN_SLD_PATTERNS[potentialSLD]) {
      const sldName = parts[parts.length - 2];
      hierarchy.push({
        level: currentLevel++,
        name: sldName,
        type: 'sld',
        fullDomain: potentialSLD + '.',
        description: `.${potentialSLD} SLD Server`
      });
      
      // Add intermediate and host levels
      for (let i = parts.length - 3; i >= 0; i--) {
        const isHost = i === 0;
        const levelDomain = parts.slice(i).join('.');
        
        hierarchy.push({
          level: currentLevel++,
          name: parts[i],
          type: isHost ? 'authoritative' : 'intermediate',
          fullDomain: levelDomain + '.',
          description: isHost ? `Authoritative Server (${levelDomain})` : `${levelDomain} NS Server`
        });
      }
    } else {
      // No SLD, just add remaining levels
      for (let i = parts.length - 2; i >= 0; i--) {
        const isHost = i === 0;
        const levelDomain = parts.slice(i).join('.');
        
        hierarchy.push({
          level: currentLevel++,
          name: parts[i],
          type: isHost ? 'authoritative' : 'intermediate',
          fullDomain: levelDomain + '.',
          description: isHost ? `Authoritative Server (${levelDomain})` : `${levelDomain} NS Server`
        });
      }
    }
  } else if (parts.length === 1) {
    // Single label domain (e.g., "localhost" or "com")
    hierarchy.push({
      level: currentLevel++,
      name: parts[0],
      type: 'authoritative',
      fullDomain: parts[0] + '.',
      description: `Authoritative Server (${parts[0]})`
    });
  }
  
  return {
    originalDomain: cleanDomain,
    hierarchy,
    depth: hierarchy.length
  };
}

/**
 * Generate server hierarchy for visualization
 * @param {string} domain - The domain to generate servers for
 * @returns {Array} Array of server IDs in order
 */
export function generateServerHierarchy(domain) {
  const parsed = parseDomain(domain);
  const serverIds = ['client', 'browser_cache', 'os_cache', 'recursive_resolver'];
  
  // Add DNS hierarchy servers
  parsed.hierarchy.forEach(level => {
    if (level.type === 'root') {
      serverIds.push('root');
    } else if (level.type === 'tld') {
      serverIds.push('tld');
    } else if (level.type === 'sld') {
      serverIds.push('sld');
    } else if (level.type === 'intermediate') {
      serverIds.push(`intermediate_${level.level}`);
    } else if (level.type === 'authoritative') {
      serverIds.push('authoritative');
    }
  });
  
  return serverIds;
}

/**
 * Get server color based on type
 * @param {string} type - Server type
 * @returns {object} Color and gradient
 */
export function getServerColor(type) {
  const colors = {
    client: { color: '#10b981', gradient: ['#10b981', '#059669'] },
    browser_cache: { color: '#3b82f6', gradient: ['#3b82f6', '#2563eb'] },
    os_cache: { color: '#06b6d4', gradient: ['#06b6d4', '#0891b2'] },
    recursive_resolver: { color: '#f59e0b', gradient: ['#f59e0b', '#d97706'] },
    root: { color: '#8b5cf6', gradient: ['#8b5cf6', '#7c3aed'] },
    tld: { color: '#ec4899', gradient: ['#ec4899', '#db2777'] },
    sld: { color: '#fb923c', gradient: ['#fb923c', '#f97316'] },
    intermediate: { color: '#06b6d4', gradient: ['#06b6d4', '#0891b2'] },
    authoritative: { color: '#ef4444', gradient: ['#ef4444', '#dc2626'] }
  };
  
  return colors[type] || colors.authoritative;
}

/**
 * Get server icon based on type
 * @param {string} type - Server type
 * @returns {string} Emoji icon
 */
export function getServerIcon(type) {
  const icons = {
    client: '💻',
    browser_cache: '🗄️',
    os_cache: '💾',
    recursive_resolver: '🔄',
    root: '🌍',
    tld: '🏢',
    sld: '🏛️',
    intermediate: '🔗',
    authoritative: '📋'
  };
  
  return icons[type] || '📋';
}

export default {
  parseDomain,
  generateServerHierarchy,
  getServerColor,
  getServerIcon,
  KNOWN_SLD_PATTERNS
};
