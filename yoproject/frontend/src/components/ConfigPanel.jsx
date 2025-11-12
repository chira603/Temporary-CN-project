import React, { useState } from 'react';
import '/src/styles/ConfigPanel.css';

function ConfigPanel({ config, onChange }) {
  const [expanded, setExpanded] = useState(true);
  const isLiveMode = config.queryMode === 'live';

  const recordTypes = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'SOA'];

  return (
    <div className="config-panel">
      <div className="config-header" onClick={() => setExpanded(!expanded)}>
        <h2>⚙️ Configuration</h2>
        <span className="toggle-icon">{expanded ? '▼' : '▶'}</span>
      </div>

      {expanded && (
        <div className="config-content">
          {/* Query Mode Toggle */}
          <div className="config-section query-mode-section">
            <h3>🔄 Query Mode</h3>
            <div className="query-mode-toggle">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={isLiveMode}
                  onChange={(e) => onChange('queryMode', e.target.checked ? 'live' : 'deterministic')}
                  className="toggle-checkbox"
                />
                <span className="toggle-slider"></span>
                <span className="toggle-text">
                  {isLiveMode ? '🌐 Live DNS Mode' : '🎯 Simulation Mode'}
                </span>
              </label>
            </div>
            <div className="mode-description">
              {isLiveMode ? (
                <div className="live-mode-info">
                  <p><strong>✅ Live DNS Mode (dig +trace)</strong></p>
                  <p>• Uses real <code>dig +trace</code> command</p>
                  <p>• Shows actual DNS delegation chain</p>
                  <p>• Real nameservers, IPs, timing, TTLs</p>
                  <p>• DNSSEC validation when available</p>
                  <p>• 100% accurate real-world data</p>
                </div>
              ) : (
                <div className="simulation-mode-info">
                  <p><strong>🎯 Educational Simulation Mode</strong></p>
                  <p>• Rule-based DNS simulation</p>
                  <p>• Configurable parameters below</p>
                  <p>• Fast and predictable behavior</p>
                  <p>• Perfect for learning DNS concepts</p>
                </div>
              )}
            </div>
          </div>

          {/* Record Type - Always Visible */}
          <div className="config-section">
            <h3>Record Type</h3>
            <select
              value={config.recordType}
              onChange={(e) => onChange('recordType', e.target.value)}
              className="select-input"
            >
              {recordTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Simulation-Only Settings */}
          {!isLiveMode && (
            <>
              <div className="config-section">
                <h3>Resolution Mode</h3>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      value="recursive"
                      checked={config.mode === 'recursive'}
                      onChange={(e) => onChange('mode', e.target.value)}
                    />
                    <span>Recursive</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      value="iterative"
                      checked={config.mode === 'iterative'}
                      onChange={(e) => onChange('mode', e.target.value)}
                    />
                    <span>Iterative</span>
                  </label>
                </div>
              </div>

              <fieldset className="simulation-fieldset">
                <legend>Simulation Settings</legend>

                <div className="config-section">
                  <h3>Cache Settings</h3>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={config.cacheEnabled}
                      onChange={(e) => onChange('cacheEnabled', e.target.checked)}
                    />
                    <span>Enable Cache</span>
                  </label>
                  {config.cacheEnabled && (
                    <div className="slider-group">
                      <label>Cache TTL: {config.cacheTTL}s</label>
                      <input
                        type="range"
                        min="60"
                        max="3600"
                        step="60"
                        value={config.cacheTTL}
                        onChange={(e) => onChange('cacheTTL', parseInt(e.target.value))}
                        className="slider"
                      />
                    </div>
                  )}
                </div>

                <div className="config-section">
                  <h3>Network Simulation</h3>
                  <div className="slider-group">
                    <label>Network Latency: {config.networkLatency}ms</label>
                    <input
                      type="range"
                      min="10"
                      max="500"
                      step="10"
                      value={config.networkLatency}
                      onChange={(e) => onChange('networkLatency', parseInt(e.target.value))}
                      className="slider"
                    />
                  </div>
                  <div className="slider-group">
                    <label>Packet Loss: {config.packetLoss}%</label>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      step="5"
                      value={config.packetLoss}
                      onChange={(e) => onChange('packetLoss', parseInt(e.target.value))}
                      className="slider"
                    />
                  </div>
                </div>

                <div className="config-section">
                  <h3>Security</h3>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={config.dnssecEnabled}
                      onChange={(e) => onChange('dnssecEnabled', e.target.checked)}
                    />
                    <span>Enable DNSSEC Validation</span>
                  </label>
                  {config.dnssecEnabled && (
                    <label className="checkbox-label" style={{marginLeft: '20px'}}>
                      <input
                        type="checkbox"
                        checked={config.simulateDNSSECFailure}
                        onChange={(e) => onChange('simulateDNSSECFailure', e.target.checked)}
                      />
                      <span>Simulate DNSSEC Failure</span>
                    </label>
                  )}
                </div>

                <div className="config-section">
                  <h3>Advanced</h3>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={config.simulateFailures}
                      onChange={(e) => onChange('simulateFailures', e.target.checked)}
                    />
                    <span>Simulate Random Failures</span>
                  </label>
                </div>
              </fieldset>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default ConfigPanel;
