const dns = require('dns').promises;
const dnsPacket = require('dns-packet');
const NodeCache = require('node-cache');
const dgram = require('dgram');

// Simulated cache with TTL
const browserCache = new NodeCache({ stdTTL: 300 });
const osCache = new NodeCache({ stdTTL: 600 });
const resolverCache = new NodeCache({ stdTTL: 3600 });

// DNS Server configurations
const DNS_SERVERS = {
  root: [
    { name: 'a.root-servers.net', ip: '198.41.0.4', description: 'Root Server A' },
    { name: 'm.root-servers.net', ip: '202.12.27.33', description: 'Root Server M' }
  ],
  recursive: [
    { name: 'Google DNS', ip: '8.8.8.8', description: 'Google Public DNS' },
    { name: 'Cloudflare DNS', ip: '1.1.1.1', description: 'Cloudflare DNS' }
  ]
};

// Record type mappings
const RECORD_TYPES = {
  'A': 1,
  'AAAA': 28,
  'CNAME': 5,
  'MX': 15,
  'NS': 2,
  'TXT': 16,
  'SOA': 6,
  'PTR': 12
};

class DNSResolver {
  constructor() {
    this.steps = [];
    this.totalTime = 0;
    this.retryAttempts = {};
  }

  async resolve(domain, recordType = 'A', mode = 'recursive', config = {}) {
    this.steps = [];
    this.totalTime = 0;
    this.retryAttempts = {};
    const startTime = Date.now();

    const settings = {
      cacheEnabled: config.cacheEnabled !== false,
      cacheTTL: config.cacheTTL || 300,
      networkLatency: config.networkLatency || 50,
      packetLoss: config.packetLoss || 0,
      maxRetries: config.maxRetries || 3,
      dnssecEnabled: config.dnssecEnabled || false,
      customDNS: config.customDNS || null,
      simulateFailures: config.simulateFailures || false
    };

    try {
      // Step 1: Check browser cache
      await this.checkBrowserCache(domain, recordType, settings);

      // Step 2: Check OS cache
      await this.checkOSCache(domain, recordType, settings);

      // Step 3: Query recursive resolver or perform iterative resolution
      if (mode === 'recursive') {
        await this.recursiveResolution(domain, recordType, settings);
      } else {
        await this.iterativeResolution(domain, recordType, settings);
      }

      this.totalTime = Date.now() - startTime;

      return {
        success: true,
        domain,
        recordType,
        mode,
        steps: this.steps,
        totalTime: this.totalTime,
        config: settings
      };
    } catch (error) {
      this.totalTime = Date.now() - startTime;
      return {
        success: false,
        domain,
        recordType,
        mode,
        error: error.message,
        steps: this.steps,
        totalTime: this.totalTime,
        config: settings
      };
    }
  }

  async checkBrowserCache(domain, recordType, settings) {
    const stepStart = Date.now();
    await this.simulateLatency(10);

    const cacheKey = `${domain}:${recordType}`;
    const cached = settings.cacheEnabled ? browserCache.get(cacheKey) : null;

    this.steps.push({
      stage: 'browser_cache',
      name: 'Browser Cache Lookup',
      description: 'Checking if the DNS record exists in the browser\'s local cache',
      server: { name: 'Browser Cache', type: 'cache' },
      query: {
        domain,
        type: recordType,
        class: 'IN'
      },
      response: cached ? {
        found: true,
        records: cached.records,
        ttl: cached.ttl,
        cached: true
      } : {
        found: false,
        message: 'Cache miss - record not found in browser cache'
      },
      timing: Date.now() - stepStart,
      packet: this.generatePacket(domain, recordType, cached),
      explanation: cached 
        ? 'Cache hit! The browser has a cached copy of this DNS record, avoiding network queries.'
        : 'Cache miss. The browser doesn\'t have this record cached, proceeding to OS cache.'
    });

    if (cached) {
      throw new Error('CACHE_HIT'); // Stop resolution early
    }
  }

  async checkOSCache(domain, recordType, settings) {
    const stepStart = Date.now();
    await this.simulateLatency(20);

    const cacheKey = `${domain}:${recordType}`;
    const cached = settings.cacheEnabled ? osCache.get(cacheKey) : null;

    this.steps.push({
      stage: 'os_cache',
      name: 'Operating System Cache Lookup',
      description: 'Checking the OS-level DNS cache (resolver cache)',
      server: { name: 'OS Resolver Cache', type: 'cache' },
      query: {
        domain,
        type: recordType,
        class: 'IN'
      },
      response: cached ? {
        found: true,
        records: cached.records,
        ttl: cached.ttl,
        cached: true
      } : {
        found: false,
        message: 'Cache miss - record not found in OS cache'
      },
      timing: Date.now() - stepStart,
      packet: this.generatePacket(domain, recordType, cached),
      explanation: cached
        ? 'Cache hit at OS level! The operating system has cached this DNS record.'
        : 'Cache miss. The OS doesn\'t have this record cached, proceeding to DNS servers.'
    });

    if (cached) {
      throw new Error('CACHE_HIT');
    }
  }

