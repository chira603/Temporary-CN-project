import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import '../styles/SecurityProtocolsPanel.css';

function SecurityProtocolsPanel({ onClose }) {
  const [selectedProtocol, setSelectedProtocol] = useState(null);
  const [showBrief, setShowBrief] = useState(false);
  const [simulationStep, setSimulationStep] = useState(0);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showPacketDetails, setShowPacketDetails] = useState(false);
  const [packetDetails, setPacketDetails] = useState(null);
  const svgRef = useRef(null);

  const protocols = [
    {
      id: 'dot',
      name: 'DNS over TLS (DoT)',
      icon: '🔒',
      port: '853',
      description: 'Encrypts DNS queries using TLS (Transport Layer Security) on dedicated port 853, preventing eavesdropping and tampering',
      benefits: 'Privacy protection, prevents DNS hijacking, ISP cannot see queries',
      standard: 'RFC 7858 (2016)',
      color: '#10b981',
      adoption: 'Supported by Android 9+, iOS 14+, major DNS providers'
    },
    {
      id: 'doh',
      name: 'DNS over HTTPS (DoH)',
      icon: '🔐',
      port: '443',
      description: 'Encapsulates DNS queries in HTTPS traffic, making them indistinguishable from regular web browsing',
      benefits: 'Maximum privacy, bypasses DNS filtering, works on all networks',
      standard: 'RFC 8484 (2018)',
      color: '#3b82f6',
      adoption: 'Firefox, Chrome, Edge, Brave - enabled by default'
    },
    {
      id: 'dnssec',
      name: 'DNSSEC (DNS Security Extensions)',
      icon: '✅',
      port: '53',
      description: 'Cryptographically signs DNS records to ensure authenticity and integrity, preventing DNS spoofing',
      benefits: 'Validates DNS responses, prevents cache poisoning, ensures data integrity',
      standard: 'RFC 4033-4035 (2005)',
      color: '#8b5cf6',
      adoption: '~30% of domains, major TLDs (.com, .org) fully supported'
    }
  ];

  useEffect(() => {
    if (selectedProtocol && !showBrief && svgRef.current) {
      drawSecurityVisualization();
    }
  }, [selectedProtocol, simulationStep, showBrief]);

  const getProtocolSteps = (protocolId) => {
    const steps = {
      'dot': [
        {
          step: 1,
          title: 'Step 1: Client Prepares DNS Query',
          description: 'User\'s device wants to resolve "example.com". Client creates standard DNS query packet (Question: example.com, Type: A record). Query is prepared but NOT yet sent - waiting for secure channel.',
          actors: ['client'],
          packetState: 'prepared',
          encrypted: false,
          technicalDetails: '📋 DNS Query Structure:\n• Domain: example.com\n• Type: A (IPv4 address)\n• Class: IN (Internet)\n• Transaction ID: 0x4a2b (random)\n• Flags: RD=1 (recursion desired)\n• Status: Ready to transmit\n\n🔓 Current State: UNENCRYPTED\n• Query visible in plain text\n• Vulnerable to interception\n• ISP/network can read domain name',
          highlight: 'client'
        },
        {
          step: 2,
          title: 'Step 2: TLS Handshake Established',
          description: 'Client initiates TCP connection to DNS resolver on port 853 (DoT dedicated port). TLS handshake completes: ClientHello, ServerHello, certificate exchange. Encryption keys negotiated using TLS 1.3 protocol. Secure channel ready for encryption.',
          actors: ['client', 'resolver'],
          packetState: 'handshake',
          encrypted: false,
          technicalDetails: '🤝 TLS Handshake Process:\n1. TCP 3-way handshake (SYN, SYN-ACK, ACK)\n2. ClientHello: Supported cipher suites, TLS version\n3. ServerHello: Selected cipher (e.g., TLS_AES_256_GCM_SHA384)\n4. Certificate: Resolver presents X.509 certificate\n5. Key Exchange: ECDHE (Elliptic Curve Diffie-Hellman)\n6. Finished: Both sides confirm encryption ready\n\n🔐 Security Parameters:\n• Protocol: TLS 1.3\n• Cipher: AES-256-GCM\n• Key Exchange: X25519\n• Certificate Validation: Chain of trust verified\n• Port: 853 (dedicated DoT port)\n\n⏱️ Handshake Time: ~50-100ms',
          highlight: 'resolver'
        },
        {
          step: 3,
          title: 'Step 3: Client Encrypts DNS Query',
          description: 'Client takes the plain DNS query and encrypts it using TLS session keys. DNS packet wrapped in TLS record layer on client side. Lock icon appears showing encryption applied. Query transformed from plain text to encrypted ciphertext.',
          actors: ['client'],
          packetState: 'encrypting',
          encrypted: true,
          technicalDetails: '🔒 Encryption Process (Client Side):\n• Original DNS query: 29 bytes (plain)\n• TLS Record Header added: 5 bytes\n• Encryption applied: AES-256-GCM\n• Authentication Tag: 16 bytes (GCM)\n• Result: 50 bytes encrypted packet\n\n🛡️ Encryption Applied:\n• Domain "example.com" → encrypted bytes\n• Query type "A record" → encrypted\n• All DNS data → ciphertext\n• Ready for secure transmission\n\n🔐 Security Status:\n• Confidentiality: ✅ Encrypted\n• Integrity: ✅ Authentication tag added\n• Authentication: ✅ TLS session verified\n\n👁️ What Packet Contains:\n• Random-looking encrypted data\n• No readable domain name\n• Protected query ready to send',
          highlight: 'client'
        },
        {
          step: 4,
          title: 'Step 4: Encrypted Query Transmitted',
          description: 'Encrypted DNS packet sent from client to resolver over the secure TLS channel. Network observers see only encrypted traffic on port 853. Lock icon travels with packet showing it remains encrypted during transit.',
          actors: ['client', 'resolver'],
          packetState: 'transmitting',
          encrypted: true,
          technicalDetails: '📡 Transmission (Encrypted):\n• Source: Client\n• Destination: DNS Resolver (port 853)\n• Protocol: TLS 1.3 Application Data\n• Size: 50 bytes (encrypted)\n\n👁️ What Network Can See:\n• Destination IP: 1.1.1.1 (Cloudflare DNS)\n• Port: 853 (identifies DoT traffic)\n• Encrypted data: Unreadable random bytes\n• Packet length: 50 bytes (visible)\n\n👁️ What Network CANNOT See:\n• Domain name (example.com) - fully encrypted\n• Query type (A record) - fully encrypted\n• Any DNS content - protected by TLS\n• User browsing intent - hidden\n\n🛡️ Privacy Protection:\n• ISP cannot log domain names\n• Network admin cannot see queries\n• Man-in-the-middle cannot read data\n• Censorship cannot filter by domain',
          highlight: 'encrypted-packet'
        },
        {
          step: 5,
          title: 'Step 5: Resolver Decrypts Query',
          description: 'Resolver receives encrypted packet and decrypts using TLS session key. Extracts original question: "example.com A record?". DNS query now visible in plaintext at resolver.',
          actors: ['resolver'],
          packetState: 'processing',
          encrypted: false,
          technicalDetails: '🔓 Decryption Process:\n• TLS session key used to decrypt\n• Original query extracted: example.com (A)\n• Authentication tag verified (no tampering)\n• Plain DNS query ready for resolution\n\n🔐 Security Note:\n• Query decrypted at resolver (trust required)\n• Resolver can now see domain name\n• Still protected from network observers',
          highlight: 'resolver'
        },
        {
          step: 6,
          title: 'Step 6: Resolver Queries Authoritative Server',
          description: 'Resolver performs standard DNS lookup. Checks cache first, then queries root nameservers, TLD servers, and authoritative servers. Receives answer: 93.184.216.34.',
          actors: ['resolver', 'auth-server'],
          packetState: 'resolving',
          encrypted: false,
          technicalDetails: '📊 DNS Resolution Process:\n• Cache status: MISS\n• Query path: Root NS → .com TLD → example.com auth\n• Answer received: 93.184.216.34\n• TTL: 86400s (24 hours)\n\n⚠️ Standard DNS Used:\n• Resolver→Authoritative: UNENCRYPTED\n• DoT only encrypts client↔resolver\n• Combine with DNSSEC for authenticity',
          highlight: 'auth-server'
        },
        {
          step: 7,
          title: 'Step 7: Resolver Encrypts Response',
          description: 'Resolver encrypts DNS response (IP: 93.184.216.34) using same TLS session. Response packet wrapped in TLS encryption. Lock icon shows response is encrypted before sending back.',
          actors: ['resolver'],
          packetState: 'encrypting',
          encrypted: true,
          technicalDetails: '🔒 Response Encryption:\n• DNS Answer: example.com → 93.184.216.34\n• TTL: 86400 seconds (24 hours)\n• Encryption with TLS session key\n• Authentication tag prevents tampering\n\n📦 Encrypted Response Packet:\n• TLS Record Type: Application Data\n• Encrypted DNS response: 45 bytes\n• GCM Authentication Tag: 16 bytes\n• Total size: ~66 bytes encrypted',
          highlight: 'resolver'
        },
        {
          step: 8,
          title: 'Step 8: Encrypted Response Transmitted',
          description: 'Encrypted response sent from resolver back to client over TLS channel. Lock icon travels with packet. Network observers see only encrypted data returning to client.',
          actors: ['resolver', 'client'],
          packetState: 'transmitting',
          encrypted: true,
          technicalDetails: '📡 Return Transmission (Encrypted):\n• Source: Resolver\n• Destination: Client\n• Protocol: TLS 1.3 Application Data\n• Size: ~66 bytes encrypted\n\n🛡️ Protection During Transit:\n• ISP cannot see IP address returned\n• Man-in-the-middle cannot modify response\n• Network observers see only encrypted data\n• DNS answer fully protected',
          highlight: 'encrypted-packet'
        },
        {
          step: 9,
          title: 'Step 9: Client Decrypts Answer',
          description: 'Client receives encrypted response and decrypts using TLS key. Extracts IP address: 93.184.216.34. Validates integrity using authentication tag. Client can now connect to example.com using resolved IP.',
          actors: ['client'],
          packetState: 'complete',
          encrypted: false,
          technicalDetails: '✅ Decryption & Validation:\n• TLS session key decrypts response\n• GCM tag verified (ensures no tampering)\n• DNS answer extracted: 93.184.216.34\n• Cached locally with TTL\n\n🎯 Final Result:\n• Domain: example.com\n• IP Address: 93.184.216.34\n• Cached for: 86400 seconds\n• Security: Full privacy maintained\n\n✅ Privacy Achieved:\n• ISP never saw "example.com" query\n• Network admin cannot log DNS requests\n• Government surveillance cannot intercept\n• DNS hijacking prevented',
          highlight: 'client'
        }
      ],

      'doh': [
        {
          step: 1,
          title: 'Step 1: Client Creates DNS Query',
          description: 'Browser/app prepares DNS query for "example.com A record". Query formatted as binary DNS message (wire format). Query ready but not yet sent - waiting for HTTPS encapsulation.',
          actors: ['client'],
          packetState: 'prepared',
          encrypted: false,
          technicalDetails: '📋 DNS Query (Binary Format):\n• Header: 12 bytes (ID, flags, counts)\n• Question: example.com, Type A, Class IN\n• Total size: 29 bytes (binary DNS message)\n• Format: RFC 1035 wire format\n\n🔓 Current State: UNENCRYPTED\n• Plain DNS message in memory\n• Not yet transmitted\n• Waiting for HTTP/TLS wrapper',
          highlight: 'client'
        },
        {
          step: 2,
          title: 'Step 2: HTTPS/TLS Connection Setup',
          description: 'Client establishes HTTPS connection to DoH resolver (e.g., https://cloudflare-dns.com/dns-query) on port 443. Standard TLS 1.3 handshake with web server. Connection looks identical to regular web browsing.',
          actors: ['client', 'resolver'],
          packetState: 'handshake',
          encrypted: false,
          technicalDetails: '🌐 HTTPS Connection:\n• URL: https://1.1.1.1/dns-query\n• Port: 443 (standard HTTPS)\n• Protocol: HTTP/2 or HTTP/3\n• TLS Version: 1.3\n\n🤝 TLS Handshake:\n1. TCP connection to port 443\n2. ClientHello with ALPN (h2, http/1.1)\n3. Server certificate validation\n4. Key exchange (ECDHE-X25519)\n5. Cipher selected: TLS_AES_128_GCM_SHA256\n\n🎭 Indistinguishability:\n• Network sees: HTTPS to cloudflare-dns.com\n• Cannot distinguish from web browsing\n• Bypasses DNS-specific filtering\n• Works through corporate proxies',
          highlight: 'resolver'
        },
        {
          step: 3,
          title: 'Step 3: Wrap DNS in HTTP POST',
          description: 'DNS query wrapped in HTTP POST request. Content-Type: application/dns-message. Binary DNS placed in HTTP body. Headers prepared for transmission.',
          actors: ['client'],
          packetState: 'encapsulating',
          encrypted: false,
          technicalDetails: '� HTTP Encapsulation:\nPOST /dns-query HTTP/2\nHost: cloudflare-dns.com\nContent-Type: application/dns-message\nContent-Length: 29\nAccept: application/dns-message\n\n[Binary DNS query: 29 bytes]\n\n🎁 Encapsulation:\n• DNS in HTTP body\n• HTTP headers added\n• Ready for TLS encryption',
          highlight: 'client'
        },
        {
          step: 4,
          title: 'Step 4: Encrypt HTTP with TLS',
          description: 'Entire HTTP request encrypted using TLS session. DNS query now doubly hidden inside HTTP and TLS layers. Encryption applied at client.',
          actors: ['client'],
          packetState: 'encrypting',
          encrypted: true,
          technicalDetails: '🔒 TLS Encryption:\n• HTTP request encrypted\n• DNS query hidden in encrypted HTTP body\n• Total encrypted size: ~130 bytes\n\n🛡️ Privacy:\n• DNS query invisible\n• HTTP headers encrypted\n• Looks like normal HTTPS',
          highlight: 'client'
        },
        {
          step: 5,
          title: 'Step 5: Encrypted HTTPS Transmitted',
          description: 'HTTPS request transmitted over internet. Network observers see only encrypted HTTPS traffic. Cannot distinguish from regular website access.',
          actors: ['client', 'resolver'],
          packetState: 'transmitting',
          encrypted: true,
          technicalDetails: '🌐 Network Visibility:\n👁️ What ISP Sees:\n• Protocol: HTTPS (TLS 1.3)\n• Destination: cloudflare-dns.com\n• Port: 443 (web traffic)\n• Encrypted data only\n\n🚫 What ISP Cannot See:\n• DNS query (example.com)\n• HTTP method/path\n• Any DNS content\n\n🎭 Stealth: Indistinguishable from web browsing',
          highlight: 'encrypted-packet'
        },
        {
          step: 6,
          title: 'Step 6: Resolver Decrypts TLS',
          description: 'DoH resolver terminates TLS connection and decrypts HTTPS request. HTTP request now visible at resolver.',
          actors: ['resolver'],
          packetState: 'decrypting',
          encrypted: false,
          technicalDetails: '🔓 TLS Decryption:\n• TLS layer removed\n• HTTP request visible\n• DNS still in HTTP body\n• Ready for extraction',
          highlight: 'resolver'
        },
        {
          step: 7,
          title: 'Step 7: Extract DNS from HTTP',
          description: 'Resolver extracts HTTP headers, reads Content-Type: application/dns-message. Unwraps HTTP body to get binary DNS query.',
          actors: ['resolver'],
          packetState: 'extracting',
          encrypted: false,
          technicalDetails: '� HTTP Extraction:\n• HTTP/2 request parsed\n• Content-Type verified\n• Binary DNS extracted from body\n• DNS query: example.com (A)\n\n� Resolver sees plaintext DNS',
          highlight: 'resolver'
        },
        {
          step: 8,
          title: 'Step 8: Query Authoritative Server',
          description: 'Resolver performs standard DNS resolution. Queries root, TLD, and authoritative servers. Receives answer: 93.184.216.34.',
          actors: ['resolver', 'auth-server'],
          packetState: 'resolving',
          encrypted: false,
          technicalDetails: '📊 DNS Resolution:\n• Cache check: MISS\n• Root NS → .com TLD → authoritative\n• Answer: 93.184.216.34\n• TTL: 86400s (24 hours)\n\n⚠️ Resolver→Auth: May be unencrypted',
          highlight: 'auth-server'
        },
        {
          step: 9,
          title: 'Step 9: Wrap Answer in HTTP Response',
          description: 'Resolver creates HTTP response. DNS answer placed in response body with Content-Type: application/dns-message.',
          actors: ['resolver'],
          packetState: 'encapsulating',
          encrypted: false,
          technicalDetails: '� HTTP Response:\nHTTP/2 200 OK\nContent-Type: application/dns-message\nContent-Length: 45\nCache-Control: max-age=86400\n\n[Binary DNS response: 45 bytes]\n\n• Answer: 93.184.216.34\n• TTL: 86400 seconds',
          highlight: 'resolver'
        },
        {
          step: 10,
          title: 'Step 10: Encrypt HTTP Response with TLS',
          description: 'Resolver encrypts HTTP response using TLS session. DNS answer now hidden inside encrypted HTTPS response.',
          actors: ['resolver'],
          packetState: 'encrypting',
          encrypted: true,
          technicalDetails: '🔒 TLS Encryption:\n• HTTP response encrypted\n• DNS answer protected\n• Total encrypted size: ~150 bytes\n\n🛡️ Privacy:\n• IP address encrypted\n• Response integrity protected',
          highlight: 'resolver'
        },
        {
          step: 11,
          title: 'Step 11: Encrypted Response Transmitted',
          description: 'Encrypted HTTPS response sent to client. Network observers see only encrypted HTTPS traffic returning.',
          actors: ['resolver', 'client'],
          packetState: 'transmitting',
          encrypted: true,
          technicalDetails: '📡 Return Transmission:\n• Protocol: HTTPS\n• Encrypted data only\n• ISP cannot see IP address\n• Network protection maintained',
          highlight: 'encrypted-packet'
        },
        {
          step: 12,
          title: 'Step 12: Client Decrypts TLS',
          description: 'Client decrypts HTTPS response using TLS session key. HTTP response now visible.',
          actors: ['client'],
          packetState: 'decrypting',
          encrypted: false,
          technicalDetails: '🔓 TLS Decryption:\n• TLS layer removed\n• HTTP/2 200 OK visible\n• DNS answer still in HTTP body\n• Ready for extraction',
          highlight: 'client'
        },
        {
          step: 13,
          title: 'Step 13: Extract DNS Answer',
          description: 'Client extracts DNS answer from HTTP body. IP address 93.184.216.34 cached and ready for use. Browser can now connect to website.',
          actors: ['client'],
          packetState: 'complete',
          encrypted: false,
          technicalDetails: '✅ DNS Extraction:\n• HTTP body parsed\n• DNS answer decoded: 93.184.216.34\n• Cached with TTL=86400s\n\n🎯 Final Result:\n• Domain: example.com\n• IP Address: 93.184.216.34\n• Privacy: Fully protected\n\n✅ Privacy Achieved:\n• Complete DNS privacy\n• Indistinguishable from web browsing\n• Censorship-resistant\n• ISP/network blind to DNS activity',
          highlight: 'client'
        }
      ],

      'dnssec': [
        {
          step: 1,
          title: 'Step 1: Client/Resolver Sends DNS Query',
          description: 'Client requests "example.com A record" from DNSSEC-validating resolver. Query includes DO (DNSSEC OK) flag requesting signed responses. Query can use plain DNS (port 53), DoT, or DoH - DNSSEC works with all.',
          actors: ['client', 'resolver'],
          packetState: 'query',
          encrypted: false,
          dnssec: true,
          technicalDetails: '📋 DNSSEC-Enabled Query:\n• Domain: example.com\n• Type: A (IPv4 address)\n• Class: IN\n• DO Flag: 1 (DNSSEC OK - requesting signatures)\n• AD Flag: 0 (not yet authenticated)\n• CD Flag: 0 (checking enabled)\n\n🔐 DNSSEC Request:\n• Client signals DNSSEC support\n• Resolver knows to validate signatures\n• Additional query: Also request RRSIG records\n\n⚠️ Important:\n• DNSSEC ensures AUTHENTICITY not privacy\n• Query still visible if using plain DNS\n• Combine with DoT/DoH for privacy + authenticity\n• Transport: Can be UDP/TCP/TLS/HTTPS',
          highlight: 'client'
        },
        {
          step: 2,
          title: 'Step 2: DNS Server Responds with Signed Data',
          description: 'Authoritative server returns DNS answer PLUS cryptographic signatures. Response includes: A record (IP address), RRSIG (signature), DNSKEY (public key). Signature created using zone\'s private key. Multiple records for chain of trust.',
          actors: ['auth-server', 'resolver'],
          packetState: 'signed-response',
          encrypted: false,
          dnssec: true,
          technicalDetails: '📜 DNSSEC Response Structure:\n\n1. Answer Section:\n   example.com. 86400 IN A 93.184.216.34\n\n2. RRSIG (Signature):\n   example.com. 86400 IN RRSIG A 8 2 86400 (\n     20241201000000 20241101000000 12345 example.com.\n     [Base64 signature: 256 bytes]\n   )\n\n3. DNSKEY (Public Key):\n   example.com. 86400 IN DNSKEY 257 3 8 (\n     [Base64 public key: 256 bytes]\n   )\n\n🔐 Signature Details:\n• Algorithm: RSA/SHA-256 (DNSSEC alg 8)\n• Key Tag: 12345 (identifies signing key)\n• Inception: 2024-11-01 (signature valid from)\n• Expiration: 2024-12-01 (signature valid until)\n• Signer: example.com\n• Signature: Encrypts hash of A record with private key\n\n🔗 Chain of Trust:\n• Root zone → .com TLD → example.com\n• Each level signs the next level\'s DNSKEY\n• Trust anchor: Root zone public key (embedded in resolver)',
          highlight: 'auth-server'
        },
        {
          step: 3,
          title: 'Step 3: Resolver Verifies Signature Chain',
          description: 'Resolver validates DNSSEC chain of trust. Starts from root zone trust anchor. Validates .com TLD signature, then example.com signature. Uses public keys to verify signatures. Checks expiration dates and algorithm compatibility.',
          actors: ['resolver'],
          packetState: 'validating',
          encrypted: false,
          dnssec: true,
          technicalDetails: '🔍 Validation Process:\n\n1. Root Zone Validation:\n   • Resolver has root DNSKEY (trust anchor)\n   • Validates DS record for .com TLD\n   • DS = hash of .com DNSKEY\n\n2. TLD (.com) Validation:\n   • Fetch .com DNSKEY using validated DS\n   • Validates DS record for example.com\n   • Chain extended to example.com\n\n3. Domain (example.com) Validation:\n   • Fetch example.com DNSKEY\n   • Verify RRSIG signature on A record\n   • Decrypt signature with public key\n   • Compare hash with actual A record hash\n\n🔐 Cryptographic Verification:\n• RRSIG signature decrypted with DNSKEY (public key)\n• Result: Hash of original A record\n• Compute hash of received A record (93.184.216.34)\n• Hashes match? ✅ Authentic | ❌ Tampered\n\n⏰ Validity Checks:\n• Signature inception: 2024-11-01 ✅\n• Signature expiration: 2024-12-01 ✅\n• Current date: 2024-11-12 ✅ (within range)\n• Algorithm supported: RSA/SHA-256 ✅\n\n✅ Validation Result: SECURE\n• All signatures valid\n• Chain of trust intact\n• No tampering detected',
          highlight: 'resolver'
        },
        {
          step: 4,
          title: 'Step 4: Client Receives Validated Answer or Error',
          description: 'If DNSSEC validation succeeds: Client receives IP with AD (Authenticated Data) flag set. Green checkmark indicates verified answer. If validation fails: Resolver returns SERVFAIL error. Red X indicates potential attack or misconfiguration.',
          actors: ['resolver', 'client'],
          packetState: 'complete',
          encrypted: false,
          dnssec: true,
          technicalDetails: '✅ SUCCESSFUL VALIDATION:\n• Response flags: AD=1 (Authenticated Data)\n• Answer: example.com → 93.184.216.34\n• Status: SECURE (cryptographically verified)\n• Client can trust IP address is correct\n\n🎯 What DNSSEC Guarantees:\n• ✅ Authenticity: Answer from legitimate nameserver\n• ✅ Integrity: Data not modified in transit\n• ✅ Non-repudiation: Server cannot deny sending response\n• ❌ Privacy: Query still visible (use DoT/DoH for privacy)\n\n❌ VALIDATION FAILURE SCENARIOS:\n\n1. Signature Mismatch (Attack Detected):\n   • RRSIG decryption doesn\'t match data hash\n   • Possible DNS cache poisoning attempt\n   • Resolver returns: SERVFAIL\n   • Client gets: No answer + error\n\n2. Expired Signature:\n   • Current date outside inception-expiration range\n   • Zone admin forgot to re-sign\n   • Resolver returns: SERVFAIL\n\n3. Broken Chain of Trust:\n   • Missing DS record at parent zone\n   • DNSKEY doesn\'t match DS hash\n   • Resolver returns: SERVFAIL\n\n4. BOGUS Status:\n   • Validation actively failed (attack likely)\n   • Resolver logs security event\n   • Client connection blocked\n\n🔒 Security Benefits:\n• Prevents Kaminsky-style cache poisoning\n• Detects man-in-the-middle attacks\n• Ensures DNS data integrity\n• Cryptographically proves authenticity\n\n⚠️ Limitations:\n• Doesn\'t encrypt queries (use DoT/DoH)\n• Only ~30% of domains support DNSSEC\n• Resolver must be DNSSEC-validating\n• Adds ~2-5KB per response (signatures)',
          highlight: 'client'
        }
      ]
    };

    return steps[protocolId] || [];
  };

  const drawSecurityVisualization = () => {
    const svg = d3.select(svgRef.current);
    
    const width = svgRef.current.clientWidth;
    const height = Math.max(svgRef.current.clientHeight || 800, 800); // Minimum height 800px for full page

    const steps = getProtocolSteps(selectedProtocol);
    if (steps.length === 0) return;

    const currentStep = steps[Math.min(simulationStep, steps.length - 1)];
    const protocol = protocols.find(p => p.id === selectedProtocol);

    // Check if we need to reinitialize (protocol change or first draw)
    const existingSvg = svg.select('g.main-group');
    const needsReinit = existingSvg.empty() || existingSvg.attr('data-protocol') !== selectedProtocol;

    let g;
    if (needsReinit) {
      // Complete redraw only on protocol change
      svg.selectAll('*').remove();
      
      g = svg
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('class', 'main-group')
        .attr('data-protocol', selectedProtocol);
    } else {
      // Reuse existing group
      g = existingSvg;
      svg.attr('width', width).attr('height', height);
    }

    // Define positions with maximum spacing for full-page canvas
    const marginX = 260;
    const marginY = 200;
    const halfWidth = width / 2;
    const centerY = height / 2 + 60;

    const actorDefinitions = {
      'client': {
        x: marginX + 120,
        y: centerY,
        color: '#3b82f6',
        icon: '💻',
        label: 'Client'
      },
      'resolver': {
        x: width - marginX - 120,
        y: centerY,
        color: selectedProtocol === 'dnssec' ? '#8b5cf6' : '#10b981',
        icon: selectedProtocol === 'dnssec' ? '🔐' : '🛡️',
        label: selectedProtocol === 'dnssec' ? 'Validating Resolver' : 'DNS Resolver'
      },
      'auth-server': {
        x: halfWidth,
        y: marginY + 40,
        color: '#10b981',
        icon: '📋',
        label: 'Authoritative Server'
      },
      'packet': {
        x: halfWidth,
        y: centerY - 180,
        color: '#94a3b8',
        icon: '📦',
        label: 'DNS Packet'
      }
    };

    // Draw actors with professional entrance animations (only if reinitializing)
    if (needsReinit) {
      // Get all unique actors used across all steps in this protocol
      const allActors = [...new Set(steps.flatMap(s => s.actors || []))];
      
      allActors.forEach((actorId, index) => {
        const actor = actorDefinitions[actorId];
        if (!actor) return;

        const actorGroup = g.append('g')
          .attr('class', 'actor-group')
          .attr('data-actor-id', actorId)
          .style('cursor', 'pointer')
          .on('click', () => handleNodeClick(actorId, simulationStep));

        // Glow effect for highlighted actors (appears after actor)
        if (currentStep.highlight === actorId) {
          const glow = actorGroup.append('circle')
            .attr('cx', actor.x)
            .attr('cy', actor.y)
            .attr('r', 85)
            .attr('fill', 'none')
            .attr('stroke', protocol.color)
            .attr('stroke-width', 3)
            .attr('opacity', 0)
            .attr('class', 'actor-glow')
            .attr('stroke-dasharray', '5,5');

          glow.transition()
            .delay(index * 120 + 500)
            .duration(600)
            .ease(d3.easeCubicInOut)
            .attr('opacity', 0.7);
        }

        // Actor circle with entrance animation (grow from 0)
        const circle = actorGroup.append('circle')
          .attr('cx', actor.x)
          .attr('cy', actor.y)
          .attr('r', 0)
          .attr('fill', actor.color)
          .attr('stroke', '#fff')
          .attr('stroke-width', 3)
          .attr('opacity', 0);

        circle.transition()
          .delay(index * 120)
          .duration(600)
          .ease(d3.easeBackOut)
          .attr('r', 65)
          .attr('opacity', 0.9);

        // Actor icon (fades in after circle)
        const icon = actorGroup.append('text')
          .attr('x', actor.x)
          .attr('y', actor.y + 14)
          .attr('text-anchor', 'middle')
          .attr('font-size', '42px')
          .attr('opacity', 0)
          .text(actor.icon);

        icon.transition()
          .delay(index * 120 + 300)
          .duration(500)
          .ease(d3.easeCubicInOut)
          .attr('opacity', 1);

        // Actor label (appears last)
        const label = actorGroup.append('text')
          .attr('x', actor.x)
          .attr('y', actor.y + 100)
          .attr('text-anchor', 'middle')
          .attr('fill', '#fff')
          .attr('font-size', '16px')
          .attr('font-weight', '700')
          .attr('opacity', 0)
          .text(actor.label);

        label.transition()
          .delay(index * 120 + 450)
          .duration(500)
          .ease(d3.easeCubicInOut)
          .attr('opacity', 1);
      });
    } else {
      // Update highlight glow on existing actors
      g.selectAll('.actor-glow').remove();
      
      if (currentStep.highlight) {
        const actor = actorDefinitions[currentStep.highlight];
        if (actor) {
          const actorGroup = g.select(`[data-actor-id="${currentStep.highlight}"]`);
          const glow = actorGroup.insert('circle', ':first-child')
            .attr('cx', actor.x)
            .attr('cy', actor.y)
            .attr('r', 85)
            .attr('fill', 'none')
            .attr('stroke', protocol.color)
            .attr('stroke-width', 3)
            .attr('opacity', 0)
            .attr('class', 'actor-glow')
            .attr('stroke-dasharray', '5,5');

          glow.transition()
            .duration(400)
            .attr('opacity', 0.7);
        }
      }
    }

    // Remove old packet flows from previous step
    g.selectAll('.packet-flow-group').remove();

    // Create a container for this step's packet flows
    const packetFlowContainer = g.append('g')
      .attr('class', 'packet-flow-group')
      .attr('data-step', currentStep.step);

    // Draw animated packets with connections (new packet animation logic)
    const packetFlows = getPacketFlows(selectedProtocol, currentStep.step);
    if (packetFlows && packetFlows.length > 0) {
      packetFlows.forEach((flow, flowIndex) => {
        const fromActor = actorDefinitions[flow.from];
        const toActor = actorDefinitions[flow.to];
        
        if (!fromActor || !toActor) return;

        // Handle self-loops (internal processing) with maximum spacing for full page
        if (fromActor === toActor || flow.self) {
          const centerX = fromActor.x + (flow.offsetLoop || 0);
          const centerY = fromActor.y;
          const loopRadius = 90; // Larger radius
          const loopOffsetY = -90; // Position loop much higher - increased spacing

          // Circular path with animation - positioned higher
          const loopPath = packetFlowContainer.append('path')
            .attr('d', `M ${centerX} ${centerY + loopOffsetY} A ${loopRadius} ${loopRadius} 0 1 1 ${centerX + 1} ${centerY + loopOffsetY}`)
            .attr('fill', 'none')
            .attr('stroke', flow.encrypting || flow.encrypted || flow.dnssec ? protocol.color : flow.decrypting ? '#f59e0b' : '#94a3b8')
            .attr('stroke-width', flow.encrypting || flow.encrypted || flow.dnssec ? 5 : 4)
            .attr('stroke-dasharray', '12,6')
            .attr('opacity', 0)
            .attr('class', 'processing-loop');

          loopPath.transition()
            .delay(flowIndex * 600 + 800)
            .duration(400)
            .attr('opacity', 0.7);

          // Determine processing icon based on operation
          let icon = '⚙️';
          let iconColor = '#fbbf24';
          if (flow.encrypting) {
            icon = '🔒';
            iconColor = protocol.color;
          } else if (flow.decrypting) {
            icon = '🔓';
            iconColor = '#f59e0b';
          } else if (flow.validating || flow.verifying) {
            icon = '🔍';
            iconColor = '#8b5cf6';
          } else if (flow.encapsulating) {
            icon = '📦';
            iconColor = '#3b82f6';
          } else if (flow.extracting) {
            icon = '📤';
            iconColor = '#10b981';
          } else if (flow.preparing) {
            icon = '📋';
            iconColor = '#64748b';
          }

          // Processing icon - positioned well above the actor with more spacing
          const processingIcon = g.append('text')
            .attr('x', centerX)
            .attr('y', centerY - 195)
            .attr('text-anchor', 'middle')
            .attr('font-size', '2.2rem')
            .attr('opacity', 0)
            .attr('class', 'processing-icon')
            .text(icon);

          processingIcon.transition()
            .delay(flowIndex * 600 + 1200)
            .duration(400)
            .ease(d3.easeBackOut)
            .attr('opacity', 1)
            .attr('font-size', '2.5rem');

          // Label with background - positioned even higher with more spacing
          const labelText = flow.label || 'Processing...';
          const labelWidth = Math.max(200, labelText.length * 10);
          
          const labelBg = g.append('rect')
            .attr('x', centerX - labelWidth/2)
            .attr('y', centerY - 260)
            .attr('width', labelWidth)
            .attr('height', 38)
            .attr('rx', 19)
            .attr('fill', iconColor)
            .attr('opacity', 0);

          labelBg.transition()
            .delay(flowIndex * 600 + 1200)
            .duration(300)
            .attr('opacity', 0.9);

          const label = g.append('text')
            .attr('x', centerX)
            .attr('y', centerY - 235)
            .attr('text-anchor', 'middle')
            .attr('font-size', '1.05rem')
            .attr('font-weight', '700')
            .attr('fill', '#fff')
            .attr('opacity', 0)
            .text(labelText);

          label.transition()
            .delay(flowIndex * 600 + 1200)
            .duration(300)
            .attr('opacity', 1);

          // Make self-loop processing area clickable
          const selfLoopClickArea = packetFlowContainer.append('circle')
            .attr('cx', centerX)
            .attr('cy', centerY + loopOffsetY)
            .attr('r', loopRadius + 35)
            .attr('fill', 'transparent')
            .style('cursor', 'pointer')
            .on('click', () => handlePacketClick());

          // Show decrypt/encrypt details if available - positioned to the side
          if (flow.decryptDetails || flow.encryptDetails) {
            const details = flow.decryptDetails || flow.encryptDetails;
            const isDecrypting = !!flow.decryptDetails;
            const detailsGroup = packetFlowContainer.append('g').attr('class', isDecrypting ? 'decrypt-details' : 'encrypt-details');
            
            // Position details to the right side to avoid overlap
            const detailsX = centerX + 150;
            const detailsY = centerY - 40;
            
            // Background panel
            detailsGroup.append('rect')
              .attr('x', detailsX - 10)
              .attr('y', detailsY - 40)
              .attr('width', 380)
              .attr('height', 70)
              .attr('rx', 14)
              .attr('fill', 'rgba(15, 23, 42, 0.95)')
              .attr('stroke', isDecrypting ? '#f59e0b' : '#10b981')
              .attr('stroke-width', 2.5)
              .attr('opacity', 0)
              .transition()
              .delay(flowIndex * 600 + 1400)
              .duration(300)
              .attr('opacity', 1);
            
            // "Before" label
            detailsGroup.append('text')
              .attr('x', detailsX)
              .attr('y', detailsY - 15)
              .attr('text-anchor', 'start')
              .attr('font-size', '0.9rem')
              .attr('fill', isDecrypting ? '#f59e0b' : '#3b82f6')
              .attr('font-weight', '700')
              .attr('opacity', 0)
              .text((isDecrypting ? '🔒 ' : '📝 ') + details.original)
              .transition()
              .delay(flowIndex * 600 + 1500)
              .duration(300)
              .attr('opacity', 1);
            
            // Arrow
            detailsGroup.append('text')
              .attr('x', detailsX + 170)
              .attr('y', detailsY - 5)
              .attr('text-anchor', 'middle')
              .attr('font-size', '1.8rem')
              .attr('fill', '#10b981')
              .attr('opacity', 0)
              .text('→')
              .transition()
              .delay(flowIndex * 600 + 1700)
              .duration(300)
              .attr('opacity', 1);
            
            // "After" label
            detailsGroup.append('text')
              .attr('x', detailsX)
              .attr('y', detailsY + 20)
              .attr('text-anchor', 'start')
              .attr('font-size', '0.9rem')
              .attr('fill', '#10b981')
              .attr('font-weight', '700')
              .attr('opacity', 0)
              .text((isDecrypting ? '✓ ' : '🔐 ') + (isDecrypting ? details.decrypted : details.encrypted))
              .transition()
              .delay(flowIndex * 600 + 1900)
              .duration(300)
              .attr('opacity', 1);
          }

          // Add status indicator for encryption/decryption - positioned to avoid overlap
          if (flow.encrypting || flow.decrypting) {
            const statusGroup = packetFlowContainer.append('g').attr('class', 'status-indicator');
            
            // Position status badge to the left of the processing icon
            statusGroup.append('circle')
              .attr('cx', centerX - 120)
              .attr('cy', centerY - 160)
              .attr('r', 20)
              .attr('fill', flow.encrypting ? '#10b981' : '#f59e0b')
              .attr('stroke', '#fff')
              .attr('stroke-width', 2.5)
              .attr('opacity', 0)
              .transition()
              .delay(flowIndex * 600 + 1400)
              .duration(300)
              .attr('opacity', 1);

            statusGroup.append('text')
              .attr('x', centerX - 120)
              .attr('y', centerY - 160)
              .attr('text-anchor', 'middle')
              .attr('dominant-baseline', 'middle')
              .attr('font-size', '1.1rem')
              .attr('fill', '#fff')
              .attr('font-weight', 'bold')
              .attr('opacity', 0)
              .text(flow.encrypting ? '🔐' : '🔓')
              .transition()
              .delay(flowIndex * 600 + 1400)
              .duration(300)
              .attr('opacity', 1);
          }
        } else {
          // Packet traveling between actors with maximum spacing for full page
          const baseOffsetY = flowIndex * 60 - 60; // Much larger spacing between multiple flows
          const customOffsetY = flow.offsetY || 0; // Allow custom vertical offset
          const offsetY = baseOffsetY + customOffsetY;
          const midX = (fromActor.x + toActor.x) / 2;
          const midY = (fromActor.y + toActor.y) / 2 + offsetY;

          // Connection line (animated)
          const line = g.append('line')
            .attr('x1', fromActor.x)
            .attr('y1', fromActor.y + customOffsetY)
            .attr('x2', fromActor.x)
            .attr('y2', fromActor.y + customOffsetY)
            .attr('stroke', flow.encrypted || flow.dnssec ? protocol.color : '#64748b')
            .attr('stroke-width', flow.encrypted || flow.dnssec ? 4 : 3)
            .attr('stroke-dasharray', flow.encrypted || flow.dnssec ? '0' : '8,4')
            .attr('opacity', 0)
            .attr('class', 'connection-line');

          line.transition()
            .delay(flowIndex * 600 + 800)
            .duration(400)
            .attr('opacity', 0.6)
            .transition()
            .duration(1200)
            .attr('x2', toActor.x)
            .attr('y2', toActor.y + customOffsetY);

          // Create clickable packet
          const packetGroup = g.append('g')
            .attr('class', `packet-node packet-${flowIndex}`)
            .attr('transform', `translate(${fromActor.x}, ${fromActor.y + customOffsetY})`)
            .style('cursor', 'pointer')
            .attr('opacity', 0)
            .on('click', () => handlePacketClick());

          // Determine packet appearance based on state
          let packetColor = '#94a3b8'; // default gray
          let packetIcon = '📦';
          let strokeColor = '#fff';
          
          if (flow.encrypted || flow.transmitting && flow.encrypted) {
            packetColor = protocol.color;
            packetIcon = '🔒';
          } else if (flow.dnssec) {
            packetColor = '#8b5cf6';
            packetIcon = '✅';
          } else if (flow.isHTTPS) {
            packetColor = '#3b82f6';
            packetIcon = '🌐';
          } else if (flow.handshake) {
            packetColor = '#fbbf24';
            packetIcon = '🤝';
          } else if (flow.resolving) {
            packetColor = '#64748b';
            packetIcon = '📡';
          }

          // Packet envelope with glow effect
          const packetRect = packetGroup.append('rect')
            .attr('x', -28)
            .attr('y', -28)
            .attr('width', 56)
            .attr('height', 56)
            .attr('rx', 10)
            .attr('fill', packetColor)
            .attr('stroke', strokeColor)
            .attr('stroke-width', 2.5)
            .style('filter', flow.encrypted ? 'drop-shadow(0 0 14px ' + packetColor + ') drop-shadow(0 3px 10px rgba(0,0,0,0.3))' : 'drop-shadow(0 3px 10px rgba(0,0,0,0.3))');

          // Packet icon
          packetGroup.append('text')
            .attr('x', 0)
            .attr('y', 0)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', '1.6rem')
            .text(packetIcon);

          // Special badge for encrypted/signed/validated packets
          if (flow.encrypted || flow.dnssec || flow.signed || flow.validated) {
            const badgeGroup = packetGroup.append('g').attr('class', 'packet-badge');
            
            let badgeColor = protocol.color;
            let badgeIcon = '🔐';
            
            if (flow.validated) {
              badgeColor = '#10b981';
              badgeIcon = '✓';
            } else if (flow.signed) {
              badgeColor = '#8b5cf6';
              badgeIcon = '✅';
            } else if (flow.encrypted) {
              badgeColor = protocol.color;
              badgeIcon = '🔐';
            }
            
            badgeGroup.append('circle')
              .attr('cx', 22)
              .attr('cy', -22)
              .attr('r', 15)
              .attr('fill', badgeColor)
              .attr('stroke', '#fff')
              .attr('stroke-width', 2.5);

            badgeGroup.append('text')
              .attr('x', 22)
              .attr('y', -22)
              .attr('text-anchor', 'middle')
              .attr('dominant-baseline', 'middle')
              .attr('font-size', '0.85rem')
              .attr('fill', '#fff')
              .attr('font-weight', 'bold')
              .text(badgeIcon);
          }

          // Packet label - positioned well above packet to avoid overlap
          const labelWidth = Math.max(180, flow.label.length * 9);
          
          const labelBg = g.append('rect')
            .attr('x', fromActor.x - labelWidth/2)
            .attr('y', fromActor.y + customOffsetY - 110)
            .attr('width', labelWidth)
            .attr('height', 32)
            .attr('rx', 8)
            .attr('fill', flow.encrypted || flow.dnssec ? `${protocol.color}40` : 'rgba(59, 130, 246, 0.2)')
            .attr('stroke', flow.encrypted || flow.dnssec ? protocol.color : '#3b82f6')
            .attr('stroke-width', 2)
            .attr('opacity', 0);

          labelBg.transition()
            .delay(flowIndex * 600 + 1200)
            .duration(300)
            .attr('opacity', 1);

          const label = g.append('text')
            .attr('x', fromActor.x)
            .attr('y', fromActor.y + customOffsetY - 89)
            .attr('text-anchor', 'middle')
            .attr('font-size', '0.95rem')
            .attr('font-weight', '600')
            .attr('fill', flow.encrypted || flow.dnssec ? protocol.color : '#93c5fd')
            .attr('opacity', 0)
            .text(flow.label);

          label.transition()
            .delay(flowIndex * 600 + 1200)
            .duration(300)
            .attr('opacity', 1);

          // Animate packet movement
          packetGroup.transition()
            .delay(flowIndex * 600 + 1200)
            .duration(300)
            .attr('opacity', 1)
            .transition()
            .duration(1500)
            .attr('transform', `translate(${toActor.x}, ${toActor.y + customOffsetY})`)
            .on('end', function() {
              // Pulse on arrival
              d3.select(this).select('rect')
                .transition()
                .duration(200)
                .attr('width', 64)
                .attr('height', 64)
                .attr('x', -32)
                .attr('y', -32)
                .transition()
                .duration(200)
                .attr('width', 56)
                .attr('height', 56)
                .attr('x', -28)
                .attr('y', -28);
            });

          // Move label with packet
          labelBg.transition()
            .delay(flowIndex * 600 + 1200)
            .duration(1500)
            .attr('x', toActor.x - labelWidth/2)
            .attr('y', toActor.y + customOffsetY - 110);

          label.transition()
            .delay(flowIndex * 600 + 1200)
            .duration(1500)
            .attr('x', toActor.x)
            .attr('y', toActor.y + customOffsetY - 89);
        }
      });
    }

    // Step indicator badge with entrance animation
    const stepBadge = g.append('g').attr('opacity', 0);
    
    stepBadge.append('rect')
      .attr('x', width - 140)
      .attr('y', 20)
      .attr('width', 120)
      .attr('height', 40)
      .attr('fill', protocol.color)
      .attr('rx', 20)
      .attr('opacity', 0.9);

    stepBadge.append('text')
      .attr('x', width - 80)
      .attr('y', 47)
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .attr('font-size', '16px')
      .attr('font-weight', '700')
      .text(`Step ${simulationStep + 1}/${steps.length}`);

    stepBadge.transition()
      .delay(200)
      .duration(500)
      .ease(d3.easeCubicInOut)
      .attr('opacity', 1);

    // Protocol status indicator with entrance animation
    const statusX = 30;
    const statusY = 30;
    
    const statusGroup = g.append('g').attr('opacity', 0);
    
    statusGroup.append('rect')
      .attr('x', statusX)
      .attr('y', statusY)
      .attr('width', 200)
      .attr('height', 50)
      .attr('fill', 'rgba(31, 41, 55, 0.9)')
      .attr('stroke', protocol.color)
      .attr('stroke-width', 2)
      .attr('rx', 10);

    statusGroup.append('text')
      .attr('x', statusX + 10)
      .attr('y', statusY + 22)
      .attr('fill', '#cbd5e1')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .text('Protocol Status:');

    const statusText = currentStep.encrypted ? '🔒 ENCRYPTED' : 
                      currentStep.dnssec ? '✅ SIGNED' :
                      currentStep.packetState === 'handshake' ? '🤝 HANDSHAKE' :
                      currentStep.packetState === 'processing' ? '⚙️ PROCESSING' :
                      '📋 PLAIN';

    statusGroup.append('text')
      .attr('x', statusX + 10)
      .attr('y', statusY + 42)
      .attr('fill', currentStep.encrypted || currentStep.dnssec ? protocol.color : '#94a3b8')
      .attr('font-size', '14px')
      .attr('font-weight', '700')
      .text(statusText);

    statusGroup.transition()
      .delay(300)
      .duration(500)
      .ease(d3.easeCubicInOut)
      .attr('opacity', 1);
  };

  const getPacketFlows = (protocolId, step) => {
    const flows = {
      'dot': {
        // Step 1: Client prepares DNS query (plain, not encrypted yet)
        1: [
          { from: 'client', to: 'client', label: '📋 DNS Query Prepared', encrypted: false, self: true, preparing: true }
        ],
        // Step 2: TLS Handshake between client and resolver
        2: [
          { from: 'client', to: 'resolver', label: '🤝 TLS Handshake', encrypted: false, handshake: true, bidirectional: true }
        ],
        // Step 3: Client encrypts the query locally (self-loop)
        3: [
          { from: 'client', to: 'client', label: '🔒 Encrypting Query', encrypted: true, self: true, encrypting: true,
            encryptDetails: { original: 'example.com (A)', encrypted: '[TLS Encrypted Bytes]' } }
        ],
        // Step 4: Encrypted query transmitted to resolver
        4: [
          { from: 'client', to: 'resolver', label: '🔐 Encrypted DNS Query (TLS)', encrypted: true, transmitting: true }
        ],
        // Step 5: Resolver decrypts the query
        5: [
          { from: 'resolver', to: 'resolver', label: '🔓 Decrypting Query', encrypted: false, self: true, decrypting: true, 
            decryptDetails: { original: '[Encrypted Bytes]', decrypted: 'example.com (A record)' } }
        ],
        // Step 6: Resolver queries authoritative server
        6: [
          { from: 'resolver', to: 'auth-server', label: '📡 Standard DNS Query', encrypted: false, resolving: true }
        ],
        // Step 7: Resolver encrypts the response
        7: [
          { from: 'resolver', to: 'resolver', label: '🔒 Encrypting Response', encrypted: true, self: true, encrypting: true,
            encryptDetails: { original: '93.184.216.34', encrypted: '[TLS Encrypted Bytes]' } }
        ],
        // Step 8: Encrypted response transmitted to client
        8: [
          { from: 'resolver', to: 'client', label: '🔐 Encrypted Response (TLS)', encrypted: true, transmitting: true }
        ],
        // Step 9: Client decrypts the answer
        9: [
          { from: 'client', to: 'client', label: '🔓 Decrypting Response', encrypted: false, self: true, decrypting: true,
            decryptDetails: { original: '[Encrypted Bytes]', decrypted: '93.184.216.34' } }
        ],
      },
      'doh': {
        // Step 1: Client creates DNS query
        1: [
          { from: 'client', to: 'client', label: '📋 DNS Query Created', encrypted: false, self: true, preparing: true }
        ],
        // Step 2: HTTPS/TLS connection setup
        2: [
          { from: 'client', to: 'resolver', label: '🌐 HTTPS/TLS Setup', encrypted: false, handshake: true, bidirectional: true }
        ],
        // Step 3: Wrap DNS in HTTP POST request
        3: [
          { from: 'client', to: 'client', label: '📦 Wrapping in HTTP', encrypted: false, self: true, encapsulating: true }
        ],
        // Step 4: Encrypt HTTP request with TLS
        4: [
          { from: 'client', to: 'client', label: '🔒 TLS Encryption', encrypted: true, self: true, encrypting: true, 
            encryptDetails: { original: 'HTTP POST /dns-query', encrypted: '[HTTPS Encrypted Bytes]' } }
        ],
        // Step 5: Encrypted HTTPS request transmitted
        5: [
          { from: 'client', to: 'resolver', label: '🔐 HTTPS POST (Encrypted)', encrypted: true, isHTTPS: true, transmitting: true }
        ],
        // Step 6: Resolver decrypts TLS
        6: [
          { from: 'resolver', to: 'resolver', label: '🔓 TLS Decryption', encrypted: false, self: true, decrypting: true,
            decryptDetails: { original: '[HTTPS Encrypted]', decrypted: 'HTTP POST /dns-query' } }
        ],
        // Step 7: Extract DNS from HTTP body
        7: [
          { from: 'resolver', to: 'resolver', label: '📤 Extract DNS from HTTP', encrypted: false, self: true, extracting: true }
        ],
        // Step 8: Query authoritative server
        8: [
          { from: 'resolver', to: 'auth-server', label: '📡 Standard DNS Query', encrypted: false, resolving: true }
        ],
        // Step 9: Wrap response in HTTP
        9: [
          { from: 'resolver', to: 'resolver', label: '📦 Wrap in HTTP Response', encrypted: false, self: true, encapsulating: true }
        ],
        // Step 10: Encrypt HTTP response with TLS
        10: [
          { from: 'resolver', to: 'resolver', label: '🔒 TLS Encryption', encrypted: true, self: true, encrypting: true, 
            encryptDetails: { original: 'HTTP/2 Body: 93.184.216.34', encrypted: '[HTTPS Encrypted Bytes]' } }
        ],
        // Step 11: Encrypted HTTPS response transmitted
        11: [
          { from: 'resolver', to: 'client', label: '🔐 HTTP/2 200 OK (Encrypted)', encrypted: true, isHTTPS: true, transmitting: true }
        ],
        // Step 12: Client decrypts TLS
        12: [
          { from: 'client', to: 'client', label: '🔓 TLS Decryption', encrypted: false, self: true, decrypting: true, 
            decryptDetails: { original: '[HTTPS Encrypted]', decrypted: 'HTTP/2 200 OK' } }
        ],
        // Step 13: Extract DNS answer from HTTP
        13: [
          { from: 'client', to: 'client', label: '📤 Extract DNS from HTTP', encrypted: false, self: true, extracting: true, 
            decryptDetails: { original: 'HTTP Body', decrypted: '93.184.216.34' } }
        ],
      },
      'dnssec': {
        // Step 1: Client sends DNS query with DO flag
        1: [
          { from: 'client', to: 'resolver', label: '📋 DNS Query (DO=1)', dnssec: true, encrypted: false }
        ],
        // Step 2: Authoritative server responds with signatures
        2: [
          { from: 'resolver', to: 'auth-server', label: '📡 Query Authoritative', encrypted: false, dnssec: true },
          { from: 'auth-server', to: 'resolver', label: '✅ Signed Response (RRSIG)', dnssec: true, signed: true }
        ],
        // Step 3: Resolver validates signature chain
        3: [
          { from: 'resolver', to: 'resolver', label: '🔍 Validating Chain', dnssec: true, self: true, validating: true },
          { from: 'resolver', to: 'resolver', label: '🔐 Verify RRSIG', dnssec: true, self: true, verifying: true }
        ],
        // Step 4: Client receives validated answer
        4: [
          { from: 'resolver', to: 'client', label: '✅ Validated (AD=1)', dnssec: true, validated: true }
        ],
      }
    };

    return flows[protocolId]?.[step] || [];
  };

  const handleNodeClick = (nodeId, step) => {
    const steps = getProtocolSteps(selectedProtocol);
    const currentStep = steps[step];
    if (currentStep) {
      setSelectedNode({ nodeId, step, data: currentStep });
    }
  };

  const handlePacketClick = () => {
    const steps = getProtocolSteps(selectedProtocol);
    const currentStep = steps[simulationStep];
    
    if (!currentStep) return;

    const protocol = protocols.find(p => p.id === selectedProtocol);
    
    // Generate packet details based on protocol and step
    const details = {
      protocol: protocol.name,
      step: currentStep.step,
      stepTitle: currentStep.title,
      packetState: currentStep.packetState,
      encrypted: currentStep.encrypted || false,
      dnssec: currentStep.dnssec || false
    };

    // Add protocol-specific packet data
    if (selectedProtocol === 'dot') {
      details.packetData = {
        type: 'DNS over TLS',
        transport: 'TCP',
        port: currentStep.step === 1 ? 'N/A (preparing)' : '853',
        encryption: currentStep.encrypted ? 'TLS 1.3 (AES-256-GCM)' : 'None',
        size: currentStep.encrypted ? '~50 bytes (encrypted)' : '29 bytes (plain)',
        headers: {
          transactionId: '0x4a2b',
          flags: currentStep.step >= 6 ? 'QR=1, RD=1, AA=0' : 'QR=0, RD=1, AA=0',
          questions: 1,
          answers: currentStep.step >= 6 ? 1 : 0
        },
        query: currentStep.encrypted ? '[ENCRYPTED]' : 'example.com',
        queryType: 'A (IPv4 Address)',
        answer: (currentStep.step >= 6 && !currentStep.encrypted) ? {
          domain: 'example.com',
          type: 'A',
          ttl: 86400,
          address: '93.184.216.34'
        } : null,
        tlsInfo: currentStep.encrypted ? {
          version: 'TLS 1.3',
          cipher: 'TLS_AES_256_GCM_SHA384',
          keyExchange: 'ECDHE-X25519',
          authentication: 'RSA-PSS',
          recordType: 'Application Data'
        } : null
      };
    } else if (selectedProtocol === 'doh') {
      details.packetData = {
        type: 'DNS over HTTPS',
        transport: 'TCP',
        port: currentStep.step === 1 ? 'N/A (preparing)' : '443',
        protocol: currentStep.step >= 2 ? 'HTTP/2 over TLS 1.3' : 'None',
        encryption: currentStep.encrypted ? 'HTTPS (TLS 1.3)' : 'None',
        size: (currentStep.step >= 3 && currentStep.step <= 5) || (currentStep.step >= 9 && currentStep.step <= 11) ? '~130 bytes (HTTP+DNS)' : '29 bytes',
        httpHeaders: currentStep.step >= 3 ? {
          method: currentStep.step >= 9 ? (currentStep.step >= 11 ? 'Response' : 'POST') : 'POST',
          path: '/dns-query',
          host: 'cloudflare-dns.com',
          contentType: 'application/dns-message',
          contentLength: currentStep.step >= 9 ? '45' : '29',
          accept: 'application/dns-message',
          userAgent: 'DNS-Client/1.0',
          status: currentStep.step >= 9 ? '200 OK' : undefined
        } : null,
        dnsData: {
          transactionId: '0x4a2b',
          query: currentStep.encrypted ? '[ENCRYPTED]' : 'example.com',
          queryType: 'A (IPv4 Address)',
          format: 'RFC 1035 wire format (binary)'
        },
        answer: (currentStep.step >= 8 && !currentStep.encrypted) ? {
          domain: 'example.com',
          type: 'A',
          ttl: 86400,
          address: '93.184.216.34'
        } : null,
        tlsInfo: currentStep.encrypted ? {
          version: 'TLS 1.3',
          cipher: 'TLS_AES_128_GCM_SHA256',
          sni: 'cloudflare-dns.com',
          alpn: 'h2, http/1.1'
        } : null
      };
    } else if (selectedProtocol === 'dnssec') {
      details.packetData = {
        type: 'DNSSEC-signed DNS',
        transport: 'UDP/TCP',
        port: '53',
        encryption: 'None (use DoT/DoH for encryption)',
        size: currentStep.step >= 2 ? '~2048 bytes (with signatures)' : '29 bytes',
        dnsHeaders: {
          transactionId: '0x4a2b',
          flags: currentStep.step >= 4 ? 'QR=1, RD=1, AD=1' : 'QR=0, RD=1, DO=1',
          questions: 1,
          answers: currentStep.step >= 2 ? 1 : 0,
          authority: currentStep.step >= 2 ? 1 : 0,
          additional: currentStep.step >= 2 ? 2 : 1
        },
        query: {
          name: 'example.com',
          type: 'A',
          class: 'IN',
          dnssecOK: true
        },
        answer: currentStep.step >= 2 ? {
          name: 'example.com',
          type: 'A',
          class: 'IN',
          ttl: 86400,
          rdata: '93.184.216.34'
        } : null,
        dnssecRecords: currentStep.step >= 2 ? {
          rrsig: {
            type: 'RRSIG',
            algorithm: 'RSA/SHA-256 (8)',
            labels: 2,
            originalTTL: 86400,
            expiration: '20241201000000',
            inception: '20241101000000',
            keyTag: 12345,
            signerName: 'example.com',
            signature: '[256 bytes - cryptographic signature]'
          },
          dnskey: {
            type: 'DNSKEY',
            flags: 257,
            protocol: 3,
            algorithm: 8,
            publicKey: '[256 bytes - RSA public key]'
          }
        } : null,
        validationStatus: currentStep.step >= 3 ? 'Chain of trust verified ✅' : 'Not yet validated'
      };
    }

    setPacketDetails(details);
    setShowPacketDetails(true);
  };

  const renderPacketDetailsModal = () => {
    if (!showPacketDetails || !packetDetails) return null;

    return (
      <div className="packet-details-overlay" onClick={() => setShowPacketDetails(false)}>
        <div className="packet-details-modal" onClick={(e) => e.stopPropagation()}>
          <div className="packet-modal-header">
            <h3>📦 Packet Details - {packetDetails.stepTitle}</h3>
            <button className="modal-close-btn" onClick={() => setShowPacketDetails(false)}>✕</button>
          </div>

          <div className="packet-modal-content">
            {/* Packet Overview */}
            <div className="packet-section">
              <h4>🔍 Packet Overview</h4>
              <div className="packet-info-grid">
                <div className="packet-info-item">
                  <span className="info-label">Protocol:</span>
                  <span className="info-value">{packetDetails.packetData.type}</span>
                </div>
                <div className="packet-info-item">
                  <span className="info-label">Transport:</span>
                  <span className="info-value">{packetDetails.packetData.transport}</span>
                </div>
                <div className="packet-info-item">
                  <span className="info-label">Port:</span>
                  <span className="info-value">{packetDetails.packetData.port}</span>
                </div>
                <div className="packet-info-item">
                  <span className="info-label">Encryption:</span>
                  <span className={`info-value ${packetDetails.encrypted ? 'encrypted' : 'plain'}`}>
                    {packetDetails.encrypted ? '🔒 ' : '🔓 '}{packetDetails.packetData.encryption}
                    {packetDetails.encrypted && <span className="encrypted-badge">ENCRYPTED</span>}
                  </span>
                </div>
                <div className="packet-info-item">
                  <span className="info-label">Packet Size:</span>
                  <span className="info-value">{packetDetails.packetData.size}</span>
                </div>
                <div className="packet-info-item">
                  <span className="info-label">State:</span>
                  <span className="info-value state-badge">{packetDetails.packetState || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* HTTP Headers (DoH only) */}
            {packetDetails.packetData.httpHeaders && (
              <div className="packet-section">
                <h4>🌐 HTTP Headers <span className="encryption-indicator">🔒 HTTPS Encrypted</span></h4>
                <div className="packet-code-block encrypted-highlight">
                  <pre>
{`${packetDetails.packetData.httpHeaders.method} ${packetDetails.packetData.httpHeaders.path} HTTP/2
Host: ${packetDetails.packetData.httpHeaders.host}
Content-Type: ${packetDetails.packetData.httpHeaders.contentType}
Content-Length: ${packetDetails.packetData.httpHeaders.contentLength}
Accept: ${packetDetails.packetData.httpHeaders.accept}
User-Agent: ${packetDetails.packetData.httpHeaders.userAgent}`}
                  </pre>
                </div>
              </div>
            )}

            {/* TLS Information */}
            {packetDetails.packetData.tlsInfo && (
              <div className="packet-section tls-section">
                <h4>🔐 TLS Information <span className="encryption-indicator">🔒 Encrypted Layer</span></h4>
                <div className="packet-info-grid">
                  <div className="packet-info-item encrypted-highlight">
                    <span className="info-label">TLS Version:</span>
                    <span className="info-value">{packetDetails.packetData.tlsInfo.version}</span>
                  </div>
                  <div className="packet-info-item encrypted-highlight">
                    <span className="info-label">Cipher Suite:</span>
                    <span className="info-value">{packetDetails.packetData.tlsInfo.cipher}</span>
                  </div>
                  {packetDetails.packetData.tlsInfo.keyExchange && (
                    <div className="packet-info-item encrypted-highlight">
                      <span className="info-label">Key Exchange:</span>
                      <span className="info-value">{packetDetails.packetData.tlsInfo.keyExchange}</span>
                    </div>
                  )}
                  {packetDetails.packetData.tlsInfo.sni && (
                    <div className="packet-info-item encrypted-highlight">
                      <span className="info-label">SNI:</span>
                      <span className="info-value">{packetDetails.packetData.tlsInfo.sni}</span>
                    </div>
                  )}
                  {packetDetails.packetData.tlsInfo.recordType && (
                    <div className="packet-info-item encrypted-highlight">
                      <span className="info-label">Record Type:</span>
                      <span className="info-value">{packetDetails.packetData.tlsInfo.recordType}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* DNS Data */}
            {packetDetails.packetData.dnsData && (
              <div className="packet-section">
                <h4>📋 DNS Data {packetDetails.encrypted && <span className="encryption-indicator">🔒 Protected by TLS</span>}</h4>
                <div className="packet-info-grid">
                  <div className="packet-info-item">
                    <span className="info-label">Transaction ID:</span>
                    <span className="info-value">{packetDetails.packetData.dnsData.transactionId}</span>
                  </div>
                  <div className={`packet-info-item ${packetDetails.encrypted ? 'encrypted-highlight' : ''}`}>
                    <span className="info-label">Query:</span>
                    <span className="info-value">
                      {packetDetails.packetData.dnsData.query}
                      {packetDetails.packetData.dnsData.query === '[ENCRYPTED]' && <span className="encrypted-badge">ENCRYPTED</span>}
                    </span>
                  </div>
                  <div className="packet-info-item">
                    <span className="info-label">Query Type:</span>
                    <span className="info-value">{packetDetails.packetData.dnsData.queryType}</span>
                  </div>
                  {packetDetails.packetData.dnsData.format && (
                    <div className="packet-info-item">
                      <span className="info-label">Format:</span>
                      <span className="info-value">{packetDetails.packetData.dnsData.format}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* DNS Headers (DNSSEC) */}
            {packetDetails.packetData.dnsHeaders && (
              <div className="packet-section">
                <h4>📋 DNS Headers</h4>
                <div className="packet-info-grid">
                  <div className="packet-info-item">
                    <span className="info-label">Transaction ID:</span>
                    <span className="info-value">{packetDetails.packetData.dnsHeaders.transactionId}</span>
                  </div>
                  <div className="packet-info-item">
                    <span className="info-label">Flags:</span>
                    <span className="info-value">{packetDetails.packetData.dnsHeaders.flags}</span>
                  </div>
                  <div className="packet-info-item">
                    <span className="info-label">Questions:</span>
                    <span className="info-value">{packetDetails.packetData.dnsHeaders.questions}</span>
                  </div>
                  <div className="packet-info-item">
                    <span className="info-label">Answers:</span>
                    <span className="info-value">{packetDetails.packetData.dnsHeaders.answers}</span>
                  </div>
                  <div className="packet-info-item">
                    <span className="info-label">Authority:</span>
                    <span className="info-value">{packetDetails.packetData.dnsHeaders.authority}</span>
                  </div>
                  <div className="packet-info-item">
                    <span className="info-label">Additional:</span>
                    <span className="info-value">{packetDetails.packetData.dnsHeaders.additional}</span>
                  </div>
                </div>
              </div>
            )}

            {/* DNSSEC Records */}
            {packetDetails.packetData.dnssecRecords && (
              <div className="packet-section">
                <h4>✅ DNSSEC Signature Records</h4>
                
                <div className="dnssec-record">
                  <h5>RRSIG (Resource Record Signature)</h5>
                  <div className="packet-code-block">
                    <pre>
{`Type: ${packetDetails.packetData.dnssecRecords.rrsig.type}
Algorithm: ${packetDetails.packetData.dnssecRecords.rrsig.algorithm}
Labels: ${packetDetails.packetData.dnssecRecords.rrsig.labels}
Original TTL: ${packetDetails.packetData.dnssecRecords.rrsig.originalTTL}
Signature Expiration: ${packetDetails.packetData.dnssecRecords.rrsig.expiration}
Signature Inception: ${packetDetails.packetData.dnssecRecords.rrsig.inception}
Key Tag: ${packetDetails.packetData.dnssecRecords.rrsig.keyTag}
Signer Name: ${packetDetails.packetData.dnssecRecords.rrsig.signerName}
Signature: ${packetDetails.packetData.dnssecRecords.rrsig.signature}`}
                    </pre>
                  </div>
                </div>

                <div className="dnssec-record">
                  <h5>DNSKEY (Public Key)</h5>
                  <div className="packet-code-block">
                    <pre>
{`Type: ${packetDetails.packetData.dnssecRecords.dnskey.type}
Flags: ${packetDetails.packetData.dnssecRecords.dnskey.flags} (KSK - Key Signing Key)
Protocol: ${packetDetails.packetData.dnssecRecords.dnskey.protocol}
Algorithm: ${packetDetails.packetData.dnssecRecords.dnskey.algorithm}
Public Key: ${packetDetails.packetData.dnssecRecords.dnskey.publicKey}`}
                    </pre>
                  </div>
                </div>

                <div className="validation-status">
                  <strong>Validation Status:</strong> {packetDetails.packetData.validationStatus}
                </div>
              </div>
            )}

            {/* Regular Headers (DoT) */}
            {packetDetails.packetData.headers && !packetDetails.packetData.dnsHeaders && (
              <div className="packet-section">
                <h4>📋 DNS Headers {packetDetails.encrypted && <span className="encryption-indicator">🔒 Protected by TLS</span>}</h4>
                <div className="packet-info-grid">
                  <div className="packet-info-item">
                    <span className="info-label">Transaction ID:</span>
                    <span className="info-value">{packetDetails.packetData.headers.transactionId}</span>
                  </div>
                  <div className="packet-info-item">
                    <span className="info-label">Flags:</span>
                    <span className="info-value">{packetDetails.packetData.headers.flags}</span>
                  </div>
                  <div className="packet-info-item">
                    <span className="info-label">Questions:</span>
                    <span className="info-value">{packetDetails.packetData.headers.questions}</span>
                  </div>
                  <div className="packet-info-item">
                    <span className="info-label">Answers:</span>
                    <span className="info-value">{packetDetails.packetData.headers.answers}</span>
                  </div>
                </div>
                <div className="packet-info-grid" style={{ marginTop: '12px' }}>
                  <div className={`packet-info-item ${packetDetails.encrypted ? 'encrypted-highlight' : ''}`}>
                    <span className="info-label">Query Name:</span>
                    <span className="info-value">
                      {packetDetails.packetData.query}
                      {packetDetails.packetData.query === '[ENCRYPTED]' && <span className="encrypted-badge">ENCRYPTED</span>}
                    </span>
                  </div>
                  <div className="packet-info-item">
                    <span className="info-label">Query Type:</span>
                    <span className="info-value">{packetDetails.packetData.queryType}</span>
                  </div>
                </div>
              </div>
            )}

            {/* DNS Answer Section (for decrypted responses) */}
            {packetDetails.packetData.answer && (
              <div className="packet-section answer-section">
                <h4>✅ DNS Answer <span className="success-indicator">🔓 DECRYPTED</span></h4>
                <div className="answer-highlight">
                  <div className="packet-info-grid">
                    <div className="packet-info-item">
                      <span className="info-label">Domain:</span>
                      <span className="info-value domain-name">{packetDetails.packetData.answer.domain}</span>
                    </div>
                    <div className="packet-info-item">
                      <span className="info-label">Record Type:</span>
                      <span className="info-value">{packetDetails.packetData.answer.type}</span>
                    </div>
                    <div className="packet-info-item">
                      <span className="info-label">IP Address:</span>
                      <span className="info-value ip-address">{packetDetails.packetData.answer.address}</span>
                    </div>
                    <div className="packet-info-item">
                      <span className="info-label">TTL:</span>
                      <span className="info-value">{packetDetails.packetData.answer.ttl}s (24 hours)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const nextStep = () => {
    const steps = getProtocolSteps(selectedProtocol);
    if (simulationStep < steps.length - 1) {
      setSimulationStep(simulationStep + 1);
    }
  };

  const prevStep = () => {
    if (simulationStep > 0) {
      setSimulationStep(simulationStep - 1);
    }
  };

  const resetSimulation = () => {
    setSimulationStep(0);
    setSelectedNode(null);
  };

  const startSimulation = () => {
    setShowBrief(false);
    setSimulationStep(0);
    setSelectedNode(null);
  };

  const renderProtocolBrief = () => {
    const protocol = protocols.find(p => p.id === selectedProtocol);
    if (!protocol) return null;

    return (
      <div className="security-brief-overlay">
        <div className="security-brief-panel">
          <div className="brief-header" style={{ background: `linear-gradient(135deg, ${protocol.color} 0%, ${protocol.color}dd 100%)` }}>
            <h2>
              <span className="brief-icon">{protocol.icon}</span>
              {protocol.name}
            </h2>
            <p className="brief-subtitle">{protocol.standard}</p>
          </div>

          <div className="brief-content">
            {/* Overview */}
            <div className="brief-section">
              <h3>🔐 Protocol Overview</h3>
              <p className="overview-text">{protocol.description}</p>
              <div className="protocol-specs">
                <div className="spec-item">
                  <strong>Port:</strong> {protocol.port}
                </div>
                <div className="spec-item">
                  <strong>Standard:</strong> {protocol.standard}
                </div>
                <div className="spec-item">
                  <strong>Adoption:</strong> {protocol.adoption}
                </div>
              </div>
            </div>

            {/* Benefits */}
            <div className="brief-section">
              <h3>✨ Key Benefits</h3>
              <p className="benefits-text">{protocol.benefits}</p>
            </div>

            {/* How It Works */}
            <div className="brief-section">
              <h3>⚙️ How It Works</h3>
              <div className="flow-summary">
                {selectedProtocol === 'dot' && (
                  <ol className="flow-list">
                    <li>Client prepares DNS query (unencrypted)</li>
                    <li>TLS handshake on port 853 establishes encryption</li>
                    <li>DNS query encrypted and transmitted</li>
                    <li>Resolver decrypts and performs lookup</li>
                    <li>Response encrypted and sent back</li>
                    <li>Client decrypts and uses the answer</li>
                  </ol>
                )}
                {selectedProtocol === 'doh' && (
                  <ol className="flow-list">
                    <li>Client creates DNS query (binary format)</li>
                    <li>HTTPS connection established (port 443)</li>
                    <li>DNS query wrapped in HTTP POST/GET request</li>
                    <li>Encrypted transmission (looks like web traffic)</li>
                    <li>Resolver extracts and processes DNS query</li>
                    <li>Response wrapped in HTTP and encrypted</li>
                    <li>Client decrypts and extracts DNS answer</li>
                  </ol>
                )}
                {selectedProtocol === 'dnssec' && (
                  <ol className="flow-list">
                    <li>Client sends DNS query with DNSSEC flag</li>
                    <li>Server responds with answer + digital signatures</li>
                    <li>Resolver validates signature chain (root → TLD → domain)</li>
                    <li>Client receives validated answer or error</li>
                  </ol>
                )}
              </div>
            </div>

            {/* Key Concepts */}
            <div className="brief-section">
              <h3>💡 Key Concepts</h3>
              <div className="concepts-grid">
                {selectedProtocol === 'dot' && (
                  <>
                    <div className="concept-card">
                      <strong>Dedicated Port</strong>
                      <p>Port 853 exclusively for DNS over TLS</p>
                    </div>
                    <div className="concept-card">
                      <strong>TLS 1.3</strong>
                      <p>Modern encryption with forward secrecy</p>
                    </div>
                    <div className="concept-card">
                      <strong>Certificate Validation</strong>
                      <p>Verifies resolver identity via X.509</p>
                    </div>
                    <div className="concept-card">
                      <strong>Privacy Protection</strong>
                      <p>ISP cannot see DNS queries</p>
                    </div>
                  </>
                )}
                {selectedProtocol === 'doh' && (
                  <>
                    <div className="concept-card">
                      <strong>HTTPS Port 443</strong>
                      <p>Indistinguishable from web traffic</p>
                    </div>
                    <div className="concept-card">
                      <strong>HTTP Encapsulation</strong>
                      <p>DNS wrapped in HTTP request/response</p>
                    </div>
                    <div className="concept-card">
                      <strong>Censorship Resistant</strong>
                      <p>Bypasses DNS-specific filtering</p>
                    </div>
                    <div className="concept-card">
                      <strong>Browser Integration</strong>
                      <p>Native support in modern browsers</p>
                    </div>
                  </>
                )}
                {selectedProtocol === 'dnssec' && (
                  <>
                    <div className="concept-card">
                      <strong>Digital Signatures</strong>
                      <p>Cryptographic proof of authenticity</p>
                    </div>
                    <div className="concept-card">
                      <strong>Chain of Trust</strong>
                      <p>Root → TLD → Domain validation</p>
                    </div>
                    <div className="concept-card">
                      <strong>RRSIG Records</strong>
                      <p>Signatures attached to DNS answers</p>
                    </div>
                    <div className="concept-card">
                      <strong>Integrity Check</strong>
                      <p>Detects tampering and poisoning</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Security Note */}
            <div className="brief-section security-note">
              <h3>🛡️ Security Impact</h3>
              <div className="security-box">
                {selectedProtocol === 'dot' && (
                  <>
                    <p><strong>Protects Against:</strong></p>
                    <ul>
                      <li>✅ DNS eavesdropping (ISP monitoring)</li>
                      <li>✅ Man-in-the-middle attacks</li>
                      <li>✅ DNS hijacking on untrusted networks</li>
                      <li>✅ Query logging by network operators</li>
                    </ul>
                    <p className="note-text"><strong>Note:</strong> DoT uses dedicated port 853, which makes it easy to identify and potentially block. Consider DoH for maximum compatibility.</p>
                  </>
                )}
                {selectedProtocol === 'doh' && (
                  <>
                    <p><strong>Protects Against:</strong></p>
                    <ul>
                      <li>✅ All DoT protections PLUS:</li>
                      <li>✅ DNS-based censorship (looks like HTTPS)</li>
                      <li>✅ Network-level DNS blocking</li>
                      <li>✅ Corporate firewall restrictions</li>
                      <li>✅ Traffic analysis (hides DNS patterns)</li>
                    </ul>
                    <p className="note-text"><strong>Note:</strong> DoH provides maximum privacy but requires trust in DoH provider. Combine with DNSSEC for authenticity.</p>
                  </>
                )}
                {selectedProtocol === 'dnssec' && (
                  <>
                    <p><strong>Protects Against:</strong></p>
                    <ul>
                      <li>✅ DNS cache poisoning (Kaminsky attack)</li>
                      <li>✅ Forged DNS responses</li>
                      <li>✅ Man-in-the-middle DNS manipulation</li>
                      <li>✅ DNS spoofing attacks</li>
                    </ul>
                    <p className="warning-text"><strong>Important:</strong> DNSSEC validates authenticity but does NOT encrypt queries. For privacy, combine DNSSEC with DoT or DoH!</p>
                  </>
                )}
              </div>
            </div>

            {/* Comparison with other protocols */}
            <div className="brief-section comparison-section">
              <h3>⚖️ Quick Comparison</h3>
              <div className="comparison-table">
                <div className="comparison-row header-row">
                  <div className="comparison-cell">Feature</div>
                  <div className="comparison-cell">DoT</div>
                  <div className="comparison-cell">DoH</div>
                  <div className="comparison-cell">DNSSEC</div>
                </div>
                <div className="comparison-row">
                  <div className="comparison-cell"><strong>Privacy</strong></div>
                  <div className="comparison-cell">{selectedProtocol === 'dot' ? '✅ High' : '✅'}</div>
                  <div className="comparison-cell">{selectedProtocol === 'doh' ? '✅ Maximum' : '✅'}</div>
                  <div className="comparison-cell">{selectedProtocol === 'dnssec' ? '❌ None' : '❌'}</div>
                </div>
                <div className="comparison-row">
                  <div className="comparison-cell"><strong>Authenticity</strong></div>
                  <div className="comparison-cell">⚠️ Server</div>
                  <div className="comparison-cell">⚠️ Server</div>
                  <div className="comparison-cell">{selectedProtocol === 'dnssec' ? '✅ Maximum' : '✅'}</div>
                </div>
                <div className="comparison-row">
                  <div className="comparison-cell"><strong>Port</strong></div>
                  <div className="comparison-cell">{selectedProtocol === 'dot' ? '853 📍' : '853'}</div>
                  <div className="comparison-cell">{selectedProtocol === 'doh' ? '443 📍' : '443'}</div>
                  <div className="comparison-cell">{selectedProtocol === 'dnssec' ? '53 📍' : '53'}</div>
                </div>
                <div className="comparison-row">
                  <div className="comparison-cell"><strong>Blockable</strong></div>
                  <div className="comparison-cell">{selectedProtocol === 'dot' ? '⚠️ Easy' : '⚠️'}</div>
                  <div className="comparison-cell">{selectedProtocol === 'doh' ? '✅ Hard' : '✅'}</div>
                  <div className="comparison-cell">⚠️ Easy</div>
                </div>
                <div className="comparison-row">
                  <div className="comparison-cell"><strong>Best For</strong></div>
                  <div className="comparison-cell">{selectedProtocol === 'dot' ? '📌 Privacy' : 'Privacy'}</div>
                  <div className="comparison-cell">{selectedProtocol === 'doh' ? '📌 Max Privacy' : 'Max Privacy'}</div>
                  <div className="comparison-cell">{selectedProtocol === 'dnssec' ? '📌 Authenticity' : 'Authenticity'}</div>
                </div>
              </div>
              <p className="comparison-note">
                💡 <strong>Recommendation:</strong> Use DoH or DoT for privacy, and enable DNSSEC for authenticity. Together they provide complete DNS security!
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="brief-actions">
            <button
              className="back-to-list-btn"
              onClick={() => {
                setSelectedProtocol(null);
                setShowBrief(false);
              }}
            >
              ← Back to Protocols
            </button>
            <button
              className="start-simulation-btn"
              style={{ background: `linear-gradient(135deg, ${protocol.color} 0%, ${protocol.color}cc 100%)` }}
              onClick={startSimulation}
            >
              ▶ Start Simulation
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="security-protocols-overlay">
      <div className="security-protocols-panel">
        {/* Header */}
        <div className="panel-header">
          <div className="header-left">
            <h2>🔐 DNS Security Protocols</h2>
            <p>Learn how modern security protects your DNS queries</p>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Protocol Selection Grid */}
        {!selectedProtocol && (
          <div className="protocols-grid">
            {protocols.map(protocol => (
              <div
                key={protocol.id}
                className="protocol-card"
                style={{ borderColor: protocol.color }}
                onClick={() => {
                  setSelectedProtocol(protocol.id);
                  setShowBrief(true);
                }}
              >
                <div className="protocol-icon" style={{ background: protocol.color }}>
                  {protocol.icon}
                </div>
                <h3>{protocol.name}</h3>
                <div className="protocol-meta">
                  <span className="port-badge" style={{ background: `${protocol.color}22`, color: protocol.color }}>
                    Port {protocol.port}
                  </span>
                  <span className="standard-badge">{protocol.standard}</span>
                </div>
                <p className="protocol-description">{protocol.description}</p>
                <div className="protocol-benefits">
                  <strong>Benefits:</strong>
                  <p>{protocol.benefits}</p>
                </div>
                <button
                  className="simulate-btn"
                  style={{ background: protocol.color }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedProtocol(protocol.id);
                    setShowBrief(true);
                  }}
                >
                  ▶ Learn More
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Protocol Brief */}
        {selectedProtocol && showBrief && renderProtocolBrief()}

        {/* Simulation View */}
        {selectedProtocol && !showBrief && (
          <div className="simulation-view">
            <div className="simulation-header">
              <button className="back-btn" onClick={() => {
                setSelectedProtocol(null);
                setSimulationStep(0);
                setSelectedNode(null);
              }}>
                ← Back
              </button>
              <h3>{protocols.find(p => p.id === selectedProtocol)?.name}</h3>
            </div>

            <div className="simulation-content">
              {/* Visualization */}
              <div className="visualization-container">
                <svg ref={svgRef} className="security-svg"></svg>
              </div>

              {/* Step Info */}
              <div className="step-info-panel">
                {getProtocolSteps(selectedProtocol)[simulationStep] && (
                  <>
                    <div className="step-header">
                      <h4>
                        {getProtocolSteps(selectedProtocol)[simulationStep].title}
                      </h4>
                      <div className="step-badge" style={{ background: protocols.find(p => p.id === selectedProtocol)?.color }}>
                        Step {simulationStep + 1}/{getProtocolSteps(selectedProtocol).length}
                      </div>
                    </div>

                    <div className="step-description">
                      <p>{getProtocolSteps(selectedProtocol)[simulationStep].description}</p>
                    </div>

                    {getProtocolSteps(selectedProtocol)[simulationStep].technicalDetails && (
                      <div className="technical-details">
                        <h5>🔧 Technical Details</h5>
                        <pre>{getProtocolSteps(selectedProtocol)[simulationStep].technicalDetails}</pre>
                      </div>
                    )}

                    {selectedNode && selectedNode.step === simulationStep && (
                      <div className="node-details">
                        <h5>📍 Selected: {selectedNode.nodeId}</h5>
                        <p>{selectedNode.data.description}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="simulation-controls">
              <button onClick={prevStep} disabled={simulationStep === 0} className="nav-btn">
                ⏮ Previous
              </button>
              <span className="step-counter">
                Step {simulationStep + 1} / {getProtocolSteps(selectedProtocol).length}
              </span>
              <button onClick={nextStep} disabled={simulationStep >= getProtocolSteps(selectedProtocol).length - 1} className="nav-btn">
                Next ⏭
              </button>
              <button onClick={resetSimulation} className="reset-btn">
                🔄 Reset
              </button>
            </div>

            {/* Progress Bar */}
            <div className="progress-container">
              <div
                className="progress-bar"
                style={{
                  width: `${((simulationStep + 1) / getProtocolSteps(selectedProtocol).length) * 100}%`,
                  background: protocols.find(p => p.id === selectedProtocol)?.color
                }}
              ></div>
            </div>
          </div>
        )}

        {/* Packet Details Modal */}
        {showPacketDetails && renderPacketDetailsModal()}
      </div>
    </div>
  );
}

export default SecurityProtocolsPanel;
