import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import '../styles/DNSModeComparison.css';

function DNSModeComparison({ onClose }) {
  const [selectedDomain, setSelectedDomain] = useState('example.com');
  const [customDomain, setCustomDomain] = useState('');
  const [isCustomDomain, setIsCustomDomain] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStep, setSimulationStep] = useState(0);
  const [activeMode, setActiveMode] = useState('both'); // 'recursive', 'iterative', 'both'
  const recursiveSvgRef = useRef(null);
  const iterativeSvgRef = useRef(null);

  const exampleDomains = [
    { domain: 'example.com', description: 'Simple .com domain lookup' },
    { domain: 'google.com', description: 'Popular website resolution' },
    { domain: 'github.io', description: 'Two-level TLD (.io)' },
    { domain: 'wikipedia.org', description: 'Non-profit organization (.org)' }
  ];

  // Recursive mode steps
  const getRecursiveSteps = (domain) => [
    {
      step: 1,
      title: 'Client Query',
      description: 'Client sends query to recursive resolver',
      actors: ['client', 'recursive'],
      from: 'client',
      to: 'recursive',
      type: 'query'
    },
    {
      step: 2,
      title: 'Resolver Works',
      description: 'Recursive resolver starts DNS hierarchy traversal',
      actors: ['recursive'],
      highlight: 'recursive',
      type: 'processing'
    },
    {
      step: 3,
      title: 'Root Query',
      description: 'Resolver queries root server for TLD info',
      actors: ['recursive', 'root'],
      from: 'recursive',
      to: 'root',
      type: 'query'
    },
    {
      step: 4,
      title: 'Root Response',
      description: 'Root server returns TLD nameserver referral',
      actors: ['root', 'recursive'],
      from: 'root',
      to: 'recursive',
      type: 'response',
      referral: true
    },
    {
      step: 5,
      title: 'TLD Query',
      description: 'Resolver queries TLD server',
      actors: ['recursive', 'tld'],
      from: 'recursive',
      to: 'tld',
      type: 'query'
    },
    {
      step: 6,
      title: 'TLD Response',
      description: 'TLD server returns authoritative NS referral',
      actors: ['tld', 'recursive'],
      from: 'tld',
      to: 'recursive',
      type: 'response',
      referral: true
    },
    {
      step: 7,
      title: 'Auth Query',
      description: 'Resolver queries authoritative server',
      actors: ['recursive', 'auth'],
      from: 'recursive',
      to: 'auth',
      type: 'query'
    },
    {
      step: 8,
      title: 'Auth Response',
      description: 'Authoritative server returns final answer',
      actors: ['auth', 'recursive'],
      from: 'auth',
      to: 'recursive',
      type: 'response',
      answer: true
    },
    {
      step: 9,
      title: 'Final Response',
      description: 'Resolver returns answer to client',
      actors: ['recursive', 'client'],
      from: 'recursive',
      to: 'client',
      type: 'response',
      answer: true,
      final: true
    }
  ];

  // Iterative mode steps
  const getIterativeSteps = (domain) => [
    {
      step: 1,
      title: 'Root Query',
      description: 'Client directly queries root server',
      actors: ['client', 'root'],
      from: 'client',
      to: 'root',
      type: 'query'
    },
    {
      step: 2,
      title: 'Root Referral',
      description: 'Root server returns TLD nameserver referral',
      actors: ['root', 'client'],
      from: 'root',
      to: 'client',
      type: 'response',
      referral: true
    },
    {
      step: 3,
      title: 'Client Processes',
      description: 'Client processes referral and prepares next query',
      actors: ['client'],
      highlight: 'client',
      type: 'processing'
    },
    {
      step: 4,
      title: 'TLD Query',
      description: 'Client queries TLD server',
      actors: ['client', 'tld'],
      from: 'client',
      to: 'tld',
      type: 'query'
    },
    {
      step: 5,
      title: 'TLD Referral',
      description: 'TLD server returns authoritative NS referral',
      actors: ['tld', 'client'],
      from: 'tld',
      to: 'client',
      type: 'response',
      referral: true
    },
    {
      step: 6,
      title: 'Client Processes',
      description: 'Client processes referral again',
      actors: ['client'],
      highlight: 'client',
      type: 'processing'
    },
    {
      step: 7,
      title: 'Auth Query',
      description: 'Client queries authoritative server',
      actors: ['client', 'auth'],
      from: 'client',
      to: 'auth',
      type: 'query'
    },
    {
      step: 8,
      title: 'Final Answer',
      description: 'Authoritative server returns final answer',
      actors: ['auth', 'client'],
      from: 'auth',
      to: 'client',
      type: 'response',
      answer: true,
      final: true
    }
  ];

  useEffect(() => {
    if (isSimulating) {
      const maxSteps = activeMode === 'recursive' 
        ? getRecursiveSteps(selectedDomain).length
        : activeMode === 'iterative'
        ? getIterativeSteps(selectedDomain).length
        : Math.max(getRecursiveSteps(selectedDomain).length, getIterativeSteps(selectedDomain).length);

      const timer = setInterval(() => {
        setSimulationStep(prev => {
          if (prev >= maxSteps - 1) {
            setIsSimulating(false);
            return prev;
          }
          return prev + 1;
        });
      }, 2000);

      return () => clearInterval(timer);
    }
  }, [isSimulating, selectedDomain, activeMode]);

  useEffect(() => {
    if (activeMode === 'recursive' || activeMode === 'both') {
      drawVisualization('recursive');
    }
    if (activeMode === 'iterative' || activeMode === 'both') {
      drawVisualization('iterative');
    }
  }, [simulationStep, activeMode, selectedDomain]);

  const drawVisualization = (mode) => {
    const svgRef = mode === 'recursive' ? recursiveSvgRef : iterativeSvgRef;
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth;
    const height = 500;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g');

    const steps = mode === 'recursive' 
      ? getRecursiveSteps(selectedDomain)
      : getIterativeSteps(selectedDomain);

    if (steps.length === 0) return;

    const currentStep = steps[Math.min(simulationStep, steps.length - 1)];

    // Define actor positions
    const actorDefinitions = {
      'client': { 
        x: 100, 
        y: height / 2, 
        color: '#10b981', 
        icon: '💻', 
        label: 'Client',
        description: mode === 'recursive' 
          ? 'Sends query and waits for final answer'
          : 'Handles all referrals and follows the chain'
      },
      'recursive': { 
        x: width / 2, 
        y: height / 2, 
        color: '#f59e0b', 
        icon: '🔄', 
        label: 'Recursive Resolver',
        description: 'Does all the work for the client'
      },
      'root': { 
        x: width - 150, 
        y: 100, 
        color: '#8b5cf6', 
        icon: '🌍', 
        label: 'Root Server',
        description: 'Returns TLD nameserver info'
      },
      'tld': { 
        x: width - 150, 
        y: height / 2, 
        color: '#ec4899', 
        icon: '🏢', 
        label: 'TLD Server',
        description: 'Returns authoritative NS info'
      },
      'auth': { 
        x: width - 150, 
        y: height - 100, 
        color: '#ef4444', 
        icon: '📋', 
        label: 'Authoritative Server',
        description: 'Returns final answer'
      }
    };

    // Get all actors that appear in this mode
    const allActorsInMode = new Set();
    steps.forEach(step => {
      step.actors.forEach(actor => allActorsInMode.add(actor));
    });

    // Draw all actors
    allActorsInMode.forEach(actorId => {
      const actor = actorDefinitions[actorId];
      if (!actor) return;

      const isActive = currentStep.actors.includes(actorId);
      const isHighlighted = currentStep.highlight === actorId;

      const actorGroup = g.append('g')
        .attr('class', 'actor-group')
        .attr('opacity', isActive ? 1 : 0.3);

      // Glow effect for active actors
      if (isActive && isHighlighted) {
        const pulse = actorGroup.append('circle')
          .attr('cx', actor.x)
          .attr('cy', actor.y)
          .attr('r', 70)
          .attr('fill', 'none')
          .attr('stroke', actor.color)
          .attr('stroke-width', 3)
          .attr('opacity', 0);

        pulse.transition()
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
        .attr('fill', actor.color)
        .attr('stroke', isActive ? '#fff' : '#555')
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

      // Status for inactive
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
    });

    // Draw connection if there's a from/to
    if (currentStep.from && currentStep.to) {
      const from = actorDefinitions[currentStep.from];
      const to = actorDefinitions[currentStep.to];

      if (from && to) {
        // Arrow marker
        const defs = svg.append('defs');
        const markerId = `arrow-${mode}-${simulationStep}`;
        
        defs.append('marker')
          .attr('id', markerId)
          .attr('markerWidth', 10)
          .attr('markerHeight', 10)
          .attr('refX', 9)
          .attr('refY', 3)
          .attr('orient', 'auto')
          .append('polygon')
          .attr('points', '0 0, 10 3, 0 6')
          .attr('fill', currentStep.type === 'query' ? '#3b82f6' : '#10b981');

        // Connection line
        const line = g.append('line')
          .attr('x1', from.x)
          .attr('y1', from.y)
          .attr('x2', from.x)
          .attr('y2', from.y)
          .attr('stroke', currentStep.type === 'query' ? '#3b82f6' : '#10b981')
          .attr('stroke-width', 4)
          .attr('stroke-dasharray', currentStep.referral ? '10,5' : '0')
          .attr('marker-end', `url(#${markerId})`)
          .style('filter', `drop-shadow(0 0 8px ${currentStep.type === 'query' ? '#3b82f680' : '#10b98180'})`);

        line.transition()
          .duration(1500)
          .attr('x2', to.x)
          .attr('y2', to.y);

        // Animated packet
        const packet = g.append('circle')
          .attr('cx', from.x)
          .attr('cy', from.y)
          .attr('r', 8)
          .attr('fill', currentStep.type === 'query' ? '#3b82f6' : '#10b981')
          .style('filter', `drop-shadow(0 0 6px ${currentStep.type === 'query' ? '#3b82f6' : '#10b981'})`);

        packet.transition()
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

    // Step title and description
    g.append('text')
      .attr('x', width / 2)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .attr('font-size', '1.2rem')
      .attr('font-weight', '700')
      .attr('fill', '#fff')
      .text(`Step ${currentStep.step}/${steps.length}: ${currentStep.title}`);

    g.append('text')
      .attr('x', width / 2)
      .attr('y', 55)
      .attr('text-anchor', 'middle')
      .attr('font-size', '0.9rem')
      .attr('fill', '#a5b4fc')
      .text(currentStep.description);
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

  const handleNext = () => {
    const maxSteps = activeMode === 'recursive' 
      ? getRecursiveSteps(selectedDomain).length
      : activeMode === 'iterative'
      ? getIterativeSteps(selectedDomain).length
      : Math.max(getRecursiveSteps(selectedDomain).length, getIterativeSteps(selectedDomain).length);
    
    if (simulationStep < maxSteps - 1) {
      setSimulationStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (simulationStep > 0) {
      setSimulationStep(prev => prev - 1);
    }
  };

  return (
    <div className="dns-mode-comparison-overlay">
      <div className="dns-mode-comparison-panel">
        <div className="comparison-header">
          <h2>🔄 DNS Resolution Mode Comparison</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="comparison-description">
          <p>
            Compare how <strong>Recursive</strong> and <strong>Iterative</strong> DNS resolution work differently. 
            In recursive mode, the resolver does all the work. In iterative mode, the client handles each referral.
          </p>
        </div>

        {/* Domain Selection */}
        <div className="domain-selection">
          <h3>Select Domain to Resolve:</h3>
          <div className="domain-grid">
            {exampleDomains.map((item) => (
              <button
                key={item.domain}
                className={`domain-card ${selectedDomain === item.domain && !isCustomDomain ? 'active' : ''}`}
                onClick={() => {
                  setSelectedDomain(item.domain);
                  setIsCustomDomain(false);
                  setSimulationStep(0);
                  setIsSimulating(false);
                }}
              >
                <span className="domain-name">🌐 {item.domain}</span>
                <span className="domain-desc">{item.description}</span>
              </button>
            ))}
          </div>

          {/* Custom Domain Input */}
          <div className="custom-domain-section">
            <h4>Or Enter Your Own Domain:</h4>
            <div className="custom-domain-input-group">
              <input
                type="text"
                className="custom-domain-input"
                placeholder="e.g., chirag.com, github.io, example.org"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && customDomain.trim()) {
                    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
                    if (domainRegex.test(customDomain.trim())) {
                      setSelectedDomain(customDomain.trim());
                      setIsCustomDomain(true);
                      setSimulationStep(0);
                      setIsSimulating(false);
                    }
                  }
                }}
              />
              <button
                className="custom-domain-btn"
                disabled={!customDomain.trim()}
                onClick={() => {
                  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
                  if (domainRegex.test(customDomain.trim())) {
                    setSelectedDomain(customDomain.trim());
                    setIsCustomDomain(true);
                    setSimulationStep(0);
                    setIsSimulating(false);
                  } else {
                    alert('Please enter a valid domain name (e.g., chirag.com, example.org)');
                  }
                }}
              >
                {isCustomDomain && selectedDomain === customDomain.trim() ? '✓ Using Custom Domain' : '🔍 Simulate Custom Domain'}
              </button>
            </div>
            {isCustomDomain && selectedDomain === customDomain.trim() && (
              <div className="custom-domain-active">
                <span className="custom-domain-badge">🎯 Custom Domain Active: <strong>{selectedDomain}</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* Mode Selection */}
        <div className="mode-selection">
          <h3>View Mode:</h3>
          <div className="mode-buttons">
            <button
              className={`mode-btn ${activeMode === 'recursive' ? 'active' : ''}`}
              onClick={() => {
                setActiveMode('recursive');
                setSimulationStep(0);
              }}
            >
              🔄 Recursive Only
            </button>
            <button
              className={`mode-btn ${activeMode === 'iterative' ? 'active' : ''}`}
              onClick={() => {
                setActiveMode('iterative');
                setSimulationStep(0);
              }}
            >
              🔁 Iterative Only
            </button>
            <button
              className={`mode-btn ${activeMode === 'both' ? 'active' : ''}`}
              onClick={() => {
                setActiveMode('both');
                setSimulationStep(0);
              }}
            >
              ⚖️ Side-by-Side
            </button>
          </div>
        </div>

        {/* Visualization Area */}
        <div className={`visualization-area ${activeMode === 'both' ? 'split-view' : 'single-view'}`}>
          {(activeMode === 'recursive' || activeMode === 'both') && (
            <div className="mode-visualization recursive-viz">
              <h3 className="viz-title">
                <span className="mode-icon">🔄</span>
                Recursive Mode
                <span className="mode-badge recursive">Resolver Does All Work</span>
              </h3>
              <svg ref={recursiveSvgRef} className="comparison-svg"></svg>
              <div className="mode-info">
                <p><strong>How it works:</strong> Client sends one query to recursive resolver, which then queries root, TLD, and authoritative servers on behalf of the client, returning the final answer.</p>
                <p className="pros">✅ <strong>Pros:</strong> Simple for client, caching benefits, reduced client complexity</p>
                <p className="cons">❌ <strong>Cons:</strong> More load on resolver, privacy concerns, single point of failure</p>
              </div>
            </div>
          )}

          {(activeMode === 'iterative' || activeMode === 'both') && (
            <div className="mode-visualization iterative-viz">
              <h3 className="viz-title">
                <span className="mode-icon">🔁</span>
                Iterative Mode
                <span className="mode-badge iterative">Client Follows Referrals</span>
              </h3>
              <svg ref={iterativeSvgRef} className="comparison-svg"></svg>
              <div className="mode-info">
                <p><strong>How it works:</strong> Client directly queries each DNS server in the hierarchy, following referrals from root → TLD → authoritative server until getting the final answer.</p>
                <p className="pros">✅ <strong>Pros:</strong> More control, better privacy, distributed load, no single point of failure</p>
                <p className="cons">❌ <strong>Cons:</strong> More complex client, more network requests, slower resolution</p>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="simulation-controls">
          <button className="control-btn" onClick={handleReset} title="Reset to beginning">
            ⏮️ Reset
          </button>
          <button className="control-btn" onClick={handlePrev} disabled={simulationStep === 0} title="Previous step">
            ◀️ Prev
          </button>
          <button className="control-btn play-btn" onClick={isSimulating ? handlePause : handlePlay} title="Play/Pause">
            {isSimulating ? '⏸️ Pause' : '▶️ Play'}
          </button>
          <button 
            className="control-btn" 
            onClick={handleNext} 
            disabled={simulationStep >= (activeMode === 'recursive' 
              ? getRecursiveSteps(selectedDomain).length - 1
              : activeMode === 'iterative'
              ? getIterativeSteps(selectedDomain).length - 1
              : Math.max(getRecursiveSteps(selectedDomain).length - 1, getIterativeSteps(selectedDomain).length - 1)
            )}
            title="Next step"
          >
            Next ▶️
          </button>
        </div>

        {/* Comparison Summary */}
        {activeMode === 'both' && (
          <div className="comparison-summary">
            <h3>📊 Quick Comparison</h3>
            <div className="summary-grid">
              <div className="summary-item">
                <div className="summary-label">Number of Queries</div>
                <div className="summary-value">
                  <span className="recursive-value">Recursive: {getRecursiveSteps(selectedDomain).filter(s => s.type === 'query').length}</span>
                  <span className="iterative-value">Iterative: {getIterativeSteps(selectedDomain).filter(s => s.type === 'query').length}</span>
                </div>
              </div>
              <div className="summary-item">
                <div className="summary-label">Client Complexity</div>
                <div className="summary-value">
                  <span className="recursive-value">Recursive: Low 🟢</span>
                  <span className="iterative-value">Iterative: High 🔴</span>
                </div>
              </div>
              <div className="summary-item">
                <div className="summary-label">Resolver Load</div>
                <div className="summary-value">
                  <span className="recursive-value">Recursive: High 🔴</span>
                  <span className="iterative-value">Iterative: Low 🟢</span>
                </div>
              </div>
              <div className="summary-item">
                <div className="summary-label">Common Usage</div>
                <div className="summary-value">
                  <span className="recursive-value">Recursive: 95% of clients 🌟</span>
                  <span className="iterative-value">Iterative: DNS servers, special cases</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DNSModeComparison;