  async simulatePacketLossWithRetry(stageName, sourceServer, targetServer, settings, queryInfo) {
    const maxRetries = settings.maxRetries || 3;
    let attempt = 0;
    let success = false;

    while (attempt < maxRetries && !success) {
      attempt++;
      const attemptStart = Date.now();

      // Check if packet loss occurs
      const packetLost = Math.random() < (settings.packetLoss / 100);

      if (packetLost && attempt < maxRetries) {
        // Packet loss occurred
        const lossPoint = 0.3 + Math.random() * 0.4; // Random point between 30-70%

        this.steps.push({
          stage: 'packet_loss',
          name: `Packet Loss - Attempt ${attempt}`,
          description: `Network packet was lost during transmission to ${targetServer.name}`,
          server: targetServer,
          query: queryInfo,
          timing: Date.now() - attemptStart,
          packetLoss: {
            occurred: true,
            lossPoint: lossPoint,
            attempt: attempt,
            maxRetries: maxRetries
          },
          latency: settings.networkLatency,
          explanation: `Packet was lost at ${Math.round(lossPoint * 100)}% of the journey. Implementing exponential backoff retry strategy.`
        });

        // Exponential backoff delay
        const backoffDelay = Math.pow(2, attempt - 1) * 1000;
        await this.simulateLatency(backoffDelay);
      } else {
        // Packet successfully delivered
        success = true;
        if (attempt > 1) {
          this.steps.push({
            stage: 'packet_retry_success',
            name: `Retry Successful - Attempt ${attempt}`,
            description: `Packet successfully delivered after ${attempt - 1} failed attempt(s)`,
            server: targetServer,
            query: queryInfo,
            timing: Date.now() - attemptStart,
            packetLoss: {
              occurred: false,
              attempt: attempt,
              maxRetries: maxRetries,
              retriesNeeded: attempt - 1
            },
            latency: settings.networkLatency,
            explanation: `After ${attempt - 1} failed attempt(s), the packet was successfully delivered using exponential backoff retry strategy.`
          });
        }
      }
    }

    if (!success) {
      // All retries exhausted
      this.steps.push({
        stage: 'packet_loss_fatal',
        name: 'All Retries Exhausted',
        description: `Failed to deliver packet after ${maxRetries} attempts`,
        server: targetServer,
        query: queryInfo,
        timing: Date.now() - attemptStart,
        packetLoss: {
          occurred: true,
          attempt: maxRetries,
          maxRetries: maxRetries,
          fatal: true
        },
        explanation: `All ${maxRetries} retry attempts failed. In real scenarios, this would result in a DNS resolution timeout error.`
      });
      throw new Error('PACKET_LOSS_FATAL');
    }

    return success;
  }

