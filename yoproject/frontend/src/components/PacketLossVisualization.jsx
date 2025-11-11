import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import '../styles/PacketLossVisualization.css';

const PacketLossVisualization = ({ onClose }) => {
  const [selectedScenario, setSelectedScenario] = useState('traditional-success');
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [packetLossRate, setPacketLossRate] = useState(5);
  const [showStats, setShowStats] = useState(false);
  const svgRef = useRef(null);

  const scenarios = {
    'traditional-success': {
      name: 'Traditional DNS - Success',
      protocol: 'UDP',
      port: 53,
      description: 'Normal DNS query without packet loss',
      lossRate: 0,
      steps: [
        { id: 1, action: 'Query Sent', from: 'client', to: 'server', packet: 'query', lost: false, time: 0 },
        { id: 2, action: 'Query Received', from: 'client', to: 'server', packet: 'query', lost: false, time: 50 },
        { id: 3, action: 'Response Sent', from: 'server', to: 'client', packet: 'response', lost: false, time: 100 },
        { id: 4, action: 'Response Received', from: 'server', to: 'client', packet: 'response', lost: false, time: 150 },
      ],
      totalTime: '150ms',
      retries: 0,
    },
    'traditional-loss': {
      name: 'Traditional DNS - Packet Loss',
      protocol: 'UDP',
      port: 53,
      description: 'DNS query packet lost, client must retry',
      lossRate: 100,
      steps: [
        { id: 1, action: 'Query Sent', from: 'client', to: 'server', packet: 'query', lost: false, time: 0 },
        { id: 2, action: 'Packet Lost ❌', from: 'client', to: 'server', packet: 'query', lost: true, time: 50 },
        { id: 3, action: 'Timeout (3s)', from: 'client', to: 'client', packet: 'timeout', lost: false, time: 3050 },
        { id: 4, action: 'Retry #1 Sent', from: 'client', to: 'server', packet: 'query', lost: false, time: 3100 },
        { id: 5, action: 'Query Received', from: 'client', to: 'server', packet: 'query', lost: false, time: 3150 },
        { id: 6, action: 'Response Sent', from: 'server', to: 'client', packet: 'response', lost: false, time: 3200 },
        { id: 7, action: 'Response Received', from: 'server', to: 'client', packet: 'response', lost: false, time: 3250 },
      ],
      totalTime: '3.25s',
      retries: 1,
    },
    'traditional-response-loss': {
      name: 'Traditional DNS - Response Loss',
      protocol: 'UDP',
      port: 53,
      description: 'DNS response packet lost, client must retry entire query',
      lossRate: 50,
      steps: [
        { id: 1, action: 'Query Sent', from: 'client', to: 'server', packet: 'query', lost: false, time: 0 },
        { id: 2, action: 'Query Received', from: 'client', to: 'server', packet: 'query', lost: false, time: 50 },
        { id: 3, action: 'Response Sent', from: 'server', to: 'client', packet: 'response', lost: false, time: 100 },
        { id: 4, action: 'Packet Lost ❌', from: 'server', to: 'client', packet: 'response', lost: true, time: 150 },
        { id: 5, action: 'Timeout (3s)', from: 'client', to: 'client', packet: 'timeout', lost: false, time: 3150 },
        { id: 6, action: 'Retry #1 Sent', from: 'client', to: 'server', packet: 'query', lost: false, time: 3200 },
        { id: 7, action: 'Query Received', from: 'client', to: 'server', packet: 'query', lost: false, time: 3250 },
        { id: 8, action: 'Response Sent', from: 'server', to: 'client', packet: 'response', lost: false, time: 3300 },
        { id: 9, action: 'Response Received', from: 'server', to: 'client', packet: 'response', lost: false, time: 3350 },
      ],
      totalTime: '3.35s',
      retries: 1,
    },
    'traditional-multiple-loss': {
      name: 'Traditional DNS - Multiple Retries',
      protocol: 'UDP',
      port: 53,
      description: 'Multiple packet losses requiring several retry attempts',
      lossRate: 100,
      steps: [
        { id: 1, action: 'Query Sent', from: 'client', to: 'server', packet: 'query', lost: false, time: 0 },
        { id: 2, action: 'Packet Lost ❌', from: 'client', to: 'server', packet: 'query', lost: true, time: 50 },
        { id: 3, action: 'Timeout (3s)', from: 'client', to: 'client', packet: 'timeout', lost: false, time: 3050 },
        { id: 4, action: 'Retry #1 Sent', from: 'client', to: 'server', packet: 'query', lost: false, time: 3100 },
        { id: 5, action: 'Packet Lost ❌', from: 'client', to: 'server', packet: 'query', lost: true, time: 3150 },
        { id: 6, action: 'Timeout (3s)', from: 'client', to: 'client', packet: 'timeout', lost: false, time: 6150 },
        { id: 7, action: 'Retry #2 Sent', from: 'client', to: 'server', packet: 'query', lost: false, time: 6200 },
        { id: 8, action: 'Query Received', from: 'client', to: 'server', packet: 'query', lost: false, time: 6250 },
        { id: 9, action: 'Response Sent', from: 'server', to: 'client', packet: 'response', lost: false, time: 6300 },
        { id: 10, action: 'Response Received', from: 'server', to: 'client', packet: 'response', lost: false, time: 6350 },
      ],
      totalTime: '6.35s',
      retries: 2,
    },
    'doh-success': {
      name: 'DoH/DoT - Success',
      protocol: 'TCP',
      port: 443,
      description: 'DNS over HTTPS with TCP reliability',
      lossRate: 0,
      steps: [
        { id: 1, action: 'TCP Handshake', from: 'client', to: 'server', packet: 'syn', lost: false, time: 0 },
        { id: 2, action: 'Connection Established', from: 'client', to: 'server', packet: 'ack', lost: false, time: 150 },
        { id: 3, action: 'Encrypted Query Sent', from: 'client', to: 'server', packet: 'query', lost: false, time: 200 },
        { id: 4, action: 'Query Received', from: 'client', to: 'server', packet: 'query', lost: false, time: 250 },
        { id: 5, action: 'Encrypted Response', from: 'server', to: 'client', packet: 'response', lost: false, time: 300 },
        { id: 6, action: 'Response Received', from: 'server', to: 'client', packet: 'response', lost: false, time: 350 },
      ],
      totalTime: '350ms',
      retries: 0,
    },
    'doh-packet-loss': {
      name: 'DoH/DoT - With Packet Loss',
      protocol: 'TCP',
      port: 443,
      description: 'TCP automatically retransmits lost segments',
      lossRate: 50,
      steps: [
        { id: 1, action: 'TCP Handshake', from: 'client', to: 'server', packet: 'syn', lost: false, time: 0 },
        { id: 2, action: 'Connection Established', from: 'client', to: 'server', packet: 'ack', lost: false, time: 150 },
        { id: 3, action: 'Encrypted Query Sent', from: 'client', to: 'server', packet: 'query', lost: false, time: 200 },
        { id: 4, action: 'Segment Lost ❌', from: 'client', to: 'server', packet: 'query', lost: true, time: 250 },
        { id: 5, action: 'TCP Auto-Retransmit', from: 'client', to: 'server', packet: 'query', lost: false, time: 450 },
        { id: 6, action: 'Query Received', from: 'client', to: 'server', packet: 'query', lost: false, time: 500 },
        { id: 7, action: 'Encrypted Response', from: 'server', to: 'client', packet: 'response', lost: false, time: 550 },
        { id: 8, action: 'Response Received', from: 'server', to: 'client', packet: 'response', lost: false, time: 600 },
      ],
      totalTime: '600ms',
      retries: 0,
    },
  };

  const currentScenario = scenarios[selectedScenario];

  useEffect(() => {
    if (isSimulating) {
      const interval = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= currentScenario.steps.length - 1) {
            setIsSimulating(false);
            setShowStats(true);
            return prev;
          }
          return prev + 1;
        });
      }, 1500);

      return () => clearInterval(interval);
    }
  }, [isSimulating, currentScenario]);

  useEffect(() => {
    drawVisualization();
  }, [currentStep, selectedScenario]);

  const drawVisualization = () => {
    if (!svgRef.current) return;

    const width = 800;
    const height = 400;
    const margin = { top: 40, right: 40, bottom: 40, left: 40 };

    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Define gradients
    const defs = svg.append('defs');

    // Client gradient
    const clientGradient = defs.append('linearGradient')
      .attr('id', 'client-gradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%');
    clientGradient.append('stop').attr('offset', '0%').attr('stop-color', '#10b981');
    clientGradient.append('stop').attr('offset', '100%').attr('stop-color', '#059669');

    // Server gradient
    const serverGradient = defs.append('linearGradient')
      .attr('id', 'server-gradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%');
    serverGradient.append('stop').attr('offset', '0%').attr('stop-color', '#f59e0b');
    serverGradient.append('stop').attr('offset', '100%').attr('stop-color', '#d97706');

    // Positions
    const clientX = 150;
    const serverX = 650;
    const centerY = height / 2;

    // Draw connection line
    svg.append('line')
      .attr('x1', clientX + 50)
      .attr('y1', centerY)
      .attr('x2', serverX - 50)
      .attr('y2', centerY)
      .attr('stroke', 'rgba(255, 255, 255, 0.2)')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5');

    // Draw client
    const clientGroup = svg.append('g')
      .attr('transform', `translate(${clientX}, ${centerY})`);

    clientGroup.append('circle')
      .attr('r', 50)
      .attr('fill', 'url(#client-gradient)')
      .attr('stroke', '#10b981')
      .attr('stroke-width', 3);

    clientGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.3em')
      .attr('font-size', '30px')
      .text('💻');

    clientGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '70px')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('fill', '#fff')
      .text('Client');

    // Draw server
    const serverGroup = svg.append('g')
      .attr('transform', `translate(${serverX}, ${centerY})`);

    serverGroup.append('circle')
      .attr('r', 50)
      .attr('fill', 'url(#server-gradient)')
      .attr('stroke', '#f59e0b')
      .attr('stroke-width', 3);

    serverGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.3em')
      .attr('font-size', '30px')
      .text('🖥️');

    serverGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '70px')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('fill', '#fff')
      .text('DNS Server');

    // Draw current step
    if (isSimulating && currentStep < currentScenario.steps.length) {
      const step = currentScenario.steps[currentStep];
      
      if (step.packet === 'timeout') {
        // Show timeout indicator on client
        clientGroup.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '-80px')
          .attr('font-size', '40px')
          .text('⏱️')
          .style('animation', 'pulse 1s infinite');

        clientGroup.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '-100px')
          .attr('font-size', '12px')
          .attr('fill', '#ef4444')
          .attr('font-weight', 'bold')
          .text('Waiting...');
      } else if (step.from === 'client' && step.to === 'server') {
        // Packet moving from client to server
        const startX = clientX + 50;
        const endX = serverX - 50;
        const midX = (startX + endX) / 2;

        if (step.lost) {
          // Show packet disappearing
          svg.append('circle')
            .attr('cx', midX)
            .attr('cy', centerY)
            .attr('r', 15)
            .attr('fill', '#ef4444')
            .attr('opacity', 0.8);

          svg.append('text')
            .attr('x', midX)
            .attr('y', centerY - 30)
            .attr('text-anchor', 'middle')
            .attr('font-size', '30px')
            .text('❌');

          svg.append('text')
            .attr('x', midX)
            .attr('y', centerY - 50)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .attr('fill', '#ef4444')
            .attr('font-weight', 'bold')
            .text('PACKET LOST');
        } else {
          // Animated packet
          const packet = svg.append('circle')
            .attr('cx', startX)
            .attr('cy', centerY)
            .attr('r', 12)
            .attr('fill', step.packet === 'query' ? '#3b82f6' : '#10b981')
            .attr('stroke', '#fff')
            .attr('stroke-width', 2);

          packet.transition()
            .duration(1000)
            .attr('cx', endX);

          // Packet label
          svg.append('text')
            .attr('x', midX)
            .attr('y', centerY - 25)
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px')
            .attr('fill', '#fff')
            .attr('font-weight', 'bold')
            .text(step.packet === 'query' ? '📤 Query' : step.packet === 'syn' ? '🤝 SYN' : '✅ ACK');
        }
      } else if (step.from === 'server' && step.to === 'client') {
        // Packet moving from server to client
        const startX = serverX - 50;
        const endX = clientX + 50;
        const midX = (startX + endX) / 2;

        if (step.lost) {
          // Show packet disappearing
          svg.append('circle')
            .attr('cx', midX)
            .attr('cy', centerY)
            .attr('r', 15)
            .attr('fill', '#ef4444')
            .attr('opacity', 0.8);

          svg.append('text')
            .attr('x', midX)
            .attr('y', centerY - 30)
            .attr('text-anchor', 'middle')
            .attr('font-size', '30px')
            .text('❌');

          svg.append('text')
            .attr('x', midX)
            .attr('y', centerY - 50)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .attr('fill', '#ef4444')
            .attr('font-weight', 'bold')
            .text('PACKET LOST');
        } else {
          // Animated packet
          const packet = svg.append('circle')
            .attr('cx', startX)
            .attr('cy', centerY)
            .attr('r', 12)
            .attr('fill', '#10b981')
            .attr('stroke', '#fff')
            .attr('stroke-width', 2);

          packet.transition()
            .duration(1000)
            .attr('cx', endX);

          // Packet label
          svg.append('text')
            .attr('x', midX)
            .attr('y', centerY - 25)
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px')
            .attr('fill', '#fff')
            .attr('font-weight', 'bold')
            .text('📥 Response');
        }
      }
    }

    // Protocol indicator
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 25)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('fill', currentScenario.protocol === 'UDP' ? '#3b82f6' : '#10b981')
      .text(`Protocol: ${currentScenario.protocol} | Port: ${currentScenario.port}`);
  };

  const startSimulation = () => {
    setCurrentStep(0);
    setIsSimulating(true);
    setShowStats(false);
  };

  const resetSimulation = () => {
    setCurrentStep(0);
    setIsSimulating(false);
    setShowStats(false);
  };

  const getImpactLevel = (rate) => {
    if (rate === 0) return { level: 'None', color: '#10b981', icon: '✅' };
    if (rate < 2) return { level: 'Minimal', color: '#3b82f6', icon: '🟢' };
    if (rate < 5) return { level: 'Noticeable', color: '#f59e0b', icon: '🟡' };
    if (rate < 10) return { level: 'Significant', color: '#ef4444', icon: '🟠' };
    return { level: 'Severe', color: '#dc2626', icon: '🔴' };
  };

  const impact = getImpactLevel(packetLossRate);

  return (
    <div className="packet-loss-overlay">
      <div className="packet-loss-panel">
        {/* Header */}
        <div className="packet-loss-header">
          <h2>📡 Packet Loss in DNS Resolution</h2>
          <p className="subtitle">
            Understanding how packet loss affects UDP (Traditional DNS) vs TCP (DoH/DoT)
          </p>
          <button className="close-btn" onClick={onClose} title="Close">✕</button>
        </div>

        {/* Scenario Selection */}
        <div className="scenario-selection">
          <h3>Select Scenario:</h3>
          <div className="scenario-grid">
            {Object.entries(scenarios).map(([key, scenario]) => (
              <button
                key={key}
                className={`scenario-card ${selectedScenario === key ? 'active' : ''} ${scenario.protocol.toLowerCase()}`}
                onClick={() => {
                  setSelectedScenario(key);
                  resetSimulation();
                }}
              >
                <div className="scenario-header">
                  <span className="scenario-icon">{scenario.protocol === 'UDP' ? '📤' : '🔒'}</span>
                  <span className="scenario-protocol">{scenario.protocol}</span>
                </div>
                <h4>{scenario.name}</h4>
                <p className="scenario-desc">{scenario.description}</p>
                <div className="scenario-stats">
                  <span className="stat">⏱️ {scenario.totalTime}</span>
                  <span className="stat">🔄 {scenario.retries} retries</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Visualization */}
        <div className="visualization-section">
          <div className="viz-header">
            <h3>{currentScenario.name}</h3>
            <div className="viz-controls">
              <button 
                className="control-btn start" 
                onClick={startSimulation}
                disabled={isSimulating}
              >
                ▶️ Start
              </button>
              <button 
                className="control-btn reset" 
                onClick={resetSimulation}
              >
                🔄 Reset
              </button>
            </div>
          </div>

          <div className="viz-container">
            <svg ref={svgRef}></svg>
          </div>

          {/* Step Timeline */}
          <div className="step-timeline">
            <h4>Timeline:</h4>
            <div className="steps-list">
              {currentScenario.steps.map((step, index) => (
                <div 
                  key={step.id} 
                  className={`step-item ${index <= currentStep && isSimulating ? 'active' : ''} ${index === currentStep && isSimulating ? 'current' : ''} ${step.lost ? 'lost' : ''}`}
                >
                  <div className="step-number">{index + 1}</div>
                  <div className="step-content">
                    <span className="step-action">{step.action}</span>
                    <span className="step-time">{step.time}ms</span>
                  </div>
                  {step.lost && <span className="loss-indicator">❌</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Statistics Panel */}
        {showStats && (
          <div className="stats-panel">
            <h3>📊 Simulation Results</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">⏱️</div>
                <div className="stat-value">{currentScenario.totalTime}</div>
                <div className="stat-label">Total Time</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🔄</div>
                <div className="stat-value">{currentScenario.retries}</div>
                <div className="stat-label">Retries</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📦</div>
                <div className="stat-value">{currentScenario.steps.length}</div>
                <div className="stat-label">Total Steps</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">{currentScenario.protocol === 'UDP' ? '📤' : '🔒'}</div>
                <div className="stat-value">{currentScenario.protocol}</div>
                <div className="stat-label">Protocol</div>
              </div>
            </div>
          </div>
        )}

        {/* Educational Content */}
        <div className="educational-section">
          <h3>📚 Understanding Packet Loss</h3>
          
          <div className="edu-grid">
            <div className="edu-card">
              <h4>📤 UDP (Traditional DNS)</h4>
              <ul>
                <li><strong>Connectionless:</strong> No handshake, packets sent directly</li>
                <li><strong>No Retransmission:</strong> If packet is lost, UDP doesn't know or care</li>
                <li><strong>Client Responsibility:</strong> Application must detect timeout and retry</li>
                <li><strong>Typical Timeout:</strong> 2-5 seconds before retry</li>
                <li><strong>Max Retries:</strong> Usually 2-3 attempts before giving up</li>
                <li><strong>Total Delay:</strong> Can be 6-15 seconds with packet loss</li>
              </ul>
              <div className="pros-cons">
                <div className="pros">
                  <h5>✅ Advantages</h5>
                  <p>• Fast when no packet loss</p>
                  <p>• Low overhead</p>
                  <p>• Simple protocol</p>
                </div>
                <div className="cons">
                  <h5>❌ Disadvantages</h5>
                  <p>• Vulnerable to packet loss</p>
                  <p>• Long delays on retry</p>
                  <p>• No guaranteed delivery</p>
                </div>
              </div>
            </div>

            <div className="edu-card">
              <h4>🔒 TCP (DoH/DoT)</h4>
              <ul>
                <li><strong>Connection-Oriented:</strong> Establishes reliable connection first</li>
                <li><strong>Auto-Retransmission:</strong> TCP automatically resends lost segments</li>
                <li><strong>Fast Recovery:</strong> Retransmits within 200-500ms typically</li>
                <li><strong>No App Timeout:</strong> Application doesn't need to handle retries</li>
                <li><strong>Guaranteed Delivery:</strong> All data arrives in order</li>
                <li><strong>Total Delay:</strong> Only adds 200-500ms even with packet loss</li>
              </ul>
              <div className="pros-cons">
                <div className="pros">
                  <h5>✅ Advantages</h5>
                  <p>• Handles packet loss gracefully</p>
                  <p>• Fast automatic retransmission</p>
                  <p>• Guaranteed delivery</p>
                  <p>• Encrypted (privacy)</p>
                </div>
                <div className="cons">
                  <h5>❌ Disadvantages</h5>
                  <p>• Higher overhead (handshake)</p>
                  <p>• Slightly slower without loss</p>
                  <p>• More complex protocol</p>
                </div>
              </div>
            </div>
          </div>

          {/* Packet Loss Impact Table */}
          <div className="impact-section">
            <h4>📊 Packet Loss Impact on User Experience</h4>
            <div className="packet-loss-simulator">
              <label>
                Packet Loss Rate: <strong>{packetLossRate}%</strong>
                <input 
                  type="range" 
                  min="0" 
                  max="20" 
                  step="1"
                  value={packetLossRate}
                  onChange={(e) => setPacketLossRate(parseInt(e.target.value))}
                  className="loss-slider"
                />
              </label>
              <div className="impact-indicator" style={{ borderColor: impact.color }}>
                <span className="impact-icon">{impact.icon}</span>
                <span className="impact-level" style={{ color: impact.color }}>{impact.level} Impact</span>
              </div>
            </div>

            <table className="impact-table">
              <thead>
                <tr>
                  <th>Loss Rate</th>
                  <th>UDP Impact</th>
                  <th>TCP Impact</th>
                  <th>User Experience</th>
                </tr>
              </thead>
              <tbody>
                <tr className={packetLossRate === 0 ? 'highlight' : ''}>
                  <td>0%</td>
                  <td>~100ms</td>
                  <td>~300ms</td>
                  <td>✅ Perfect</td>
                </tr>
                <tr className={packetLossRate >= 1 && packetLossRate < 2 ? 'highlight' : ''}>
                  <td>1%</td>
                  <td>~3.1s (30x slower)</td>
                  <td>~500ms (1.6x slower)</td>
                  <td>🟢 Barely noticeable</td>
                </tr>
                <tr className={packetLossRate >= 2 && packetLossRate < 5 ? 'highlight' : ''}>
                  <td>2-5%</td>
                  <td>~3-6s (frequent timeouts)</td>
                  <td>~600-800ms</td>
                  <td>🟡 Noticeable delays</td>
                </tr>
                <tr className={packetLossRate >= 5 && packetLossRate < 10 ? 'highlight' : ''}>
                  <td>5-10%</td>
                  <td>~6-9s (multiple retries)</td>
                  <td>~1-2s</td>
                  <td>🟠 Frustrating slowness</td>
                </tr>
                <tr className={packetLossRate >= 10 ? 'highlight' : ''}>
                  <td>10%+</td>
                  <td>15s+ (often fails)</td>
                  <td>~2-5s</td>
                  <td>🔴 Unusable</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Real-World Scenarios */}
          <div className="real-world-section">
            <h4>🌍 Real-World Packet Loss Scenarios</h4>
            <div className="scenario-examples">
              <div className="example-card">
                <div className="example-icon">📱</div>
                <h5>Mobile/WiFi</h5>
                <p><strong>Typical Loss:</strong> 1-5%</p>
                <p>Moving between WiFi access points, weak signal areas, network congestion</p>
              </div>
              <div className="example-card">
                <div className="example-icon">🌐</div>
                <h5>Public WiFi</h5>
                <p><strong>Typical Loss:</strong> 2-10%</p>
                <p>Overcrowded networks, poor infrastructure, interference</p>
              </div>
              <div className="example-card">
                <div className="example-icon">🛡️</div>
                <h5>DDoS Attack</h5>
                <p><strong>Typical Loss:</strong> 10-50%+</p>
                <p>Network overwhelmed with traffic, routers dropping packets</p>
              </div>
              <div className="example-card">
                <div className="example-icon">🏠</div>
                <h5>Home Fiber</h5>
                <p><strong>Typical Loss:</strong> 0-0.1%</p>
                <p>Stable wired connection, quality infrastructure</p>
              </div>
            </div>
          </div>

          {/* Key Takeaways */}
          <div className="takeaways">
            <h4>💡 Key Takeaways</h4>
            <div className="takeaway-grid">
              <div className="takeaway-item">
                <span className="takeaway-number">1</span>
                <p><strong>UDP = Fast but Fragile:</strong> Traditional DNS uses UDP, which is fast in perfect conditions but suffers greatly from packet loss.</p>
              </div>
              <div className="takeaway-item">
                <span className="takeaway-number">2</span>
                <p><strong>TCP = Slower but Reliable:</strong> DoH/DoT use TCP, which has overhead but handles packet loss 10-30x better.</p>
              </div>
              <div className="takeaway-item">
                <span className="takeaway-number">3</span>
                <p><strong>Caching is Critical:</strong> Cached DNS responses bypass the network entirely, avoiding packet loss completely.</p>
              </div>
              <div className="takeaway-item">
                <span className="takeaway-number">4</span>
                <p><strong>Real-World Matters:</strong> On mobile/WiFi where packet loss is common (1-5%), DoH/DoT provides much better user experience.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PacketLossVisualization;
