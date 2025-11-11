import React, { useState } from 'react';
import '../styles/ConfigPanel.css';

function ConfigPanel({ config, onChange }) {
  const [expanded, setExpanded] = useState(false);
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
          <div className="config-section query-mode-section">
            <h3>🔄 Query Mode</h3>
            <div className="query-mode-toggle">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={config.queryMode === 'live'}
                  onChange={(e) => onChange('queryMode', e.target.checked ? 'live' : 'deterministic')}
                  className="toggle-checkbox"
                />
                <span className="toggle-slider"></span>
                <span className="toggle-text">
                  {config.queryMode === 'live' ? '🌐 Live Mode' : '🎯 Deterministic Mode'}
                </span>
              </label>
            </div>
            <div className="mode-description">
              {config.queryMode === 'live' ? (
                <p>✅ Performing actual DNS queries to real servers with real-time feedback</p>
              ) : (
                <p>✅ Simulating DNS queries with deterministic behavior</p>
              )}
            </div>
          </div>

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
            </>
          )}

          {isLiveMode && (
            <div className="live-mode-notice">
              <div className="notice-icon">ℹ️</div>
              <div className="notice-content">
                <h4>Live Mode Active</h4>
                <p>Configuration options are disabled. Live mode performs actual DNS queries to real servers.</p>
                <p>Switch to Deterministic Mode to access simulation settings.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ConfigPanel;