  async recursiveResolution(domain, recordType, settings) {
    const stepStart = Date.now();
    const queryTimestamp = Date.now(); // Client-side timestamp when query is sent
    
    await this.simulateLatency(settings.networkLatency);

    // Query recursive resolver
    const resolver = settings.customDNS || DNS_SERVERS.recursive[0];

    // Simulate packet loss with retry for the query
    if (settings.packetLoss > 0) {
      try {
        await this.simulatePacketLossWithRetry(
          'recursive_resolver',
          { name: 'Client', type: 'client' },
          resolver,
          settings,
          { domain, type: recordType, class: 'IN', recursionDesired: true }
        );
      } catch (error) {
        if (error.message === 'PACKET_LOSS_FATAL') {
          throw error;
        }
      }
    }
    
    const responseTimestamp = Date.now(); // Client-side timestamp when response received
    const rtt = responseTimestamp - queryTimestamp; // Measured Round-Trip Time
    
    this.steps.push({
      stage: 'recursive_resolver',
      name: 'Recursive Resolver Query',
      description: `Sending query to recursive DNS resolver (${resolver.name})`,
      server: resolver,
      query: {
        domain,
        type: recordType,
        class: 'IN',
        recursionDesired: true
      },
      timing: Date.now() - stepStart,
      timingDetails: {
        queryTimestamp: queryTimestamp,
        responseTimestamp: responseTimestamp,
        rtt: rtt,
        measured: true,
        explanation: 'RTT measured by client: time from sending query to receiving response'
      },
      packet: this.generateQueryPacket(domain, recordType, true),
      explanation: 'The recursive resolver will handle all the work of finding the authoritative answer by querying multiple servers if needed.'
    });

    // Simulate the recursive resolver doing its work
    // This returns the result from the authoritative server
    const result = await this.simulateRecursiveResolverWork(domain, recordType, settings);

    // Check if the result is simulated (query failed)
    const isSimulated = result.records && result.records.some(r => r.simulated);
    const querySucceeded = !isSimulated;

    const responseTime = Date.now() - stepStart;
    this.steps.push({
      stage: 'recursive_to_client_response',
      name: '⬅️ Recursive Resolver → Client',
      description: querySucceeded
        ? 'Recursive resolver returns final answer to client'
        : 'Recursive resolver returns error to client',
      server: resolver,
      response: {
        found: querySucceeded,
        records: querySucceeded ? result.records : [],
        ttl: result.ttl,
        rcode: querySucceeded ? 'NOERROR' : 'NXDOMAIN',
        authoritative: false,
        recursionAvailable: true,
        error: isSimulated ? 'DNS resolution failed' : undefined
      },
      timing: responseTime,
      messageType: 'RESPONSE',
      direction: 'response',
      packet: this.generateResponsePacket(domain, recordType, result),
      explanation: querySucceeded
        ? `✅ The recursive resolver successfully resolved ${domain} and returns the answer to the client. The resolver did all the work (queried root, TLD, and authoritative servers), and the client receives the final answer with RA (Recursion Available) = 1. This response will be cached for ${result.ttl} seconds. Total resolution involved 3 queries and 3 responses internally.`
        : `❌ The recursive resolver could not resolve ${domain}. After querying root → TLD → authoritative servers, the final result is NXDOMAIN (domain does not exist) or SERVFAIL. This error is returned to the client.`
    });

    // Cache the result
    if (settings.cacheEnabled) {
      const cacheKey = `${domain}:${recordType}`;
      browserCache.set(cacheKey, result, result.ttl);
      osCache.set(cacheKey, result, result.ttl);
    }
  }

