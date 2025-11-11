import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import '../styles/DNSSecurityPanel.css';

function DNSSecurityPanel({ onClose }) {
  const [selectedConcept, setSelectedConcept] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStep, setSimulationStep] = useState(0);
  const svgRef = useRef(null);

  const securityConcepts = [
    {
      id: 'traditional-dns',
      name: 'Traditional DNS',
      icon: '🔓',
      category: 'Baseline',
      description: 'Unencrypted DNS queries - the traditional way',
      risk: 'Critical',
      color: '#ef4444',
      pros: ['Fast', 'Simple', 'Universal compatibility'],
      cons: ['No encryption', 'Visible to ISPs', 'Vulnerable to attacks', 'Can be censored'],
      riskLevel: 'HIGH'
    },
    {
      id: 'doh',
      name: 'DNS over HTTPS (DoH)',
      icon: '🔐',
      category: 'Privacy',
      description: 'Encrypts DNS queries using HTTPS protocol',
      risk: 'Low',
      color: '#10b981',
      pros: ['Strong encryption', 'Hides from ISPs', 'Uses port 443', 'Bypasses censorship'],
      cons: ['Bypasses network policies', 'Centralization risk', 'Slightly slower'],
      riskLevel: 'LOW',
      port: 443,
      protocol: 'HTTPS',
      rfc: 'RFC 8484'
    },
    {
      id: 'dot',
      name: 'DNS over TLS (DoT)',
      icon: '🔒',
      category: 'Privacy',
      description: 'Encrypts DNS queries using TLS on dedicated port',
      risk: 'Low',
      color: '#3b82f6',
      pros: ['End-to-end encryption', 'Dedicated port 853', 'Enterprise friendly', 'Easy monitoring'],
      cons: ['Easier to block', 'Requires port 853 open', 'Not as stealthy as DoH'],
      riskLevel: 'LOW',
      port: 853,
      protocol: 'TLS',
      rfc: 'RFC 7858'
    },
    {
      id: 'dnssec',
      name: 'DNSSEC',
      icon: '✅',
      category: 'Authentication',
      description: 'Cryptographic authentication of DNS responses',
      risk: 'Medium',
      color: '#f59e0b',
      pros: ['Prevents tampering', 'Chain of trust', 'Protects integrity', 'Industry standard'],
      cons: ['No privacy', 'Complex setup', 'Larger responses', 'Not universal'],
      riskLevel: 'MEDIUM',
      records: ['RRSIG', 'DNSKEY', 'DS', 'NSEC/NSEC3']
    },
    {
      id: 'combined',
      name: 'DoH/DoT + DNSSEC',
      icon: '🛡️',
      category: 'Complete Security',
      description: 'Best of both worlds: Privacy + Authentication',
      risk: 'Very Low',
      color: '#8b5cf6',
      pros: ['Maximum security', 'Privacy + Integrity', 'Best practice', 'Future-proof'],
      cons: ['Higher latency', 'Complex configuration', 'Resource intensive'],
      riskLevel: 'VERY LOW'
    }
  ];

  const getSimulationSteps = (conceptId) => {
    const steps = {
      'traditional-dns': [
        { step: 1, title: 'Plain Query', description: 'Client sends unencrypted DNS query', type: 'query', encrypted: false, visible: true },
        { step: 2, title: 'ISP Sees Query', description: 'ISP can read the domain being queried', type: 'interception', attacker: 'ISP' },
        { step: 3, title: 'Possible Tampering', description: 'Query can be modified or blocked', type: 'attack', vulnerable: true },
        { step: 4, title: 'Plain Response', description: 'Response also unencrypted and visible', type: 'response', encrypted: false },
        { step: 5, title: 'No Verification', description: 'Client cannot verify authenticity', type: 'warning', risk: 'high' }
      ],
      'doh': [
        { step: 1, title: 'HTTPS Connection', description: 'Client establishes encrypted HTTPS connection', type: 'handshake', encrypted: true },
        { step: 2, title: 'Encrypted Query', description: 'DNS query encrypted inside HTTPS request', type: 'query', encrypted: true, port: 443 },
        { step: 3, title: 'ISP Only Sees HTTPS', description: 'ISP sees encrypted traffic, not DNS content', type: 'privacy', hidden: true },
        { step: 4, title: 'DoH Server Resolves', description: 'DoH server (1.1.1.1) performs DNS lookup', type: 'processing' },
        { step: 5, title: 'Encrypted Response', description: 'Response encrypted in HTTPS', type: 'response', encrypted: true },
        { step: 6, title: 'Privacy Achieved', description: 'End-to-end privacy maintained', type: 'success', secure: true }
      ],
      'dot': [
        { step: 1, title: 'TLS Handshake', description: 'Client establishes TLS connection on port 853', type: 'handshake', encrypted: true, port: 853 },
        { step: 2, title: 'Encrypted Query', description: 'DNS query encrypted with TLS', type: 'query', encrypted: true },
        { step: 3, title: 'Visible Port', description: 'ISP sees port 853 traffic (knows its DNS)', type: 'visibility', detectable: true },
        { step: 4, title: 'Content Hidden', description: 'But query content is encrypted', type: 'privacy', encrypted: true },
        { step: 5, title: 'Encrypted Response', description: 'Response encrypted via TLS', type: 'response', encrypted: true },
        { step: 6, title: 'Privacy + Transparency', description: 'Encrypted but identifiable as DNS', type: 'success', secure: true }
      ],
      'dnssec': [
        { step: 1, title: 'Standard Query', description: 'Client requests DNS record with DNSSEC', type: 'query', dnssec: true },
        { step: 2, title: 'Root Signature', description: 'Root server signs referral with RRSIG', type: 'signature', level: 'root' },
        { step: 3, title: 'Chain of Trust', description: 'Each level cryptographically signs the next', type: 'chain', validated: true },
        { step: 4, title: 'Auth + Signature', description: 'Authoritative server returns answer + RRSIG', type: 'response', signed: true },
        { step: 5, title: 'Verification', description: 'Client verifies all signatures', type: 'verification', validating: true },
        { step: 6, title: 'Authenticated', description: 'Data proven authentic and untampered', type: 'success', authenticated: true }
      ],
      'combined': [
        { step: 1, title: 'Encrypted Connection', description: 'DoH/DoT establishes encrypted channel', type: 'handshake', encrypted: true },
        { step: 2, title: 'DNSSEC Query', description: 'Request DNS with DNSSEC validation', type: 'query', encrypted: true, dnssec: true },
        { step: 3, title: 'Private Lookup', description: 'Query hidden from observers', type: 'privacy', hidden: true },
        { step: 4, title: 'Signed Response', description: 'Response includes DNSSEC signatures', type: 'response', encrypted: true, signed: true },
        { step: 5, title: 'Decrypt + Verify', description: 'Decrypt response and verify signatures', type: 'verification', encrypted: true, validating: true },
        { step: 6, title: 'Maximum Security', description: 'Privacy + Authentication achieved', type: 'success', secure: true, authenticated: true }
      ]
    };
    return steps[conceptId] || [];
  };

  useEffect(() => {
    if (isSimulating && selectedConcept) {
      const steps = getSimulationSteps(selectedConcept.id);
      const timer = setInterval(() => {
        setSimulationStep(prev => {
          if (prev >= steps.length - 1) {
            setIsSimulating(false);
            return prev;
          }
          return prev + 1;
        });
      }, 2500);
      return () => clearInterval(timer);
    }
  }, [isSimulating, selectedConcept]);

  useEffect(() => {
    if (selectedConcept) {
      drawVisualization();
    }
  }, [selectedConcept, simulationStep]);

  const drawVisualization = () => {
    if (!svgRef.current || !selectedConcept) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth;
    const height = 500;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g');

    const steps = getSimulationSteps(selectedConcept.id);
    if (steps.length === 0) return;

    const currentStep = steps[Math.min(simulationStep, steps.length - 1)];

    // Actor positions
    const actors = {
      client: { x: 100, y: height / 2, color: '#10b981', icon: '💻', label: 'Client' },
      isp: { x: width / 3, y: height / 2, color: '#f59e0b', icon: '🏢', label: 'ISP/Network' },
      attacker: { x: width / 3, y: 150, color: '#ef4444', icon: '👤', label: 'Observer/Attacker' },
      dnsServer: { x: width - 150, y: height / 2, color: selectedConcept.color, icon: selectedConcept.icon, label: 'DNS Server' }
    };

    // Draw actors
    Object.entries(actors).forEach(([id, actor]) => {
      const shouldShow = 
        id === 'client' ||
        id === 'dnsServer' ||
        (id === 'isp' && currentStep.type !== 'success') ||
        (id === 'attacker' && (currentStep.type === 'interception' || currentStep.type === 'attack'));

      if (!shouldShow) return;

      const actorGroup = g.append('g')
        .attr('opacity', shouldShow ? 1 : 0.3);

      const isActive = 
        (currentStep.type === 'interception' && id === 'isp') ||
        (currentStep.type === 'attack' && id === 'attacker') ||
        (currentStep.type === 'query' && (id === 'client' || id === 'dnsServer')) ||
        (currentStep.type === 'response' && (id === 'client' || id === 'dnsServer'));

      // Glow for active/dangerous actors
      if (isActive && (id === 'attacker' || id === 'isp') && !currentStep.encrypted) {
        const pulse = actorGroup.append('circle')
          .attr('cx', actor.x)
          .attr('cy', actor.y)
          .attr('r', 70)
          .attr('fill', 'none')
          .attr('stroke', '#ef4444')
          .attr('stroke-width', 3)
          .attr('opacity', 0);

        pulse.transition()
          .duration(1000)
          .attr('r', 85)
          .attr('opacity', 0.5)
          .transition()
          .duration(1000)
          .attr('r', 70)
          .attr('opacity', 0)
          .on('end', function repeat() {
            d3.select(this)
              .transition()
              .duration(1000)
              .attr('r', 85)
              .attr('opacity', 0.5)
              .transition()
              .duration(1000)
              .attr('r', 70)
              .attr('opacity', 0)
              .on('end', repeat);
          });
      }

      // Main circle
      actorGroup.append('circle')
        .attr('cx', actor.x)
        .attr('cy', actor.y)
        .attr('r', 60)
        .attr('fill', actor.color)
        .attr('stroke', '#fff')
        .attr('stroke-width', isActive ? 4 : 2)
        .style('filter', isActive ? `drop-shadow(0 4px 12px ${actor.color}80)` : 'none');

      // Icon
      actorGroup.append('text')
        .attr('x', actor.x)
        .attr('y', actor.y)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '2rem')
        .text(actor.icon);

      // Label
      actorGroup.append('text')
        .attr('x', actor.x)
        .attr('y', actor.y + 85)
        .attr('text-anchor', 'middle')
        .attr('font-size', '0.9rem')
        .attr('font-weight', '600')
        .attr('fill', '#fff')
        .text(actor.label);
    });

    // Draw connection based on step type
    if (currentStep.type === 'query' || currentStep.type === 'response' || currentStep.type === 'handshake') {
      const from = currentStep.type === 'response' ? actors.dnsServer : actors.client;
      const to = currentStep.type === 'response' ? actors.client : actors.dnsServer;

      // Arrow marker
      const defs = svg.append('defs');
      const markerId = `arrow-${simulationStep}`;
      
      defs.append('marker')
        .attr('id', markerId)
        .attr('markerWidth', 10)
        .attr('markerHeight', 10)
        .attr('refX', 9)
        .attr('refY', 3)
        .attr('orient', 'auto')
        .append('polygon')
        .attr('points', '0 0, 10 3, 0 6')
        .attr('fill', currentStep.encrypted ? '#10b981' : '#ef4444');

      // Connection line
      const line = g.append('line')
        .attr('x1', from.x)
        .attr('y1', from.y)
        .attr('x2', from.x)
        .attr('y2', from.y)
        .attr('stroke', currentStep.encrypted ? '#10b981' : '#ef4444')
        .attr('stroke-width', 4)
        .attr('stroke-dasharray', currentStep.encrypted ? '0' : '10,5')
        .attr('marker-end', `url(#${markerId})`)
        .style('filter', `drop-shadow(0 0 8px ${currentStep.encrypted ? '#10b98180' : '#ef444480'})`);

      line.transition()
        .duration(1500)
        .attr('x2', to.x)
        .attr('y2', to.y);

      // Animated packet
      const packet = g.append('circle')
        .attr('cx', from.x)
        .attr('cy', from.y)
        .attr('r', 10)
        .attr('fill', currentStep.encrypted ? '#10b981' : '#ef4444')
        .style('filter', `drop-shadow(0 0 8px ${currentStep.encrypted ? '#10b981' : '#ef4444'})`);

      packet.transition()
        .duration(1500)
        .attr('cx', to.x)
        .attr('cy', to.y)
        .transition()
        .duration(300)
        .attr('r', 15)
        .attr('opacity', 0)
        .remove();

      // Encryption/lock icon on packet if encrypted
      if (currentStep.encrypted) {
        const lock = g.append('text')
          .attr('x', from.x)
          .attr('y', from.y - 25)
          .attr('text-anchor', 'middle')
          .attr('font-size', '1.5rem')
          .text('🔒');

        lock.transition()
          .duration(1500)
          .attr('x', to.x)
          .attr('y', to.y - 25);
      }
    }

    // Show interception/attack visualization
    if (currentStep.type === 'interception' || currentStep.type === 'attack') {
      const midX = (actors.client.x + actors.dnsServer.x) / 2;
      const midY = height / 2;

      // Eye icon for watching
      const eye = g.append('text')
        .attr('x', midX)
        .attr('y', actors.isp.y)
        .attr('text-anchor', 'middle')
        .attr('font-size', '3rem')
        .attr('opacity', 0)
        .text('👁️');

      eye.transition()
        .duration(500)
        .attr('opacity', 1);

      // Warning line to ISP
      g.append('line')
        .attr('x1', midX)
        .attr('y1', midY)
        .attr('x2', midX)
        .attr('y2', midY)
        .attr('stroke', '#ef4444')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5')
        .transition()
        .duration(1000)
        .attr('y2', actors.isp.y + 60);
    }

    // DNSSEC chain of trust visualization
    if (currentStep.type === 'chain' || currentStep.type === 'signature') {
      const chainY = height - 100;
      const chainSteps = ['🌍 Root', '🏢 TLD', '📋 Auth'];
      
      chainSteps.forEach((step, i) => {
        const x = 150 + i * 200;
        
        g.append('circle')
          .attr('cx', x)
          .attr('cy', chainY)
          .attr('r', 40)
          .attr('fill', i <= simulationStep % 3 ? '#10b981' : '#374151')
          .attr('stroke', '#fff')
          .attr('stroke-width', 2);

        g.append('text')
          .attr('x', x)
          .attr('y', chainY)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('font-size', '1.5rem')
          .text(step);

        if (i < chainSteps.length - 1) {
          g.append('line')
            .attr('x1', x + 40)
            .attr('y1', chainY)
            .attr('x2', x + 160)
            .attr('y2', chainY)
            .attr('stroke', i < simulationStep % 3 ? '#10b981' : '#4b5563')
            .attr('stroke-width', 3)
            .attr('marker-end', 'url(#chain-arrow)');
        }

        // Checkmark if verified
        if (i <= simulationStep % 3) {
          g.append('text')
            .attr('x', x + 25)
            .attr('y', chainY - 25)
            .attr('font-size', '1.2rem')
            .text('✅');
        }
      });

      // Arrow marker for chain
      const defs = svg.select('defs').empty() ? svg.append('defs') : svg.select('defs');
      defs.append('marker')
        .attr('id', 'chain-arrow')
        .attr('markerWidth', 10)
        .attr('markerHeight', 10)
        .attr('refX', 9)
        .attr('refY', 3)
        .attr('orient', 'auto')
        .append('polygon')
        .attr('points', '0 0, 10 3, 0 6')
        .attr('fill', '#10b981');
    }

    // Step title
    g.append('text')
      .attr('x', width / 2)
      .attr('y', 40)
      .attr('text-anchor', 'middle')
      .attr('font-size', '1.3rem')
      .attr('font-weight', '700')
      .attr('fill', '#fff')
      .text(`Step ${currentStep.step}/${steps.length}: ${currentStep.title}`);

    // Description with status badge
    g.append('text')
      .attr('x', width / 2)
      .attr('y', 70)
      .attr('text-anchor', 'middle')
      .attr('font-size', '1rem')
      .attr('fill', '#a5b4fc')
      .text(currentStep.description);

    // Status indicator
    const statusText = currentStep.encrypted ? '🔒 ENCRYPTED' : 
                      currentStep.vulnerable ? '⚠️ VULNERABLE' :
                      currentStep.authenticated ? '✅ AUTHENTICATED' :
                      currentStep.secure ? '🛡️ SECURE' : '';
    
    if (statusText) {
      g.append('text')
        .attr('x', width / 2)
        .attr('y', 95)
        .attr('text-anchor', 'middle')
        .attr('font-size', '0.9rem')
        .attr('font-weight', '600')
        .attr('fill', currentStep.encrypted || currentStep.secure ? '#10b981' : '#ef4444')
        .text(statusText);
    }
  };

  const handlePlay = () => {
    setIsSimulating(true);
  };

  const handlePause = () => {
    setIsSimulating(false);
  };

  const handleReset = () => {
    setSimulationStep(0);
    setIsSimulating(false);
  };

  return (
    <div className="dns-security-overlay">
      <div className="dns-security-panel">
        <div className="security-header">
          <h2>🔐 DNS Security & Privacy Concepts</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="security-description">
          <p>
            Explore modern DNS security technologies: <strong>DoH</strong> (DNS over HTTPS), 
            <strong> DoT</strong> (DNS over TLS), and <strong>DNSSEC</strong> (DNS Security Extensions). 
            See how they protect your privacy and prevent attacks.
          </p>
        </div>

        {/* Concept Selection */}
        <div className="concept-selection">
          <h3>Choose a Security Concept:</h3>
          <div className="concept-grid">
            {securityConcepts.map((concept) => (
              <button
                key={concept.id}
                className={`concept-card ${selectedConcept?.id === concept.id ? 'active' : ''} risk-${concept.riskLevel.toLowerCase().replace(' ', '-')}`}
                onClick={() => {
                  setSelectedConcept(concept);
                  setSimulationStep(0);
                  setIsSimulating(false);
                }}
              >
                <div className="concept-header">
                  <span className="concept-icon">{concept.icon}</span>
                  <span className="concept-name">{concept.name}</span>
                </div>
                <div className="concept-category">{concept.category}</div>
                <div className="concept-desc">{concept.description}</div>
                <div className={`risk-badge risk-${concept.riskLevel.toLowerCase().replace(' ', '-')}`}>
                  Risk: {concept.riskLevel}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Visualization Area */}
        {selectedConcept && (
          <>
            <div className="visualization-area">
              <div className="visualization-header">
                <h3>
                  <span className="viz-icon">{selectedConcept.icon}</span>
                  {selectedConcept.name} - Interactive Demonstration
                </h3>
              </div>
              <svg ref={svgRef} className="security-svg"></svg>
              
              {/* Technical Details */}
              <div className="technical-details">
                <div className="details-grid">
                  {selectedConcept.port && (
                    <div className="detail-item">
                      <span className="detail-label">Port:</span>
                      <span className="detail-value">{selectedConcept.port}</span>
                    </div>
                  )}
                  {selectedConcept.protocol && (
                    <div className="detail-item">
                      <span className="detail-label">Protocol:</span>
                      <span className="detail-value">{selectedConcept.protocol}</span>
                    </div>
                  )}
                  {selectedConcept.rfc && (
                    <div className="detail-item">
                      <span className="detail-label">Standard:</span>
                      <span className="detail-value">{selectedConcept.rfc}</span>
                    </div>
                  )}
                  {selectedConcept.records && (
                    <div className="detail-item full-width">
                      <span className="detail-label">DNSSEC Records:</span>
                      <span className="detail-value">{selectedConcept.records.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="simulation-controls">
              <button className="control-btn" onClick={handleReset}>
                ⏮️ Reset
              </button>
              <button className="control-btn play-btn" onClick={isSimulating ? handlePause : handlePlay}>
                {isSimulating ? '⏸️ Pause' : '▶️ Play'}
              </button>
            </div>

            {/* Pros and Cons */}
            <div className="pros-cons-section">
              <div className="pros-column">
                <h4>✅ Advantages</h4>
                <ul>
                  {selectedConcept.pros.map((pro, idx) => (
                    <li key={idx}>{pro}</li>
                  ))}
                </ul>
              </div>
              <div className="cons-column">
                <h4>❌ Disadvantages</h4>
                <ul>
                  {selectedConcept.cons.map((con, idx) => (
                    <li key={idx}>{con}</li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}

        {/* Comparison Table */}
        <div className="comparison-section">
          <h3>📊 Quick Comparison</h3>
          <div className="comparison-table">
            <div className="table-header">
              <div className="table-cell">Feature</div>
              <div className="table-cell">Traditional DNS</div>
              <div className="table-cell">DoH</div>
              <div className="table-cell">DoT</div>
              <div className="table-cell">DNSSEC</div>
              <div className="table-cell">Combined</div>
            </div>
            <div className="table-row">
              <div className="table-cell label">Privacy</div>
              <div className="table-cell">❌ None</div>
              <div className="table-cell">✅ High</div>
              <div className="table-cell">✅ High</div>
              <div className="table-cell">❌ None</div>
              <div className="table-cell">✅ High</div>
            </div>
            <div className="table-row">
              <div className="table-cell label">Authentication</div>
              <div className="table-cell">❌ None</div>
              <div className="table-cell">❌ None</div>
              <div className="table-cell">❌ None</div>
              <div className="table-cell">✅ Yes</div>
              <div className="table-cell">✅ Yes</div>
            </div>
            <div className="table-row">
              <div className="table-cell label">Port</div>
              <div className="table-cell">53</div>
              <div className="table-cell">443</div>
              <div className="table-cell">853</div>
              <div className="table-cell">53</div>
              <div className="table-cell">443/853</div>
            </div>
            <div className="table-row">
              <div className="table-cell label">Detectable</div>
              <div className="table-cell">✅ Yes</div>
              <div className="table-cell">❌ No</div>
              <div className="table-cell">✅ Yes</div>
              <div className="table-cell">✅ Yes</div>
              <div className="table-cell">❌ No</div>
            </div>
            <div className="table-row">
              <div className="table-cell label">Adoption</div>
              <div className="table-cell">100%</div>
              <div className="table-cell">~30%</div>
              <div className="table-cell">~20%</div>
              <div className="table-cell">~40%</div>
              <div className="table-cell">~15%</div>
            </div>
          </div>
        </div>

        {/* Real-world Providers */}
        <div className="providers-section">
          <h3>🌐 Popular Providers</h3>
          <div className="providers-grid">
            <div className="provider-card">
              <div className="provider-name">Cloudflare</div>
              <div className="provider-ip">1.1.1.1</div>
              <div className="provider-features">
                <span className="feature-badge">DoH</span>
                <span className="feature-badge">DoT</span>
                <span className="feature-badge">DNSSEC</span>
              </div>
            </div>
            <div className="provider-card">
              <div className="provider-name">Google Public DNS</div>
              <div className="provider-ip">8.8.8.8</div>
              <div className="provider-features">
                <span className="feature-badge">DoH</span>
                <span className="feature-badge">DoT</span>
                <span className="feature-badge">DNSSEC</span>
              </div>
            </div>
            <div className="provider-card">
              <div className="provider-name">Quad9</div>
              <div className="provider-ip">9.9.9.9</div>
              <div className="provider-features">
                <span className="feature-badge">DoH</span>
                <span className="feature-badge">DoT</span>
                <span className="feature-badge">DNSSEC</span>
                <span className="feature-badge">Malware Blocking</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DNSSecurityPanel;
