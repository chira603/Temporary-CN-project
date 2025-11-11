import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import '../styles/AttackScenariosPanel.css';

function AttackScenariosPanel({ onClose }) {
  const [selectedAttack, setSelectedAttack] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStep, setSimulationStep] = useState(0);
  const [attackData, setAttackData] = useState(null);
  const svgRef = useRef(null);

  const attacks = [
    {
      id: 'cache-poisoning',
      name: 'DNS Cache Poisoning',
      icon: '💉',
      severity: 'Critical',
      description: 'Attacker injects fake DNS records into resolver cache',
      difficulty: 'Medium',
      impact: 'Mass redirection of users to malicious sites',
      color: '#ef4444'
    },
    {
      id: 'mitm',
      name: 'Man-in-the-Middle Attack',
      icon: '🕵️',
      severity: 'High',
      description: 'Attacker intercepts DNS traffic on public WiFi',
      difficulty: 'Easy',
      impact: 'Credential theft, traffic interception',
      color: '#f59e0b'
    },
    {
      id: 'amplification',
      name: 'DNS Amplification DDoS',
      icon: '💥',
      severity: 'Critical',
      description: 'Exploits DNS to amplify attack traffic 50x',
      difficulty: 'Easy',
      impact: 'Network saturation, service unavailability',
      color: '#dc2626'
    },
    {
      id: 'tunneling',
      name: 'DNS Tunneling',
      icon: '🚇',
      severity: 'Medium',
      description: 'Covert data exfiltration through DNS queries',
      difficulty: 'Hard',
      impact: 'Data theft bypassing firewalls',
      color: '#8b5cf6'
    },
    {
      id: 'nxdomain-flood',
      name: 'NXDOMAIN Flood',
      icon: '🌊',
      severity: 'High',
      description: 'Floods server with queries for non-existent domains',
      difficulty: 'Easy',
      impact: 'DNS server resource exhaustion',
      color: '#3b82f6'
    },
    {
      id: 'subdomain-takeover',
      name: 'Subdomain Takeover',
      icon: '🎯',
      severity: 'Medium',
      description: 'Exploits dangling DNS records',
      difficulty: 'Medium',
      impact: 'Phishing, malware distribution',
      color: '#10b981'
    }
  ];

  useEffect(() => {
    if (selectedAttack && isSimulating) {
      const timer = setInterval(() => {
        setSimulationStep(prev => {
          const maxSteps = getAttackSteps(selectedAttack).length;
          if (prev >= maxSteps - 1) {
            clearInterval(timer);
            setIsSimulating(false);
            return prev;
          }
          return prev + 1;
        });
      }, 2000); // 2 seconds per step

      return () => clearInterval(timer);
    }
  }, [selectedAttack, isSimulating]);

  useEffect(() => {
    if (selectedAttack && svgRef.current) {
      drawAttackVisualization();
    }
  }, [selectedAttack, simulationStep, isSimulating]);

  const getAttackSteps = (attackId) => {
    const steps = {
      'cache-poisoning': [
        { step: 1, title: 'Normal DNS Query', description: 'Client sends legitimate query to resolver', actors: ['client', 'resolver'] },
        { step: 2, title: 'Attacker Prepares', description: 'Attacker monitors DNS traffic and prepares fake response', actors: ['attacker'], highlight: 'attacker' },
        { step: 3, title: 'Race Condition', description: 'Attacker sends forged response with guessed Transaction ID', actors: ['attacker', 'resolver'], attack: true },
        { step: 4, title: 'Cache Poisoned', description: 'Fake response arrives first, resolver caches malicious IP', actors: ['resolver'], poisoned: true },
        { step: 5, title: 'Victims Affected', description: 'All subsequent queries return poisoned result', actors: ['client', 'resolver', 'victim'], spread: true }
      ],
      'mitm': [
        { step: 1, title: 'Public WiFi Connection', description: 'User connects to compromised WiFi hotspot', actors: ['client', 'wifi'] },
        { step: 2, title: 'DNS Query Sent', description: 'Client sends DNS query through WiFi', actors: ['client', 'wifi', 'attacker'] },
        { step: 3, title: 'Attacker Intercepts', description: 'Attacker (WiFi owner) intercepts DNS query', actors: ['attacker'], attack: true, highlight: 'attacker' },
        { step: 4, title: 'Fake Response', description: 'Attacker sends fake DNS response with malicious IP', actors: ['attacker', 'client'], attack: true },
        { step: 5, title: 'User Redirected', description: 'User connects to fake website, credentials stolen', actors: ['client', 'fake-server'], poisoned: true }
      ],
      'amplification': [
        { step: 1, title: 'Attacker Preparation', description: 'Attacker finds open DNS resolvers', actors: ['attacker', 'resolver'] },
        { step: 2, title: 'Spoofed Query', description: 'Sends small query (60 bytes) with victim\'s IP as source', actors: ['attacker', 'resolver'], attack: true },
        { step: 3, title: 'Large Response', description: 'DNS server responds with 4KB answer to victim', actors: ['resolver', 'victim'], attack: true },
        { step: 4, title: 'Amplification', description: '50x traffic amplification overwhelms victim', actors: ['resolver', 'victim'], attack: true, highlight: 'victim' },
        { step: 5, title: 'DDoS Complete', description: 'Thousands of DNS servers flood victim simultaneously', actors: ['resolver', 'victim'], poisoned: true }
      ],
      'tunneling': [
        { step: 1, title: 'Data Exfiltration Need', description: 'Attacker wants to steal data past firewall', actors: ['attacker', 'client'] },
        { step: 2, title: 'Encode Data in Query', description: 'Sensitive data encoded as subdomain: secret123.attacker.com', actors: ['client', 'resolver'], attack: true },
        { step: 3, title: 'Firewall Bypass', description: 'DNS queries allowed through firewall (port 53)', actors: ['client', 'firewall', 'resolver'] },
        { step: 4, title: 'Data Reaches Attacker', description: 'Attacker\'s DNS server receives encoded data', actors: ['attacker', 'resolver'] },
        { step: 5, title: 'Data Decoded', description: 'Attacker extracts sensitive information from queries', actors: ['attacker'], poisoned: true }
      ],
      'nxdomain-flood': [
        { step: 1, title: 'Attack Begins', description: 'Botnet starts sending random DNS queries', actors: ['attacker', 'botnet'] },
        { step: 2, title: 'Non-existent Domains', description: 'Queries for random domains that don\'t exist', actors: ['botnet', 'resolver'], attack: true },
        { step: 3, title: 'Cache Miss Storm', description: 'Every query bypasses cache, hits authoritative servers', actors: ['resolver', 'auth-server'], attack: true },
        { step: 4, title: 'Resource Exhaustion', description: 'DNS server CPU/memory exhausted handling NXDOMAIN responses', actors: ['resolver'], highlight: 'resolver' },
        { step: 5, title: 'Service Degradation', description: 'Legitimate queries fail or timeout', actors: ['client', 'resolver'], poisoned: true }
      ],
      'subdomain-takeover': [
        { step: 1, title: 'Misconfiguration', description: 'Company removes cloud service but leaves DNS record', actors: ['company', 'dns'] },
        { step: 2, title: 'Dangling Record', description: 'CNAME points to unclaimed cloud resource', actors: ['dns', 'cloud'], highlight: 'dns' },
        { step: 3, title: 'Attacker Discovers', description: 'Attacker finds dangling DNS record', actors: ['attacker'] },
        { step: 4, title: 'Attacker Claims Resource', description: 'Attacker registers the same cloud resource name', actors: ['attacker', 'cloud'], attack: true },
        { step: 5, title: 'Takeover Complete', description: 'Legitimate subdomain now points to attacker\'s server', actors: ['dns', 'attacker'], poisoned: true }
      ]
    };
    return steps[attackId] || [];
  };

  const drawAttackVisualization = () => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth;
    const height = 500;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g');

    const steps = getAttackSteps(selectedAttack);
    if (steps.length === 0) return;

    const currentStep = steps[Math.min(simulationStep, steps.length - 1)];
    const attack = attacks.find(a => a.id === selectedAttack);

    // Define actors/nodes based on attack type
    const actorDefinitions = {
      'client': { x: 100, y: 250, color: '#3b82f6', icon: '💻', label: 'Client' },
      'attacker': { x: width / 2, y: 100, color: '#ef4444', icon: '🦹', label: 'Attacker' },
      'resolver': { x: width / 2, y: 250, color: '#8b5cf6', icon: '🔄', label: 'DNS Resolver' },
      'victim': { x: width - 100, y: 250, color: '#f59e0b', icon: '😱', label: 'Victim' },
      'auth-server': { x: width - 100, y: 250, color: '#10b981', icon: '📋', label: 'Auth Server' },
      'wifi': { x: width / 2, y: 200, color: '#6366f1', icon: '📡', label: 'WiFi Hotspot' },
      'fake-server': { x: width / 2, y: 400, color: '#dc2626', icon: '🎭', label: 'Fake Server' },
      'firewall': { x: width / 2 - 100, y: 250, color: '#64748b', icon: '🛡️', label: 'Firewall' },
      'cloud': { x: width - 100, y: 250, color: '#06b6d4', icon: '☁️', label: 'Cloud Service' },
      'company': { x: 100, y: 150, color: '#10b981', icon: '🏢', label: 'Company' },
      'dns': { x: width / 2, y: 250, color: '#8b5cf6', icon: '🌐', label: 'DNS Server' },
      'botnet': { x: 100, y: 150, color: '#dc2626', icon: '🤖', label: 'Botnet' }
    };

    // Get all actors that appear in this attack scenario
    const allActorsInAttack = new Set();
    steps.forEach(step => {
      step.actors.forEach(actor => allActorsInAttack.add(actor));
    });

    // Draw ALL actors (active and inactive) for better context
    allActorsInAttack.forEach(actorId => {
      const actor = actorDefinitions[actorId];
      if (!actor) return;

      const isActive = currentStep.actors.includes(actorId);
      const isPoisoned = currentStep.poisoned && (actorId === 'resolver' || actorId === 'client' || actorId === 'victim');
      const isHighlighted = currentStep.highlight === actorId;
      const isAttacker = actorId === 'attacker' || actorId === 'fake-server';

      // Actor circle
      const actorGroup = g.append('g')
        .attr('class', 'actor-group')
        .attr('opacity', isActive ? 1 : 0.3); // Dim inactive actors

      // Glow effect for highlighted/active actors
      if (isActive && (isHighlighted || currentStep.attack)) {
        actorGroup.append('circle')
          .attr('cx', actor.x)
          .attr('cy', actor.y)
          .attr('r', 70)
          .attr('fill', 'none')
          .attr('stroke', attack.color)
          .attr('stroke-width', 3)
          .attr('opacity', 0)
          .transition()
          .duration(1000)
          .attr('r', 85)
          .attr('opacity', 0.3)
          .transition()
          .duration(1000)
          .attr('r', 70)
          .attr('opacity', 0)
          .on('end', function repeat() {
            d3.select(this)
              .transition()
              .duration(1000)
              .attr('r', 85)
              .attr('opacity', 0.3)
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
        .attr('fill', isPoisoned ? '#dc2626' : isAttacker ? attack.color : actor.color)
        .attr('stroke', isPoisoned ? '#7f1d1d' : isActive ? '#fff' : '#555')
        .attr('stroke-width', isActive ? 4 : 2)
        .style('filter', isActive ? `drop-shadow(0 4px 12px ${isPoisoned ? '#dc262680' : actor.color + '80'})` : 'none');

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
        .attr('fill', isPoisoned ? '#dc2626' : '#1f2937')
        .text(actor.label);

      // Status label for inactive actors
      if (!isActive) {
        actorGroup.append('text')
          .attr('x', actor.x)
          .attr('y', actor.y + 105)
          .attr('text-anchor', 'middle')
          .attr('font-size', '0.75rem')
          .attr('font-style', 'italic')
          .attr('fill', '#6b7280')
          .text('(Inactive)');
      }
      // Poisoned indicator
      if (isPoisoned) {
        actorGroup.append('text')
          .attr('x', actor.x)
          .attr('y', actor.y + 100)
          .attr('text-anchor', 'middle')
          .attr('font-size', '0.75rem')
          .attr('font-weight', '700')
          .attr('fill', '#dc2626')
          .text('⚠️ COMPROMISED');
      }
    });

    // Draw connections based on attack type
    if (currentStep.attack) {
      drawAttackConnections(g, currentStep, actorDefinitions, attack.color);
    }

    // Step indicator
    g.append('text')
      .attr('x', width / 2)
      .attr('y', 40)
      .attr('text-anchor', 'middle')
      .attr('font-size', '1.2rem')
      .attr('font-weight', '700')
      .attr('fill', attack.color)
      .text(`Step ${currentStep.step}/${steps.length}: ${currentStep.title}`);
  };

  const drawAttackConnections = (g, step, actors, color) => {
    // Draw animated attack lines based on actors involved
    const connections = {
      'cache-poisoning': [
        { from: 'attacker', to: 'resolver', type: 'attack' }
      ],
      'mitm': [
        { from: 'client', to: 'attacker', type: 'intercept' },
        { from: 'attacker', to: 'client', type: 'attack' }
      ],
      'amplification': [
        { from: 'attacker', to: 'resolver', type: 'spoof' },
        { from: 'resolver', to: 'victim', type: 'amplify' }
      ],
      'tunneling': [
        { from: 'client', to: 'resolver', type: 'tunnel' }
      ],
      'nxdomain-flood': [
        { from: 'botnet', to: 'resolver', type: 'flood' }
      ],
      'subdomain-takeover': [
        { from: 'attacker', to: 'cloud', type: 'takeover' }
      ]
    };

    // Draw attack lines with animation
    step.actors.forEach((actor, i) => {
      if (i < step.actors.length - 1) {
        const from = actors[step.actors[i]];
        const to = actors[step.actors[i + 1]];
        
        if (from && to) {
          // Animated line
          const line = g.append('line')
            .attr('x1', from.x)
            .attr('y1', from.y)
            .attr('x2', from.x)
            .attr('y2', from.y)
            .attr('stroke', color)
            .attr('stroke-width', 4)
            .attr('stroke-dasharray', '10,5')
            .attr('marker-end', 'url(#arrowhead-attack)')
            .style('filter', `drop-shadow(0 0 8px ${color})`);

          line.transition()
            .duration(1500)
            .attr('x2', to.x)
            .attr('y2', to.y);

          // Animated particles
          const particle = g.append('circle')
            .attr('cx', from.x)
            .attr('cy', from.y)
            .attr('r', 6)
            .attr('fill', color)
            .style('filter', `drop-shadow(0 0 6px ${color})`);

          particle.transition()
            .duration(1500)
            .attr('cx', to.x)
            .attr('cy', to.y)
            .transition()
            .duration(300)
            .attr('r', 12)
            .attr('opacity', 0)
            .remove();
        }
      }
    });

    // Arrow marker
    const defs = g.append('defs');
    defs.append('marker')
      .attr('id', 'arrowhead-attack')
      .attr('markerWidth', 10)
      .attr('markerHeight', 10)
      .attr('refX', 9)
      .attr('refY', 3)
      .attr('orient', 'auto')
      .append('polygon')
      .attr('points', '0 0, 10 3, 0 6')
      .attr('fill', color);
  };

  const startSimulation = (attackId) => {
    setSelectedAttack(attackId);
    setSimulationStep(0);
    setIsSimulating(true);
  };

  const resetSimulation = () => {
    setSimulationStep(0);
    setIsSimulating(false);
  };

  const nextStep = () => {
    const steps = getAttackSteps(selectedAttack);
    if (simulationStep < steps.length - 1) {
      setSimulationStep(simulationStep + 1);
    }
  };

  const prevStep = () => {
    if (simulationStep > 0) {
      setSimulationStep(simulationStep - 1);
    }
  };

  return (
    <div className="attack-scenarios-overlay">
      <div className="attack-scenarios-panel">
        <div className="attack-header">
          <h2>🛡️ DNS Attack Scenarios</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {!selectedAttack ? (
          <div className="attack-grid">
            {attacks.map(attack => (
              <div
                key={attack.id}
                className="attack-card"
                onClick={() => startSimulation(attack.id)}
                style={{ borderColor: attack.color }}
              >
                <div className="attack-icon" style={{ background: `linear-gradient(135deg, ${attack.color}, ${attack.color}dd)` }}>
                  {attack.icon}
                </div>
                <h3>{attack.name}</h3>
                <div className="attack-meta">
                  <span className={`severity ${attack.severity.toLowerCase()}`}>
                    {attack.severity}
                  </span>
                  <span className="difficulty">{attack.difficulty}</span>
                </div>
                <p className="attack-description">{attack.description}</p>
                <p className="attack-impact">
                  <strong>Impact:</strong> {attack.impact}
                </p>
                <button className="simulate-btn" style={{ backgroundColor: attack.color }}>
                  ▶ Simulate Attack
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="simulation-view">
            <div className="simulation-header">
              <button className="back-btn" onClick={() => setSelectedAttack(null)}>
                ← Back to Attacks
              </button>
              <h3>{attacks.find(a => a.id === selectedAttack)?.name}</h3>
            </div>

            <div className="visualization-container">
              <svg ref={svgRef} className="attack-svg"></svg>
            </div>

            <div className="step-info">
              {getAttackSteps(selectedAttack)[simulationStep] && (
                <>
                  <h4>{getAttackSteps(selectedAttack)[simulationStep].title}</h4>
                  <p>{getAttackSteps(selectedAttack)[simulationStep].description}</p>
                </>
              )}
            </div>

            <div className="simulation-controls">
              <button onClick={prevStep} disabled={simulationStep === 0}>
                ⏮ Previous
              </button>
              <button onClick={() => setIsSimulating(!isSimulating)}>
                {isSimulating ? '⏸ Pause' : '▶ Play'}
              </button>
              <button onClick={nextStep} disabled={simulationStep >= getAttackSteps(selectedAttack).length - 1}>
                ⏭ Next
              </button>
              <button onClick={resetSimulation}>
                🔄 Reset
              </button>
            </div>

            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${((simulationStep + 1) / getAttackSteps(selectedAttack).length) * 100}%`,
                  backgroundColor: attacks.find(a => a.id === selectedAttack)?.color
                }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AttackScenariosPanel;