  async simulateRecursiveResolverWork(domain, recordType, settings) {
    // This simulates what the recursive resolver does internally
    // CORRECT FLOW: Each query has a corresponding response
    const parts = domain.split('.');
    const tld = parts[parts.length - 1];
    const sld = parts.slice(-2).join('.');

    // Step 1: Recursive Resolver → Root Server (QUERY)
    const rootQueryStart = Date.now();
    await this.simulateLatency(settings.networkLatency);
    const rootQuerySent = Date.now();
    
    this.steps.push({
      stage: 'recursive_to_root_query',
      name: '🔄 Recursive Resolver → Root Server',
      description: 'Recursive resolver queries root server for TLD information',
      server: DNS_SERVERS.root[0],
      query: { domain, type: recordType, class: 'IN' },
      timing: settings.networkLatency,
      timingDetails: {
        queryTimestamp: rootQueryStart,
        sentTimestamp: rootQuerySent,
        measured: true,
        networkDelay: settings.networkLatency,
        explanation: 'Query transmission time from resolver to root server'
      },
      messageType: 'QUERY',
      direction: 'request',
      explanation: `Recursive resolver asks root server: "Where can I find information about .${tld} domains?"`
    });

    // Step 2: Root Server → Recursive Resolver (RESPONSE - Referral)
    const rootProcessingTime = 5 + Math.floor(Math.random() * 10); // Simulated server processing
    await this.simulateLatency(settings.networkLatency + rootProcessingTime);
    const rootResponseReceived = Date.now();
    const rootRTT = rootResponseReceived - rootQueryStart;
    
    this.steps.push({
      stage: 'root_to_recursive_response',
      name: '⬅️ Root Server → Recursive Resolver',
      description: `Root server responds with referral to .${tld} TLD servers`,
      server: DNS_SERVERS.root[0],
      response: {
        found: false,
        referral: true,
        nameservers: [`a.${tld}-servers.net`, `b.${tld}-servers.net`],
        glueRecords: [
          { name: `a.${tld}-servers.net`, ip: '192.5.6.30' },
          { name: `b.${tld}-servers.net`, ip: '192.33.4.12' }
        ],
        rcode: 'NOERROR',
        authoritative: false
      },
      timing: rootRTT,
      timingDetails: {
        responseTimestamp: rootResponseReceived,
        rtt: rootRTT,
        networkDelay: settings.networkLatency * 2, // Round trip
        serverProcessing: rootProcessingTime,
        measured: true,
        breakdown: `RTT: ${rootRTT}ms = Network (${settings.networkLatency * 2}ms) + Server Processing (${rootProcessingTime}ms)`,
        explanation: 'Total time from query sent to response received at recursive resolver'
      },
      messageType: 'RESPONSE',
      direction: 'response',
      explanation: `Root server responds: "I don't have the answer, but the .${tld} TLD nameservers do. Here are their addresses (glue records): a.${tld}-servers.net = 192.5.6.30"`
    });

    // Step 3: Recursive Resolver → TLD Server (QUERY)
    const tldQueryStart = Date.now();
    await this.simulateLatency(settings.networkLatency);
    const tldQuerySent = Date.now();
    
    this.steps.push({
      stage: 'recursive_to_tld_query',
      name: `🔄 Recursive Resolver → .${tld} TLD Server`,
      description: `Recursive resolver queries .${tld} TLD server for ${sld} nameservers`,
      server: { name: `a.${tld}-servers.net`, ip: '192.5.6.30', type: 'tld' },
      query: { domain, type: recordType, class: 'IN' },
      timing: settings.networkLatency,
      timingDetails: {
        queryTimestamp: tldQueryStart,
        sentTimestamp: tldQuerySent,
        measured: true,
        networkDelay: settings.networkLatency,
        explanation: 'Query transmission time from resolver to TLD server'
      },
      messageType: 'QUERY',
      direction: 'request',
      explanation: `Recursive resolver asks TLD server: "Where can I find the authoritative nameservers for ${sld}?"`
    });

    // Step 4: TLD Server → Recursive Resolver (RESPONSE - Referral)
    const tldProcessingTime = 8 + Math.floor(Math.random() * 15); // TLD processing time
    await this.simulateLatency(settings.networkLatency + tldProcessingTime);
    const tldResponseReceived = Date.now();
    const tldRTT = tldResponseReceived - tldQueryStart;
    
    this.steps.push({
      stage: 'tld_to_recursive_response',
      name: `⬅️ .${tld} TLD Server → Recursive Resolver`,
      description: `TLD server responds with referral to ${sld} authoritative servers`,
      server: { name: `a.${tld}-servers.net`, ip: '192.5.6.30', type: 'tld' },
      response: {
        found: false,
        referral: true,
        nameservers: [`ns1.${sld}`, `ns2.${sld}`],
        glueRecords: [
          { name: `ns1.${sld}`, ip: '93.184.216.34' },
          { name: `ns2.${sld}`, ip: '93.184.216.35' }
        ],
        rcode: 'NOERROR',
        authoritative: false
      },
      timing: tldRTT,
      timingDetails: {
        responseTimestamp: tldResponseReceived,
        rtt: tldRTT,
        networkDelay: settings.networkLatency * 2,
        serverProcessing: tldProcessingTime,
        measured: true,
        breakdown: `RTT: ${tldRTT}ms = Network (${settings.networkLatency * 2}ms) + Server Processing (${tldProcessingTime}ms)`,
        explanation: 'Total time from query sent to response received at recursive resolver'
      },
      messageType: 'RESPONSE',
      direction: 'response',
      explanation: `TLD server responds: "The authoritative nameservers for ${sld} are ns1.${sld} and ns2.${sld}. Here are their IP addresses (glue records): ns1.${sld} = 93.184.216.34"`
    });

    // Step 5: Recursive Resolver → Authoritative Server (QUERY)
    const authQueryStart = Date.now();
    await this.simulateLatency(settings.networkLatency);
    const authQuerySent = Date.now();
    
    this.steps.push({
      stage: 'recursive_to_auth_query',
      name: `🔄 Recursive Resolver → Authoritative Server`,
      description: `Recursive resolver queries authoritative nameserver for final answer`,
      server: { name: `ns1.${sld}`, ip: '93.184.216.34', type: 'authoritative' },
      query: { domain, type: recordType, class: 'IN' },
      timing: settings.networkLatency,
      timingDetails: {
        queryTimestamp: authQueryStart,
        sentTimestamp: authQuerySent,
        measured: true,
        networkDelay: settings.networkLatency,
        explanation: 'Query transmission time from resolver to authoritative server'
      },
      messageType: 'QUERY',
      direction: 'request',
      explanation: `Recursive resolver asks authoritative server: "What is the ${recordType} record for ${domain}?"`
    });

    // Step 6: Get actual DNS result
    const result = await this.performActualDNSQuery(domain, recordType);
    const isSimulated = result.records && result.records.some(r => r.simulated);
    const querySucceeded = !isSimulated;

    // Step 7: Authoritative Server → Recursive Resolver (RESPONSE - Answer)
    const authProcessingTime = 10 + Math.floor(Math.random() * 20); // Auth server processing
    await this.simulateLatency(settings.networkLatency + authProcessingTime);
    const authResponseReceived = Date.now();
    const authRTT = authResponseReceived - authQueryStart;
    
    this.steps.push({
      stage: 'auth_to_recursive_response',
      name: `⬅️ Authoritative Server → Recursive Resolver`,
      description: querySucceeded
        ? `Authoritative server provides final answer`
        : `Authoritative server returns NXDOMAIN error`,
      server: { name: `ns1.${sld}`, ip: '93.184.216.34', type: 'authoritative' },
      response: {
        found: querySucceeded,
        records: querySucceeded ? result.records : [],
        ttl: result.ttl,
        rcode: querySucceeded ? 'NOERROR' : 'NXDOMAIN',
        authoritative: true,
        recursionAvailable: false
      },
      timing: authRTT,
      timingDetails: {
        responseTimestamp: authResponseReceived,
        rtt: authRTT,
        networkDelay: settings.networkLatency * 2,
        serverProcessing: authProcessingTime,
        measured: true,
        breakdown: `RTT: ${authRTT}ms = Network (${settings.networkLatency * 2}ms) + Server Processing (${authProcessingTime}ms)`,
        explanation: 'Total time from query sent to response received at recursive resolver'
      },
      messageType: 'RESPONSE',
      direction: 'response',
      packet: this.generateResponsePacket(domain, recordType, result),
      explanation: querySucceeded
        ? `✅ Authoritative server responds with the answer: ${domain} = ${result.records.map(r => r.address || r.value || JSON.stringify(r)).join(', ')}. This is the FINAL ANSWER with AA (Authoritative Answer) flag set. TTL = ${result.ttl} seconds.`
        : `❌ Authoritative server responds: Domain ${domain} does not exist (NXDOMAIN). This is an authoritative answer that the domain is not configured.`
    });

    // DNSSEC validation if enabled (happens during the above queries)
    if (settings.dnssecEnabled) {
      await this.simulateDNSSECValidation(domain, recordType, settings);
    }

    // Return the result so the recursive resolver can use it
    return result;
  }

