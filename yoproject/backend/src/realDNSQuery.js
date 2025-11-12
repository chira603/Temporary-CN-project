/**
 * Real DNS Query Module
 * 
 * This module queries actual DNS servers to determine real delegation chains
 * and zone boundaries, rather than making assumptions about DNS hierarchy.
 */

const dns = require('dns').promises;
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

/**
 * Query nameservers for a domain with timing
 * @param {string} domain - Domain to query
 * @returns {Promise<Object>} Object with nameservers and query time
 */
async function getNameservers(domain) {
  const startTime = Date.now();
  try {
    const nameservers = await dns.resolveNs(domain);
    const queryTime = Date.now() - startTime;
    return { nameservers, queryTime };
  } catch (error) {
    const queryTime = Date.now() - startTime;
    // No NS records found - domain is not delegated
    return { nameservers: [], queryTime };
  }
}

/**
 * Get A record for a domain with timing
 * @param {string} domain - Domain to query
 * @returns {Promise<Object>} Object with addresses and query time
 */
async function getARecords(domain) {
  const startTime = Date.now();
  try {
    const addresses = await dns.resolve4(domain);
    const queryTime = Date.now() - startTime;
    return { addresses, queryTime };
  } catch (error) {
    const queryTime = Date.now() - startTime;
    return { addresses: [], queryTime };
  }
}

/**
 * Parse dig +trace output to extract delegation chain
 * @param {string} output - dig +trace command output
 * @returns {Array<Object>} Array of delegation stages
 */
