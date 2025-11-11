import React, { useState, useRef } from 'react';
import '../styles/ResultsPanel.css';

function ResultsPanel({ results }) {
  const [expandedStep, setExpandedStep] = useState(null);
  const [activeTab, setActiveTab] = useState('timeline');
  const [packetFormat, setPacketFormat] = useState('human'); // 'human', 'hex', 'wire'
  const [showWhatThisMeans, setShowWhatThisMeans] = useState({});
  const [showImpactAnalysis, setShowImpactAnalysis] = useState({});
  const copyNotificationRef = useRef(null);

  if (!results) return null;

  const toggleStep = (index) => {
    setExpandedStep(expandedStep === index ? null : index);
  };

  const toggleWhatThisMeans = (index) => {
    setShowWhatThisMeans(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const toggleImpactAnalysis = (index) => {
    setShowImpactAnalysis(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const formatJSON = (obj) => {
    return JSON.stringify(obj, null, 2);
  };

  const formatHex = (obj) => {
    const jsonStr = JSON.stringify(obj);
    let hex = '';
    let offset = 0;

    for (let i = 0; i < jsonStr.length; i += 16) {
      const chunk = jsonStr.slice(i, i + 16);
      const hexChunk = Array.from(chunk)
        .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(' ');
      const asciiChunk = chunk.replace(/[^\x20-\x7E]/g, '.');
      hex += `0x${offset.toString(16).padStart(4, '0')}: ${hexChunk.padEnd(48, ' ')} | ${asciiChunk}\n`;
      offset += 16;
    }
    return hex;
  };

  const formatWire = (packet) => {
    if (!packet || !packet.flags) return 'No packet data available';

    const flags = packet.flags;
    return `
DNS Packet Wire Format:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Header Section:
  Transaction ID: 0x${(packet.id || 0).toString(16).padStart(4, '0')}

  Flags (16 bits):
    QR (Query/Response):        ${flags.qr} ${flags.qr ? '(Response)' : '(Query)'}
    OPCODE (Operation):         ${flags.opcode} (Standard Query)
    AA (Authoritative Answer):  ${flags.aa} ${flags.aa ? '(Authoritative)' : '(Non-Authoritative)'}
    TC (Truncated):             ${flags.tc} ${flags.tc ? '(Truncated - Use TCP)' : '(Not Truncated)'}
    RD (Recursion Desired):     ${flags.rd} ${flags.rd ? '(Recursion Requested)' : '(No Recursion)'}
    RA (Recursion Available):   ${flags.ra} ${flags.ra ? '(Recursion Available)' : '(No Recursion)'}
    Z (Reserved):               ${flags.z} (Must be 0)
    RCODE (Response Code):      ${flags.rcode} ${flags.rcode === 0 ? '(No Error)' : '(Error)'}

  Question Count:    ${packet.questions?.length || 0}
  Answer Count:      ${packet.answers?.length || 0}
  Authority Count:   ${packet.authorities?.length || 0}
  Additional Count:  ${packet.additionals?.length || 0}

Question Section:
${packet.questions?.map(q => `  Name: ${q.name}\n  Type: ${q.type} (${getRecordTypeName(q.type)})\n  Class: ${q.class} (IN)`).join('\n') || '  None'}

Answer Section:
${packet.answers?.map(a => `  Name: ${a.name}\n  Type: ${a.type}\n  Class: ${a.class}\n  TTL: ${a.ttl}s\n  Data: ${JSON.stringify(a.data)}`).join('\n\n') || '  None'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();
  };

  const getRecordTypeName = (type) => {
    const types = { 1: 'A', 28: 'AAAA', 5: 'CNAME', 15: 'MX', 2: 'NS', 16: 'TXT', 6: 'SOA' };
    return types[type] || 'Unknown';
  };

  const copyToClipboard = (text, format) => {
    navigator.clipboard.writeText(text).then(() => {
      if (copyNotificationRef.current) {
        copyNotificationRef.current.textContent = `✅ ${format} format copied!`;
        copyNotificationRef.current.style.opacity = '1';
        setTimeout(() => {
          if (copyNotificationRef.current) {
            copyNotificationRef.current.style.opacity = '0';
          }
        }, 2000);
      }
    });
  };

  const getStageIcon = (stage, messageType) => {
    // Use message type to determine icon color/style
    const isQuery = messageType === 'QUERY';
    const isResponse = messageType === 'RESPONSE';
    
    const icons = {
      browser_cache: '🌐',
      os_cache: '💻',
      recursive_resolver: '🔄',
      recursive_to_root_query: '🔵',
      root_to_recursive_response: '🟢',
      recursive_to_tld_query: '🔵',
      tld_to_recursive_response: '🟢',
      recursive_to_auth_query: '🔵',
      auth_to_recursive_response: '�',
      recursive_to_client_response: '🟢',
      client_to_root_query: '�',
      root_to_client_response: '🟢',
      client_to_tld_query: '🔵',
      tld_to_client_response: '🟢',
      client_to_auth_query: '�',
      auth_to_client_response: '🟢',
      dnssec_validation: '🔒',
      packet_loss: '⚠️',
      packet_retry_success: '🔄',
      packet_loss_fatal: '❌'
    };
    
    // Return specific icon or fallback based on message type
    if (icons[stage]) {
      return icons[stage];
    } else if (isQuery) {
      return '🔵';
    } else if (isResponse) {
      return '🟢';
    }
    return '📡';
  };

  const getMessageTypeLabel = (step) => {
    if (step.messageType === 'QUERY') {
      return { label: 'DNS Query', color: '#3b82f6', icon: '🔵' };
    } else if (step.messageType === 'RESPONSE') {
      return { label: 'DNS Response', color: '#10b981', icon: '🟢' };
    }
    return { label: 'DNS Message', color: '#6b7280', icon: '📡' };
  };

  const getRootServerInfo = (step) => {
    // Simulated root server selection (in real implementation, this would come from backend)
    const rootServers = [
      { letter: 'A', operator: 'Verisign', location: 'Dulles, VA, USA', ip: '198.41.0.4' },
      { letter: 'B', operator: 'USC-ISI', location: 'Marina del Rey, CA, USA', ip: '199.9.14.201' },
      { letter: 'C', operator: 'Cogent', location: 'Herndon, VA, USA', ip: '192.33.4.12' },
      { letter: 'D', operator: 'University of Maryland', location: 'College Park, MD, USA', ip: '199.7.91.13' },
      { letter: 'E', operator: 'NASA Ames', location: 'Mountain View, CA, USA', ip: '192.203.230.10' },
      { letter: 'F', operator: 'ISC', location: 'Palo Alto, CA, USA', ip: '192.5.5.241' },
      { letter: 'G', operator: 'US DoD NIC', location: 'Columbus, OH, USA', ip: '192.112.36.4' },
      { letter: 'H', operator: 'US Army Research Lab', location: 'Aberdeen, MD, USA', ip: '198.97.190.53' },
      { letter: 'I', operator: 'Netnod', location: 'Stockholm, Sweden', ip: '192.36.148.17' },
      { letter: 'J', operator: 'Verisign', location: 'Dulles, VA, USA', ip: '192.58.128.30' },
      { letter: 'K', operator: 'RIPE NCC', location: 'Amsterdam, Netherlands', ip: '193.0.14.129' },
      { letter: 'L', operator: 'ICANN', location: 'Los Angeles, CA, USA', ip: '199.7.83.42' },
      { letter: 'M', operator: 'WIDE Project', location: 'Tokyo, Japan', ip: '202.12.27.33' }
    ];
    
    // Hash-based selection for consistency
    const hash = (step.query?.domain || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const selectedRoot = rootServers[hash % rootServers.length];
    
    if (step.stage.includes('root')) {
      return selectedRoot;
    }
    return null;
  };

  const getTimingExplanation = (step) => {
    if (!step.timing && !step.latency && !step.timingDetails) return null;
    
    const explanations = [];
    
    // Check if we have detailed timing measurements
    if (step.timingDetails && step.timingDetails.measured) {
      const td = step.timingDetails;
      
      // RTT breakdown
      if (td.rtt) {
        explanations.push({
          metric: 'Round-Trip Time (RTT)',
          value: `${td.rtt}ms`,
          description: 'Total time from query sent to response received (measured by client/resolver)',
          benchmark: td.rtt < 50 ? '⚡ Excellent' : td.rtt < 150 ? '✅ Good' : td.rtt < 300 ? '⚠️ Moderate' : '❌ High',
          measured: true,
          breakdown: td.breakdown
        });
        
        // Network delay component
        if (td.networkDelay) {
          explanations.push({
            metric: 'Network Delay',
            value: `${td.networkDelay}ms`,
            description: 'Time for packets to travel through network (both directions)',
            benchmark: td.networkDelay < 100 ? '⚡ Fast' : td.networkDelay < 200 ? '✅ Normal' : '⚠️ Slow',
            component: 'network'
          });
        }
        
        // Server processing component
        if (td.serverProcessing) {
          explanations.push({
            metric: 'Server Processing',
            value: `${td.serverProcessing}ms`,
            description: 'Time server spent processing query, looking up records, building response',
            benchmark: td.serverProcessing < 20 ? '⚡ Fast' : td.serverProcessing < 50 ? '✅ Normal' : '⚠️ Slow',
            component: 'server'
          });
        }
      }
      
      // Query timestamp
      if (td.queryTimestamp) {
        explanations.push({
          metric: 'Query Sent At',
          value: new Date(td.queryTimestamp).toISOString(),
          description: 'Timestamp when client sent the DNS query',
          benchmark: '',
          metadata: true
        });
      }
      
      // Response timestamp
      if (td.responseTimestamp) {
        explanations.push({
          metric: 'Response Received At',
          value: new Date(td.responseTimestamp).toISOString(),
          description: 'Timestamp when client received the DNS response',
          benchmark: '',
          metadata: true
        });
      }
    } else {
      // Fallback to basic timing
      if (step.response?.cached) {
        explanations.push({
          metric: 'Cache Lookup',
          value: `${step.timing}ms`,
          description: 'Time to retrieve record from local cache (RAM/disk access)',
          benchmark: 'Typical: 1-10ms'
        });
      } else if (step.latency) {
        explanations.push({
          metric: 'Network Latency',
          value: `${step.latency}ms`,
          description: 'Round-trip time (RTT) for packet to reach server and return',
          benchmark: step.latency < 50 ? '⚡ Excellent' : step.latency < 150 ? '✅ Good' : step.latency < 300 ? '⚠️ Moderate' : '❌ High'
        });
        
        if (step.timing > step.latency) {
          const processingTime = step.timing - step.latency;
          explanations.push({
            metric: 'Server Processing',
            value: `${processingTime}ms`,
            description: 'Time for server to process query, lookup zone files, and build response',
            benchmark: processingTime < 20 ? '⚡ Fast' : processingTime < 50 ? '✅ Normal' : '⚠️ Slow'
          });
        }
      }
      
      explanations.push({
        metric: 'Total Step Time',
        value: `${step.timing}ms`,
        description: 'Complete time for this step including all network and processing delays',
        benchmark: ''
      });
    }
    
    return explanations;
  };

  const getWhatThisMeans = (step) => {
    const explanations = {
      browser_cache: "Your web browser keeps a temporary copy of DNS records it has looked up recently. This is the fastest way to resolve a domain name because it doesn't require any network communication.",
      os_cache: "Your operating system also maintains its own DNS cache. If the browser doesn't have the record, it checks here next. This cache is shared by all applications on your computer.",
      recursive_resolver: "This is your ISP's or a public DNS server (like Google's 8.8.8.8) that does the hard work of finding the answer for you. It queries multiple servers on your behalf.",
      root_server: "Root servers are the top of the DNS hierarchy. They don't know the answer but can tell you which TLD server to ask next (like the .com or .org servers).",
      tld_server: "Top-Level Domain servers manage specific extensions like .com, .org, .net. They refer you to the authoritative nameserver for the specific domain.",
      authoritative_server: "This server has the definitive answer for the domain. It's managed by the domain owner or their hosting provider and contains the actual DNS records.",
      dnssec_validation: "DNSSEC adds digital signatures to DNS records to verify they haven't been tampered with. This protects against DNS spoofing attacks."
    };

    for (const [key, explanation] of Object.entries(explanations)) {
      if (step.stage.includes(key)) return explanation;
    }
    return "This step is part of the DNS resolution process that helps translate domain names into IP addresses.";
  };

  const getImpactAnalysis = (step) => {
    const impacts = [];

    // Packet loss impacts
    if (step.packetLoss?.occurred) {
      if (step.packetLoss.fatal) {
        impacts.push({
          icon: '❌',
          type: 'Performance',
          text: `Fatal packet loss after ${step.packetLoss.maxRetries} attempts. This would result in DNS resolution timeout in real scenarios. Check network stability.`
        });
      } else if (step.packetLoss.attempt > 1) {
        const backoffTime = Math.pow(2, step.packetLoss.attempt - 2) * 1000;
        impacts.push({
          icon: '⚠️',
          type: 'Performance',
          text: `Packet lost at ${Math.round(step.packetLoss.lossPoint * 100)}% of journey. Retry attempt ${step.packetLoss.attempt} with ${backoffTime}ms exponential backoff delay.`
        });
      }
    }
    if (step.packetLoss?.retriesNeeded) {
      const totalRetryTime = Array.from({length: step.packetLoss.retriesNeeded}, (_, i) => Math.pow(2, i) * 1000).reduce((a, b) => a + b, 0);
      impacts.push({
        icon: '✅',
        type: 'Performance',
        text: `Successfully recovered after ${step.packetLoss.retriesNeeded} ${step.packetLoss.retriesNeeded === 1 ? 'retry' : 'retries'}. Added ~${totalRetryTime}ms to total resolution time.`
      });
    }

    // Latency impacts
    if (step.latency) {
      if (step.latency < 50) {
        impacts.push({ icon: '⚡', type: 'Performance', text: `Excellent latency (${step.latency}ms) - likely local or well-optimized network path` });
      } else if (step.latency >= 50 && step.latency < 150) {
        impacts.push({ icon: '⚡', type: 'Performance', text: `Good latency (${step.latency}ms) - acceptable for most applications` });
      } else if (step.latency >= 150 && step.latency < 300) {
        impacts.push({ icon: '⚡', type: 'Performance', text: `Moderate latency (${step.latency}ms) - may impact user experience in latency-sensitive applications` });
      } else {
        impacts.push({ icon: '⚡', type: 'Performance', text: `High latency (${step.latency}ms) - significant delay, check network path and server distance` });
      }
    }

    // Performance impacts
    if (step.response?.cached) {
      impacts.push({ icon: '⚡', type: 'Performance', text: 'Cache hit significantly reduces resolution time (typically 10-50ms vs 50-200ms for full resolution)' });
    }
    if (step.timing > 200) {
      impacts.push({ icon: '⚡', type: 'Performance', text: `High latency detected (${step.timing}ms). This could indicate network congestion or distant servers.` });
    }
    if (step.response?.tc) {
      impacts.push({ icon: '⚡', type: 'Performance', text: 'TC (Truncated) flag set → Requires fallback to TCP, adding 50-200ms latency' });
    }

    // Security impacts
    if (step.stage.includes('dnssec')) {
      impacts.push({ icon: '🔒', type: 'Security', text: 'DNSSEC validation ensures response authenticity and prevents DNS spoofing attacks' });
    }
    // Only show security warning for actual query failures (not cache misses or intermediate steps)
    if (step.response && step.response.found === false && !step.response.referral && !step.response.cached) {
      // Only for final resolution steps, not intermediate queries
      const isFinalStep = step.stage.includes('response') || step.stage.includes('authoritative_server');
      if (isFinalStep) {
        impacts.push({ icon: '⚠️', type: 'Security', text: 'Failed query could indicate DNS hijacking, misconfiguration, or legitimate non-existent domain' });
      }
    }

    // Best practices
    if (step.response?.ttl) {
      if (step.response.ttl > 86400) {
        impacts.push({ icon: '💡', type: 'Best Practice', text: `Very high TTL (${step.response.ttl}s / ${Math.floor(step.response.ttl / 3600)}h) → Reduces DNS load but slower propagation of changes` });
      } else if (step.response.ttl < 300) {
        impacts.push({ icon: '💡', type: 'Best Practice', text: `Low TTL (${step.response.ttl}s) → Faster propagation but increased DNS query load` });
      }
    }
    if (step.response?.referral) {
      impacts.push({ icon: '💡', type: 'Best Practice', text: 'Referral response is normal in iterative resolution - client must query the next server in the chain' });
    }

    // Troubleshooting
    if (step.response?.rcode && step.response.rcode !== 'NOERROR' && step.response.rcode !== 0) {
      impacts.push({ icon: '⚠️', type: 'Troubleshooting', text: `RCODE: ${step.response.rcode} → Check domain spelling, DNS configuration, or nameserver availability` });
    }

    // Success indicators for final resolution steps
    if (step.response?.found && step.response.records && step.response.records.length > 0) {
      const recordCount = step.response.records.length;
      const recordTypes = [...new Set(step.response.records.map(r => r.type))].join(', ');
      impacts.push({
        icon: '✅',
        type: 'Info',
        text: `Successfully resolved ${recordCount} ${recordCount === 1 ? 'record' : 'records'} (${recordTypes}). DNS resolution complete!`
      });
    }

    return impacts.length > 0 ? impacts : [
      { icon: '✅', type: 'Info', text: 'This step completed successfully with no notable issues' }
    ];
  };

  const renderTimeline = () => (
    <div className="timeline">
      {results.steps.map((step, index) => {
        const messageInfo = getMessageTypeLabel(step);
        const rootServer = getRootServerInfo(step);
        const timingDetails = getTimingExplanation(step);
        
        return (
          <div key={index} className={`timeline-item ${expandedStep === index ? 'expanded' : ''} ${step.messageType?.toLowerCase() || ''}`}>
          <div className="timeline-marker">
            <span className={`step-icon ${step.messageType?.toLowerCase() || ''}`}>
              {getStageIcon(step.stage, step.messageType)}
            </span>
            <div className="timeline-line"></div>
          </div>
          <div className="timeline-content">
            <div className="timeline-header" onClick={() => toggleStep(index)}>
              <div className="timeline-title">
                <div className="title-row">
                  <h4>{step.name}</h4>
                  <span 
                    className={`message-type-badge ${step.messageType?.toLowerCase() || ''}`}
                    style={{ backgroundColor: `${messageInfo.color}20`, color: messageInfo.color, border: `1px solid ${messageInfo.color}` }}
                  >
                    {messageInfo.icon} {messageInfo.label}
                  </span>
                </div>
                <div className="badges">
                  <span className="timing-badge">⏱️ {step.timing}ms</span>
                  {step.latency && (
                    <span className="latency-badge" title="Network round-trip time">
                      🌐 RTT: {step.latency}ms
                    </span>
                  )}
                  {results.isLiveMode && step.response?.realResponse && (
                    <span className="live-badge" title="Real DNS response from live server">
                      🌐 LIVE
                    </span>
                  )}
                  {step.response?.cached && (
                    <span className="cache-badge" title="Response from cache">
                      💾 CACHED
                    </span>
                  )}
                  {step.response?.referral && (
                    <span className="referral-badge" title="Referral to next server">
                      ➡️ REFERRAL
                    </span>
                  )}
                </div>
              </div>
              <span className="expand-icon">{expandedStep === index ? '▼' : '▶'}</span>
            </div>
            
            {expandedStep === index && (
              <div className="timeline-details">
                <p className="description">{step.description}</p>

                {/* Message Flow Direction */}
                {(step.messageType === 'QUERY' || step.messageType === 'RESPONSE') && (
                  <div className="detail-section message-flow-section">
                    <h5>📨 Message Flow</h5>
                    <div className="message-flow">
                      <div className="flow-node source">
                        <span className="node-label">Source</span>
                        <span className="node-value">
                          {step.stage.includes('client_to') ? '💻 Client' :
                           step.stage.includes('recursive_to') ? '🔄 Recursive Resolver' :
                           step.stage.includes('root_to') ? '🌍 Root Server' :
                           step.stage.includes('tld_to') ? '🏢 TLD Server' :
                           step.stage.includes('auth_to') ? '📋 Authoritative Server' : 'Unknown'}
                        </span>
                      </div>
                      <div className="flow-arrow">
                        <div className={`arrow ${step.messageType?.toLowerCase() || ''}`}>
                          {step.messageType === 'QUERY' ? '━━━━━━━━▶' : '◀━━━━━━━━'}
                        </div>
                        <span className="arrow-label">{step.messageType}</span>
                      </div>
                      <div className="flow-node target">
                        <span className="node-label">Destination</span>
                        <span className="node-value">
                          {step.stage.includes('to_client') ? '💻 Client' :
                           step.stage.includes('to_recursive') ? '🔄 Recursive Resolver' :
                           step.stage.includes('to_root') ? '🌍 Root Server' :
                           step.stage.includes('to_tld') ? '🏢 TLD Server' :
                           step.stage.includes('to_auth') ? '📋 Authoritative Server' : 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Root Server Specific Information */}
                {rootServer && (
                  <div className="detail-section root-server-section">
                    <h5>🌍 Root Server Details</h5>
                    <div className="root-server-card">
                      <div className="root-server-header">
                        <span className="root-letter">{rootServer.letter}</span>
                        <span className="root-operator">{rootServer.operator}</span>
                      </div>
                      <div className="info-grid">
                        <div className="info-item">
                          <span className="label">IPv4 Address:</span>
                          <span className="value monospace">{rootServer.ip}</span>
                        </div>
                        <div className="info-item">
                          <span className="label">Location:</span>
                          <span className="value">📍 {rootServer.location}</span>
                        </div>
                        <div className="info-item">
                          <span className="label">Anycast Network:</span>
                          <span className="value">✅ Global (100+ instances worldwide)</span>
                        </div>
                        <div className="info-item full-width">
                          <span className="label">Selection Method:</span>
                          <span className="value info-text">
                            Selected via <strong>hash-based distribution</strong> from 13 root server clusters. 
                            Each root server letter operates multiple physical servers globally using anycast routing.
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Timing Breakdown */}
                {timingDetails && timingDetails.length > 0 && (
                  <div className="detail-section timing-breakdown-section">
                    <h5>⏱️ Timing Breakdown</h5>
                    <div className="timing-details">
                      {timingDetails.map((timing, idx) => (
                        <div key={idx} className={`timing-item ${timing.component || ''} ${timing.metadata ? 'metadata' : ''} ${timing.measured ? 'measured' : ''}`}>
                          <div className="timing-header">
                            <span className="timing-metric">
                              {timing.measured && '📊 '}
                              {timing.metric}
                            </span>
                            <span className="timing-value">{timing.value}</span>
                          </div>
                          <div className="timing-info">
                            <p className="timing-description">{timing.description}</p>
                            {timing.benchmark && (
                              <span className="timing-benchmark">{timing.benchmark}</span>
                            )}
                            {timing.breakdown && (
                              <div className="timing-breakdown-detail">
                                <code>{timing.breakdown}</code>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      <div className="timing-explanation">
                        <p><strong>How is timing measured?</strong></p>
                        <ul>
                          <li><strong>Client/Resolver timestamps:</strong> 📊 Measured using Date.now() when queries are sent and responses received</li>
                          <li><strong>RTT (Round-Trip Time):</strong> responseTimestamp - queryTimestamp = Total time for query + network + processing + response</li>
                          <li><strong>Network delay:</strong> Estimated physical packet transmission time (both directions)</li>
                          <li><strong>Server processing:</strong> RTT - Network delay = Time server spent handling the query</li>
                          <li><strong>Cache hits:</strong> Measured from query receipt to response preparation (RAM/disk I/O)</li>
                        </ul>
                        <div className="measurement-note">
                          <strong>⚠️ Note:</strong> DNS packets don't carry timing data. Clients measure RTT by comparing 
                          timestamps when they send queries vs. when they receive responses. Server processing time is 
                          calculated by subtracting estimated network delay from total RTT.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Glue Records Section */}
                {step.response?.glueRecords && step.response.glueRecords.length > 0 && (
                  <div className="detail-section glue-records-section">
                    <h5>📎 Glue Records (Circular Dependency Prevention)</h5>
                    <div className="glue-explanation">
                      <p>
                        <strong>Why glue records?</strong> Without them, you'd need to query <code>{step.response.nameservers?.[0]}</code> 
                        to get its IP, but you need the IP to query it—a circular dependency! Glue records break this loop.
                      </p>
                    </div>
                    <div className="glue-records-list">
                      {step.response.glueRecords.map((glue, idx) => (
                        <div key={idx} className="glue-record">
                          <span className="glue-name">{glue.name}</span>
                          <span className="glue-arrow">→</span>
                          <span className="glue-ip">{glue.ip}</span>
                          <span className="glue-badge">A Record</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {step.server && (
                  <div className="detail-section">
                    <h5>🖥️ Server Information</h5>
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="label">Name:</span>
                        <span className="value">{step.server.name || step.server}</span>
                      </div>
                      {step.server.ip && (
                        <div className="info-item">
                          <span className="label">IP:</span>
                          <span className="value">{step.server.ip}</span>
                        </div>
                      )}
                      {step.server.type && (
                        <div className="info-item">
                          <span className="label">Type:</span>
                          <span className="value">{step.server.type}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {step.query && (
                  <div className="detail-section">
                    <h5>Query Details</h5>
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="label">Domain:</span>
                        <span className="value">{step.query.domain}</span>
                      </div>
                      <div className="info-item">
                        <span className="label">Type:</span>
                        <span className="value">{step.query.type}</span>
                      </div>
                      <div className="info-item">
                        <span className="label">Class:</span>
                        <span className="value">{step.query.class}</span>
                      </div>
                      {step.query.recursionDesired !== undefined && (
                        <div className="info-item">
                          <span className="label">Recursion Desired:</span>
                          <span className="value">{step.query.recursionDesired ? 'Yes' : 'No'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {step.response && (
                  <div className="detail-section">
                    <h5>Response Details</h5>
                    <div className="response-content">
                      {step.response.found !== undefined && (
                        <div className="info-item">
                          <span className="label">Found:</span>
                          <span className={`value ${step.response.found ? 'success' : 'warning'}`}>
                            {step.response.found ? '✅ Yes' : '❌ No'}
                          </span>
                        </div>
                      )}
                      {step.response.cached && (
                        <div className="info-item">
                          <span className="label">Cached:</span>
                          <span className="value success">✅ Cache Hit</span>
                        </div>
                      )}
                      {step.response.records && (
                        <div className="records-list">
                          <strong>Records:</strong>
                          {step.response.records.map((record, idx) => (
                            <div key={idx} className="record-item">
                              {record.type && <span className="record-type">{record.type}</span>}
                              {record.address && <span>{record.address}</span>}
                              {record.value && <span>{record.value}</span>}
                              {record.nameserver && <span>{record.nameserver}</span>}
                              {record.exchange && <span>{record.priority} {record.exchange}</span>}
                              {record.data && <span>{record.data}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                      {step.response.ttl && (
                        <div className="info-item">
                          <span className="label">TTL:</span>
                          <span className="value">{step.response.ttl}s</span>
                        </div>
                      )}
                      {step.response.message && (
                        <div className="info-item">
                          <span className="label">Message:</span>
                          <span className="value">{step.response.message}</span>
                        </div>
                      )}
                      {step.response.referral && (
                        <div className="info-item">
                          <span className="label">Referral:</span>
                          <span className="value warning">⚠️ Referred to next server</span>
                        </div>
                      )}
                      {step.response.nameservers && (
                        <div className="info-item">
                          <span className="label">Nameservers:</span>
                          <span className="value">{step.response.nameservers.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {step.packetLoss && (
                  <div className="detail-section packet-loss-section">
                    <h5>📦 Packet Loss Details</h5>
                    <div className="packet-loss-info">
                      <div className="info-item">
                        <span className="label">Status:</span>
                        <span className={`value ${step.packetLoss.occurred ? 'error' : 'success'}`}>
                          {step.packetLoss.occurred ? '❌ Packet Lost' : '✅ Delivered'}
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="label">Attempt:</span>
                        <span className="value">{step.packetLoss.attempt} of {step.packetLoss.maxRetries}</span>
                      </div>
                      {step.packetLoss.lossPoint && (
                        <div className="info-item">
                          <span className="label">Loss Point:</span>
                          <span className="value">{Math.round(step.packetLoss.lossPoint * 100)}% of journey</span>
                        </div>
                      )}
                      {step.packetLoss.retriesNeeded && (
                        <div className="info-item">
                          <span className="label">Retries Needed:</span>
                          <span className="value success">{step.packetLoss.retriesNeeded}</span>
                        </div>
                      )}
                      {step.packetLoss.fatal && (
                        <div className="info-item">
                          <span className="label">Result:</span>
                          <span className="value error">❌ All retries exhausted</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {step.latency && (
                  <div className="detail-section latency-section">
                    <h5>⏱️ Latency Information</h5>
                    <div className="latency-info">
                      <div className="info-item">
                        <span className="label">Network Latency:</span>
                        <span className={`value latency-${
                          step.latency < 50 ? 'excellent' :
                          step.latency < 150 ? 'good' :
                          step.latency < 300 ? 'moderate' : 'high'
                        }`}>
                          {step.latency}ms
                        </span>
                      </div>
                      <div className="latency-bar">
                        <div
                          className={`latency-fill latency-${
                            step.latency < 50 ? 'excellent' :
                            step.latency < 150 ? 'good' :
                            step.latency < 300 ? 'moderate' : 'high'
                          }`}
                          style={{width: `${Math.min((step.latency / 500) * 100, 100)}%`}}
                        ></div>
                      </div>
                      <div className="latency-scale">
                        <span>0ms</span>
                        <span className="latency-marker" style={{left: '10%'}}>50ms</span>
                        <span className="latency-marker" style={{left: '30%'}}>150ms</span>
                        <span className="latency-marker" style={{left: '60%'}}>300ms</span>
                        <span>500ms+</span>
                      </div>
                    </div>
                  </div>
                )}

                {step.explanation && (
                  <div className="explanation-section">
                    <h5>💡 Explanation</h5>
                    <p>{step.explanation}</p>
                  </div>
                )}

                {step.packet && (
                  <div className="detail-section">
                    <div className="packet-header">
                      <h5>DNS Packet Structure</h5>
                      <div className="packet-format-toggle">
                        <button
                          className={`format-btn ${packetFormat === 'human' ? 'active' : ''}`}
                          onClick={() => setPacketFormat('human')}
                        >
                          📄 Human
                        </button>
                        <button
                          className={`format-btn ${packetFormat === 'hex' ? 'active' : ''}`}
                          onClick={() => setPacketFormat('hex')}
                        >
                          🔢 Hex
                        </button>
                        <button
                          className={`format-btn ${packetFormat === 'wire' ? 'active' : ''}`}
                          onClick={() => setPacketFormat('wire')}
                        >
                          ⚡ Wire
                        </button>
                        <button
                          className="copy-btn"
                          onClick={() => {
                            const text = packetFormat === 'human' ? formatJSON(step.packet) :
                                       packetFormat === 'hex' ? formatHex(step.packet) :
                                       formatWire(step.packet);
                            copyToClipboard(text, packetFormat.toUpperCase());
                          }}
                        >
                          📋 Copy
                        </button>
                      </div>
                    </div>
                    <pre className="packet-display">
                      {packetFormat === 'human' && formatJSON(step.packet)}
                      {packetFormat === 'hex' && formatHex(step.packet)}
                      {packetFormat === 'wire' && formatWire(step.packet)}
                    </pre>
                  </div>
                )}

                {step.packet && step.packet.flags && (
                  <div className="detail-section flags-section">
                    <h5>DNS Flags Explained</h5>
                    <div className="flags-grid">
                      <div className="flag-item">
                        <span className="flag-name">QR (Query/Response):</span>
                        <span className="flag-value">{step.packet.flags.qr}</span>
                        <span className="flag-meaning">{step.packet.flags.qr ? 'Response' : 'Query'}</span>
                      </div>
                      <div className="flag-item">
                        <span className="flag-name">AA (Authoritative):</span>
                        <span className="flag-value">{step.packet.flags.aa}</span>
                        <span className="flag-meaning">{step.packet.flags.aa ? 'Authoritative answer' : 'Non-authoritative'}</span>
                      </div>
                      <div className="flag-item">
                        <span className="flag-name">TC (Truncated):</span>
                        <span className="flag-value">{step.packet.flags.tc}</span>
                        <span className="flag-meaning">{step.packet.flags.tc ? 'Message truncated, use TCP' : 'Not truncated'}</span>
                      </div>
                      <div className="flag-item">
                        <span className="flag-name">RD (Recursion Desired):</span>
                        <span className="flag-value">{step.packet.flags.rd}</span>
                        <span className="flag-meaning">{step.packet.flags.rd ? 'Recursion requested' : 'No recursion'}</span>
                      </div>
                      <div className="flag-item">
                        <span className="flag-name">RA (Recursion Available):</span>
                        <span className="flag-value">{step.packet.flags.ra}</span>
                        <span className="flag-meaning">{step.packet.flags.ra ? 'Server supports recursion' : 'No recursion support'}</span>
                      </div>
                      <div className="flag-item">
                        <span className="flag-name">RCODE (Response Code):</span>
                        <span className="flag-value">{step.packet.flags.rcode}</span>
                        <span className="flag-meaning">{step.packet.flags.rcode === 0 ? 'No error' : `Error code ${step.packet.flags.rcode}`}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="what-this-means-section">
                  <button
                    className="collapsible-header"
                    onClick={() => toggleWhatThisMeans(index)}
                  >
                    <span className="header-icon">💭</span>
                    <span className="header-text">What This Means</span>
                    <span className="expand-icon">{showWhatThisMeans[index] ? '▼' : '▶'}</span>
                  </button>
                  {showWhatThisMeans[index] && (
                    <div className="collapsible-content">
                      <p>{getWhatThisMeans(step)}</p>
                    </div>
                  )}
                </div>

                <div className="impact-analysis-section">
                  <button
                    className="collapsible-header"
                    onClick={() => toggleImpactAnalysis(index)}
                  >
                    <span className="header-icon">🎯</span>
                    <span className="header-text">Why This Matters</span>
                    <span className="expand-icon">{showImpactAnalysis[index] ? '▼' : '▶'}</span>
                  </button>
                  {showImpactAnalysis[index] && (
                    <div className="collapsible-content">
                      <div className="impact-list">
                        {getImpactAnalysis(step).map((impact, idx) => (
                          <div key={idx} className={`impact-item ${impact.type.toLowerCase().replace(' ', '-')}`}>
                            <span className="impact-icon">{impact.icon}</span>
                            <div className="impact-content">
                              <strong>{impact.type}:</strong>
                              <p>{impact.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        );
      })}
    </div>
  );

  const renderSummary = () => (
    <div className="summary-panel">
      <div className="summary-grid">
        <div className="summary-card">
          <h4>Domain</h4>
          <p className="summary-value">{results.domain}</p>
        </div>
        <div className="summary-card">
          <h4>Record Type</h4>
          <p className="summary-value">{results.recordType}</p>
        </div>
        <div className="summary-card">
          <h4>Resolution Mode</h4>
          <p className="summary-value">{results.mode}</p>
        </div>
        <div className="summary-card">
          <h4>Total Time</h4>
          <p className="summary-value">{results.totalTime}ms</p>
        </div>
        <div className="summary-card">
          <h4>Total Steps</h4>
          <p className="summary-value">{results.steps.length}</p>
        </div>
        <div className="summary-card">
          <h4>Status</h4>
          <p className={`summary-value ${results.success ? 'success' : 'error'}`}>
            {results.success ? '✅ Success' : '❌ Failed'}
          </p>
        </div>
      </div>

      <div className="config-summary">
        <h4>Configuration Used</h4>
        <div className="config-grid">
          <div className="config-item">
            <span className="label">Cache Enabled:</span>
            <span className="value">{results.config.cacheEnabled ? 'Yes' : 'No'}</span>
          </div>
          <div className="config-item">
            <span className="label">Cache TTL:</span>
            <span className="value">{results.config.cacheTTL}s</span>
          </div>
          <div className="config-item">
            <span className="label">Network Latency:</span>
            <span className="value">{results.config.networkLatency}ms</span>
          </div>
          <div className="config-item">
            <span className="label">Packet Loss:</span>
            <span className="value">{results.config.packetLoss}%</span>
          </div>
          <div className="config-item">
            <span className="label">DNSSEC:</span>
            <span className="value">{results.config.dnssecEnabled ? 'Enabled' : 'Disabled'}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="results-panel">
      <div className="results-header">
        <h2>📋 Resolution Details</h2>
        <div className="tab-buttons">
          <button
            className={`tab-button ${activeTab === 'timeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('timeline')}
          >
            Timeline
          </button>
          <button
            className={`tab-button ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            Summary
          </button>
        </div>
      </div>

      <div className="results-content">
        {activeTab === 'timeline' ? renderTimeline() : renderSummary()}
      </div>

      <div ref={copyNotificationRef} className="copy-notification">
        Copied!
      </div>
    </div>
  );
}

export default ResultsPanel;