  async simulateDNSSECValidation(domain, recordType, settings) {
    const parts = domain.split('.');
    const tld = parts[parts.length - 1];
    const sld = parts.slice(-2).join('.');

    // Simulate DNSSEC failure if configured
    const simulateFailure = settings.simulateDNSSECFailure || false;

    // Step 1: Retrieve Root DNSKEY
    await this.simulateLatency(20);
    this.steps.push({
      stage: 'dnssec_root_dnskey',
      name: 'DNSSEC: Root DNSKEY Retrieval',
      description: 'Retrieving DNSKEY from root zone',
      timing: 20,
      dnssec: {
        level: 'root',
        recordType: 'DNSKEY',
        keyTag: 20326,
        algorithm: 'RSASHA256',
        publicKey: '(simulated public key)',
        valid: true
      },
      explanation: 'The root DNSKEY is the trust anchor for the entire DNSSEC chain. This public key is pre-configured in the resolver.'
    });

    // Step 2: Verify Root DS Record for TLD
    await this.simulateLatency(25);
    this.steps.push({
      stage: 'dnssec_root_ds',
      name: `DNSSEC: Root DS for .${tld}`,
      description: `Verifying DS record for .${tld} TLD in root zone`,
      timing: 25,
      dnssec: {
        level: 'root',
        recordType: 'DS',
        keyTag: 19718,
        algorithm: 'RSASHA256',
        digestType: 'SHA256',
        digest: '(simulated digest hash)',
        valid: !simulateFailure
      },
      explanation: `The DS (Delegation Signer) record in the root zone points to the DNSKEY of the .${tld} TLD, establishing the chain of trust.`
    });

    if (simulateFailure) {
      this.steps.push({
        stage: 'dnssec_validation_failed',
        name: 'DNSSEC Validation Failed',
        description: 'DS record verification failed',
        timing: 10,
        dnssec: {
          level: 'root',
          valid: false,
          error: 'DS digest mismatch',
          securityRisk: 'high'
        },
        explanation: 'DNSSEC validation failed! The DS record digest does not match the TLD DNSKEY. This could indicate DNS spoofing or misconfiguration.'
      });
      return;
    }

    // Step 3: Retrieve TLD DNSKEY
    await this.simulateLatency(30);
    this.steps.push({
      stage: 'dnssec_tld_dnskey',
      name: `DNSSEC: .${tld} DNSKEY Retrieval`,
      description: `Retrieving DNSKEY from .${tld} TLD zone`,
      timing: 30,
      dnssec: {
        level: 'tld',
        recordType: 'DNSKEY',
        keyTag: 19718,
        algorithm: 'RSASHA256',
        publicKey: '(simulated TLD public key)',
        flags: 257, // KSK (Key Signing Key)
        valid: true
      },
      explanation: `The .${tld} TLD DNSKEY is used to verify signatures on records within the TLD zone, including DS records for second-level domains.`
    });

    // Step 4: Verify TLD DS Record for domain
    await this.simulateLatency(25);
    this.steps.push({
      stage: 'dnssec_tld_ds',
      name: `DNSSEC: TLD DS for ${sld}`,
      description: `Verifying DS record for ${sld} in .${tld} zone`,
      timing: 25,
      dnssec: {
        level: 'tld',
        recordType: 'DS',
        keyTag: 12345,
        algorithm: 'RSASHA256',
        digestType: 'SHA256',
        digest: '(simulated domain digest)',
        valid: true
      },
      explanation: `The DS record in the .${tld} zone points to the DNSKEY of ${sld}, continuing the chain of trust.`
    });

    // Step 5: Retrieve Authoritative DNSKEY
    await this.simulateLatency(30);
    this.steps.push({
      stage: 'dnssec_auth_dnskey',
      name: `DNSSEC: ${sld} DNSKEY Retrieval`,
      description: `Retrieving DNSKEY from ${sld} authoritative zone`,
      timing: 30,
      dnssec: {
        level: 'authoritative',
        recordType: 'DNSKEY',
        keyTag: 12345,
        algorithm: 'RSASHA256',
        publicKey: '(simulated auth public key)',
        flags: 256, // ZSK (Zone Signing Key)
        valid: true
      },
      explanation: `The ${sld} DNSKEY is used to verify RRSIG signatures on actual DNS records (A, AAAA, etc.) in the zone.`
    });

    // Step 6: Verify RRSIG for the actual record
    await this.simulateLatency(20);
    const now = new Date();
    const inception = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    const expiration = new Date(now.getTime() + 23 * 24 * 60 * 60 * 1000); // 23 days from now

    this.steps.push({
      stage: 'dnssec_rrsig_verify',
      name: `DNSSEC: RRSIG Verification for ${recordType} Record`,
      description: `Verifying RRSIG signature on ${recordType} record for ${domain}`,
      timing: 20,
      dnssec: {
        level: 'authoritative',
        recordType: 'RRSIG',
        typeCovered: recordType,
        algorithm: 'RSASHA256',
        labels: parts.length,
        originalTTL: 300,
        signatureExpiration: expiration.toISOString(),
        signatureInception: inception.toISOString(),
        keyTag: 12345,
        signerName: sld,
        signature: '(simulated signature)',
        valid: true,
        daysUntilExpiration: 23
      },
      explanation: `The RRSIG (Resource Record Signature) proves that the ${recordType} record was signed by the zone owner and hasn't been modified. Signature is valid for ${23} more days.`
    });

    // Step 7: Final validation summary
    await this.simulateLatency(10);
    this.steps.push({
      stage: 'dnssec_validation_complete',
      name: 'DNSSEC Validation Complete',
      description: 'Full chain of trust validated successfully',
      timing: 10,
      dnssec: {
        level: 'summary',
        chainOfTrust: [
          { level: 'root', status: 'valid', keyTag: 20326 },
          { level: 'tld', status: 'valid', keyTag: 19718 },
          { level: 'authoritative', status: 'valid', keyTag: 12345 }
        ],
        securityScore: 100,
        validated: true,
        message: 'Complete DNSSEC chain of trust validated successfully'
      },
      explanation: 'All DNSSEC signatures have been verified. The DNS response is cryptographically proven to be authentic and unmodified.'
    });
  }