function parseDigTrace(output) {
  const stages = [];
  const lines = output.split('\n');
  
  let currentStage = null;
  
  for (const line of lines) {
    // Skip comments and empty lines
    if (line.startsWith(';') || !line.trim()) {
      // Check for "Received from" comments to identify stage boundaries
      if (line.includes('Received') && line.includes('from') && currentStage) {
        const match = line.match(/from\s+([^#]+)#/);
        if (match) {
          currentStage.respondingServer = match[1].trim();
        }
      }
      continue;
    }
    
    // Parse NS records (delegation points)
    if (line.includes('\tNS\t')) {
      const parts = line.split(/\s+/);
      const domain = parts[0];
      const nameserver = parts[parts.length - 1];
      
      if (!currentStage || currentStage.domain !== domain) {
        // New delegation stage
        currentStage = {
          domain: domain,
          nameservers: [nameserver],
          type: domain === '.' ? 'root' : 
                domain.split('.').length === 2 ? 'tld' : 
                'authoritative'
        };
        stages.push(currentStage);
      } else {
        // Add to existing stage
        currentStage.nameservers.push(nameserver);
      }
    }
    
    // Parse A records (final answer)
    if (line.includes('\tA\t')) {
      const parts = line.split(/\s+/);
      const domain = parts[0];
      const ip = parts[parts.length - 1];
      
      stages.push({
        domain: domain,
        ip: ip,
        type: 'answer',
        isFinalAnswer: true
      });
    }
  }
  
  return stages;
}

/**
 * Perform DNS trace using dig +trace command
 * @param {string} domain - Domain to trace
 * @returns {Promise<Object>} Delegation chain information
 */
async function traceDNS(domain) {
  try {
    const { stdout, stderr } = await execPromise(`dig +trace ${domain} 2>&1`);
    
    // Check if dig command is available
    if (stderr && stderr.includes('command not found')) {
      throw new Error('dig command not available');
    }
    
    const stages = parseDigTrace(stdout);
    
    // Build delegation chain
    const delegationChain = {
      domain: domain,
      stages: stages,
      delegationLevels: stages.filter(s => s.type !== 'answer').length,
      hasRealDelegation: stages.length > 0
    };
    
    return delegationChain;
  } catch (error) {
    console.error(`Error tracing DNS for ${domain}:`, error.message);
    return null;
  }
}

/**
 * Determine zone boundaries for a domain by querying DNS
 * @param {string} domain - Domain to analyze
 * @returns {Promise<Object>} Zone boundary information
 */
async function determineZoneBoundaries(domain) {
  const parts = domain.split('.').reverse(); // Start from TLD
  const zoneBoundaries = [];
  const queryTimes = []; // Track timing for each query
  
  // Always include root
  zoneBoundaries.push({
    zone: '.',
    level: 'root',
    hasNS: true
  });
  
  // Build up from TLD
  let currentDomain = '';
  for (let i = 0; i < parts.length; i++) {
    currentDomain = i === 0 ? parts[i] : `${parts[i]}.${currentDomain}`;
    
    const { nameservers, queryTime } = await getNameservers(currentDomain);
    queryTimes.push({ domain: currentDomain, queryTime });
    const hasNS = nameservers.length > 0;
    
    let level = 'authoritative';
    if (i === 0) level = 'tld';
    else if (i === 1 && parts[0] === 'in' && currentDomain.endsWith('.in')) {
      // Special case for .in domains (ac.in, co.in, etc.)
      level = 'sld';
    }
    
    zoneBoundaries.push({
      zone: currentDomain,
      level: level,
      hasNS: hasNS,
      nameservers: nameservers,
      isDelegated: hasNS,
      queryTime: queryTime // Include actual query time
    });
    
    // If no NS records, this is not a zone boundary
    if (!hasNS && i !== parts.length - 1) {
      zoneBoundaries[zoneBoundaries.length - 1].note = 'No delegation - served by parent zone';
    }
  }
  
  return {
    domain: domain,
    boundaries: zoneBoundaries,
    actualZones: zoneBoundaries.filter(b => b.isDelegated),
    nonDelegatedLevels: zoneBoundaries.filter(b => !b.isDelegated),
    queryTimes: queryTimes // Include all query times for verification
  };
}

/**
 * Get real DNS delegation chain for a domain
 * Uses both dig +trace and direct NS queries
 * @param {string} domain - Domain to query
 * @returns {Promise<Object>} Complete DNS delegation information
 */
async function getRealDelegationChain(domain) {
  const startTime = Date.now();
  
  const [traceResult, boundariesResult, aRecordsResult] = await Promise.all([
    traceDNS(domain),
    determineZoneBoundaries(domain),
    getARecords(domain)
  ]);
  
  const totalTime = Date.now() - startTime;
  
  return {
    domain: domain,
    traceResult: traceResult,
    zoneBoundaries: boundariesResult,
    finalIP: aRecordsResult.addresses.length > 0 ? aRecordsResult.addresses[0] : null,
    allIPs: aRecordsResult.addresses,
    aRecordQueryTime: aRecordsResult.queryTime, // Include A record query time
    totalQueryTime: totalTime, // Total time for all queries
    timestamp: new Date().toISOString(),
    
    // Summary for easy consumption
    summary: {
      totalStages: traceResult?.stages?.length || boundariesResult.actualZones.length,
      actualDelegationLevels: boundariesResult.actualZones.map(z => z.zone),
      nonDelegatedSubdomains: boundariesResult.nonDelegatedLevels.map(z => z.zone),
      delegationPath: boundariesResult.actualZones.map(z => ({
        zone: z.zone,
        level: z.level,
        nameservers: z.nameservers,
        queryTime: z.queryTime // Include timing for each zone
      })),
      // Timing breakdown for verification
      timingBreakdown: {
        nsQueries: boundariesResult.queryTimes,
        aRecordQuery: aRecordsResult.queryTime,
        totalTime: totalTime
      }
    }
  };
}

/**
 * Compare real DNS vs simulated DNS for educational purposes
 * @param {string} domain - Domain to analyze
 * @param {Object} simulatedStages - Simulated delegation stages
 * @returns {Promise<Object>} Comparison result
 */
async function compareRealVsSimulated(domain, simulatedStages) {
  const realDNS = await getRealDelegationChain(domain);
  
  const comparison = {
    domain: domain,
    real: realDNS.summary,
    simulated: {
      totalStages: simulatedStages.length,
      levels: simulatedStages.map(s => s.level || s.name)
    },
    differences: [],
    isAccurate: true
  };
  
  // Check for fictional servers
  const realLevels = new Set(realDNS.summary.actualDelegationLevels);
  const simulatedLevels = simulatedStages.map(s => s.level || s.name);
  
  for (const simLevel of simulatedLevels) {
    if (!realLevels.has(simLevel) && simLevel !== 'recursive') {
      comparison.differences.push({
        type: 'fictional_server',
        level: simLevel,
        message: `Simulated server for "${simLevel}" does not exist in real DNS`
      });
      comparison.isAccurate = false;
    }
  }
  
  // Check for missing delegations
  for (const realZone of realDNS.zoneBoundaries.actualZones) {
    const found = simulatedLevels.some(l => l.includes(realZone.zone.replace(/\.$/, '')));
    if (!found && realZone.zone !== '.') {
      comparison.differences.push({
        type: 'missing_delegation',
        zone: realZone.zone,
        message: `Real delegation for "${realZone.zone}" not shown in simulation`
      });
    }
  }
  
  return comparison;
}

module.exports = {
  getNameservers,
  getARecords,
  traceDNS,
  determineZoneBoundaries,
  getRealDelegationChain,
  compareRealVsSimulated
};