  async iterativeResolution(domain, recordType, settings) {
    // In iterative mode, the CLIENT does all the work
    // Each server returns a referral, and the client follows it
    const parts = domain.split('.');
    const tld = parts[parts.length - 1];
    const sld = parts.slice(-2).join('.');

    // Step 1: Client → Root Server (QUERY)
    const stepStart1 = Date.now();
    await this.simulateLatency(settings.networkLatency);

    this.steps.push({
      stage: 'client_to_root_query',
      name: '🔄 Client → Root Server',
      description: 'Client queries root server directly (iterative mode)',
      server: DNS_SERVERS.root[0],
      query: {
        domain,
        type: recordType,
        class: 'IN',
        recursionDesired: false
      },
      timing: Date.now() - stepStart1,
      messageType: 'QUERY',
      direction: 'request',
      packet: this.generateQueryPacket(domain, recordType, false),
      explanation: `Client asks root server: "What is the ${recordType} record for ${domain}?" with RD (Recursion Desired) = 0, meaning "just give me a referral, I'll do the work."`
    });

    // Step 2: Root Server → Client (RESPONSE - Referral)
    await this.simulateLatency(settings.networkLatency);
    this.steps.push({
      stage: 'root_to_client_response',
      name: '⬅️ Root Server → Client',
      description: `Root server responds with referral to .${tld} TLD servers`,
      server: DNS_SERVERS.root[0],
      response: {
        found: false,
        referral: true,
        nameservers: [`a.${tld}-servers.net`, `b.${tld}-servers.net`],
        glueRecords: [
          { name: `a.${tld}-servers.net`, ip: '192.5.6.30' },
          { name: `b.${tld}-servers.net`, ip: '192.33.4.12' }
        ],
        rcode: 'NOERROR',
        authoritative: false
      },
      timing: settings.networkLatency,
      messageType: 'RESPONSE',
      direction: 'response',
      packet: this.generateQueryPacket(domain, recordType, false),
      explanation: `Root server responds: "I don't have that answer. Try asking the .${tld} TLD nameservers at these addresses (glue records provided): a.${tld}-servers.net = 192.5.6.30"`
    });

    // Step 3: Client → TLD Server (QUERY)
    const stepStart2 = Date.now();
    await this.simulateLatency(settings.networkLatency);

    this.steps.push({
      stage: 'client_to_tld_query',
      name: `🔄 Client → .${tld} TLD Server`,
      description: `Client follows referral and queries .${tld} TLD server`,
      server: { name: `a.${tld}-servers.net`, ip: '192.5.6.30', type: 'tld' },
      query: {
        domain,
        type: recordType,
        class: 'IN',
        recursionDesired: false
      },
      timing: Date.now() - stepStart2,
      messageType: 'QUERY',
      direction: 'request',
      packet: this.generateQueryPacket(domain, recordType, false),
      explanation: `Client uses the glue record to contact the TLD server and asks: "What is the ${recordType} record for ${domain}?"`
    });

    // Step 4: TLD Server → Client (RESPONSE - Referral)
    await this.simulateLatency(settings.networkLatency);
    this.steps.push({
      stage: 'tld_to_client_response',
      name: `⬅️ .${tld} TLD Server → Client`,
      description: `TLD server responds with referral to ${sld} authoritative servers`,
      server: { name: `a.${tld}-servers.net`, ip: '192.5.6.30', type: 'tld' },
      response: {
        found: false,
        referral: true,
        nameservers: [`ns1.${sld}`, `ns2.${sld}`],
        glueRecords: [
          { name: `ns1.${sld}`, ip: '93.184.216.34' },
          { name: `ns2.${sld}`, ip: '93.184.216.35' }
        ],
        rcode: 'NOERROR',
        authoritative: false
      },
      timing: settings.networkLatency,
      messageType: 'RESPONSE',
      direction: 'response',
      packet: this.generateQueryPacket(domain, recordType, false),
      explanation: `TLD server responds: "I don't have that answer. The authoritative nameservers for ${sld} are ns1.${sld} and ns2.${sld}. Here are their IP addresses (glue records): ns1.${sld} = 93.184.216.34"`
    });

    // Step 5: Client → Authoritative Server (QUERY)
    const stepStart3 = Date.now();
    await this.simulateLatency(settings.networkLatency);

    const result = await this.performActualDNSQuery(domain, recordType);
    const isSimulated = result.records && result.records.some(r => r.simulated);
    const querySucceeded = !isSimulated;

    this.steps.push({
      stage: 'client_to_auth_query',
      name: `🔄 Client → Authoritative Server`,
      description: `Client queries authoritative nameserver for final answer`,
      server: { name: `ns1.${sld}`, ip: '93.184.216.34', type: 'authoritative' },
      query: {
        domain,
        type: recordType,
        class: 'IN',
        recursionDesired: false
      },
      timing: Date.now() - stepStart3,
      messageType: 'QUERY',
      direction: 'request',
      packet: this.generateQueryPacket(domain, recordType, false),
      explanation: `Client contacts the authoritative server and asks: "What is the ${recordType} record for ${domain}?"`
    });

    // Step 6: Authoritative Server → Client (RESPONSE - Final Answer)
    await this.simulateLatency(settings.networkLatency);
    this.steps.push({
      stage: 'auth_to_client_response',
      name: `⬅️ Authoritative Server → Client`,
      description: querySucceeded
        ? `Authoritative server provides final answer to client`
        : `Authoritative server returns NXDOMAIN - domain not found`,
      server: { name: `ns1.${sld}`, ip: '93.184.216.34', type: 'authoritative' },
      response: {
        found: querySucceeded,
        records: querySucceeded ? result.records : [],
        ttl: result.ttl,
        rcode: querySucceeded ? 'NOERROR' : 'NXDOMAIN',
        authoritative: true,
        recursionAvailable: false,
        error: isSimulated ? 'DNS resolution failed' : undefined
      },
      timing: settings.networkLatency,
      messageType: 'RESPONSE',
      direction: 'response',
      packet: this.generateResponsePacket(domain, recordType, result),
      explanation: querySucceeded
        ? `✅ Authoritative server responds with the FINAL ANSWER: ${domain} = ${result.records.map(r => r.address || r.value || JSON.stringify(r)).join(', ')}. The AA (Authoritative Answer) flag is set to 1. Resolution complete! TTL = ${result.ttl} seconds. The client now has the answer after following 3 referrals.`
        : `❌ Authoritative server authoritatively states that ${domain} does not exist (NXDOMAIN). This is a definitive answer that the domain is not configured in this zone.`
    });

    // Cache the result
    if (settings.cacheEnabled && querySucceeded) {
      const cacheKey = `${domain}:${recordType}`;
      browserCache.set(cacheKey, result, result.ttl);
      osCache.set(cacheKey, result, result.ttl);
    }
  }

  async performActualDNSQuery(domain, recordType) {
    try {
      let records = [];
      let ttl = 300;

      switch (recordType) {
        case 'A':
          const addresses = await dns.resolve4(domain);
          records = addresses.map(addr => ({ type: 'A', address: addr }));
          break;
        case 'AAAA':
          const addresses6 = await dns.resolve6(domain);
          records = addresses6.map(addr => ({ type: 'AAAA', address: addr }));
          break;
        case 'CNAME':
          const cnames = await dns.resolveCname(domain);
          records = cnames.map(cname => ({ type: 'CNAME', value: cname }));
          break;
        case 'MX':
          const mxRecords = await dns.resolveMx(domain);
          records = mxRecords.map(mx => ({ type: 'MX', priority: mx.priority, exchange: mx.exchange }));
          break;
        case 'NS':
          const nsRecords = await dns.resolveNs(domain);
          records = nsRecords.map(ns => ({ type: 'NS', nameserver: ns }));
          break;
        case 'TXT':
          const txtRecords = await dns.resolveTxt(domain);
          records = txtRecords.map(txt => ({ type: 'TXT', data: txt.join('') }));
          break;
        default:
          const defaultAddrs = await dns.resolve4(domain);
          records = defaultAddrs.map(addr => ({ type: 'A', address: addr }));
      }

      return { records, ttl };
    } catch (error) {
      // Return simulated data if actual query fails
      return {
        records: [{ type: recordType, value: 'Simulated response (actual DNS query failed)', simulated: true }],
        ttl: 300
      };
    }
  }

  generatePacket(domain, recordType, response) {
    const packet = {
      id: Math.floor(Math.random() * 65535),
      type: response ? 'response' : 'query',
      flags: {
        qr: response ? 1 : 0,
        opcode: 0,
        aa: 0,
        tc: 0,
        rd: 1,
        ra: response ? 1 : 0,
        z: 0,
        rcode: response ? 0 : 0
      },
      questions: [{
        name: domain,
        type: RECORD_TYPES[recordType] || 1,
        class: 1
      }],
      answers: response ? (response.records || []).map(r => ({
        name: domain,
        type: RECORD_TYPES[recordType] || 1,
        class: 1,
        ttl: response.ttl || 300,
        data: r
      })) : [],
      authorities: [],
      additionals: []
    };

    return packet;
  }

  generateQueryPacket(domain, recordType, recursionDesired) {
    return {
      id: Math.floor(Math.random() * 65535),
      type: 'query',
      flags: {
        qr: 0,
        opcode: 0,
        aa: 0,
        tc: 0,
        rd: recursionDesired ? 1 : 0,
        ra: 0,
        z: 0,
        rcode: 0
      },
      questions: [{
        name: domain,
        type: RECORD_TYPES[recordType] || 1,
        class: 1
      }],
      answers: [],
      authorities: [],
      additionals: []
    };
  }

  generateResponsePacket(domain, recordType, result) {
    return {
      id: Math.floor(Math.random() * 65535),
      type: 'response',
      flags: {
        qr: 1,
        opcode: 0,
        aa: 1,
        tc: 0,
        rd: 1,
        ra: 1,
        z: 0,
        rcode: 0
      },
      questions: [{
        name: domain,
        type: RECORD_TYPES[recordType] || 1,
        class: 1
      }],
      answers: (result.records || []).map(r => ({
        name: domain,
        type: RECORD_TYPES[recordType] || 1,
        class: 1,
        ttl: result.ttl || 300,
        data: r
      })),
      authorities: [],
      additionals: []
    };
  }

  async simulateLatency(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new DNSResolver();
