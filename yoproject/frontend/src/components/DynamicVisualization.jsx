import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const DynamicVisualization = ({ results, isLiveMode, currentStep }) => {
  const svgRef = useRef();
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const vizRef = useRef(null); // hold d3 objects and helpers

  // Control handlers
  const handlePlay = () => {
    // Start round-trip animation from the beginning
    setIsPlaying(true);
    setHasPlayed(false);
  };

  // Visualization (static) initialization: build nodes, layout, and containers
  useEffect(() => {
    if (!results || !results.steps || results.steps.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

  const width = 1200;
  const height = 600;
    
    svg.attr('viewBox', `0 0 ${width} ${height}`)
       .attr('width', '100%')
       .attr('height', '100%');

    // Add zoom and pan behavior
    const g = svg.append('g');

    // Background grid for visual cleanliness
    const bg = g.append('g').attr('class', 'background-grid');
    const gridGap = 40;
    for (let x = gridGap; x < width; x += gridGap) {
      bg.append('line')
        .attr('x1', x).attr('y1', 0)
        .attr('x2', x).attr('y2', height)
        .attr('stroke', '#0f172a')
        .attr('stroke-width', 1)
        .attr('opacity', 0.35);
    }
    for (let y = gridGap; y < height; y += gridGap) {
      bg.append('line')
        .attr('x1', 0).attr('y1', y)
        .attr('x2', width).attr('y2', y)
        .attr('stroke', '#0f172a')
        .attr('stroke-width', 1)
        .attr('opacity', 0.35);
    }
    
    const zoom = d3.zoom()
      .scaleExtent([0.5, 3]) // Allow zoom from 50% to 300%
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    
    svg.call(zoom);

  console.log('[DYNAMIC VIZ] Rendering', results.steps.length, 'steps');

    // Extract ONLY servers that appear in the actual steps data
    const serverMap = new Map();
    
    // Always add client first
    serverMap.set('client', {
      id: 'client',
      name: 'Client',
      type: 'client',
      ip: 'Local',
      firstSeen: 0,
      step: null
    });
    
  // Build servers from ALL steps so all nodes visible at start
  results.steps.forEach((step, idx) => {
      const serverInfo = step.server || {};
      const serverType = serverInfo.type?.toLowerCase();
      const serverName = serverInfo.name;
      const stage = step.stage || '';

      console.log(`[DYNAMIC VIZ] Step ${idx}:`, {stage, serverType, serverName, server: serverInfo});

      // Determine server ID from ACTUAL step data (not assumptions)
      let serverId = null;
      let displayName = null;

      if (serverType === 'root') {
        serverId = 'root';
        displayName = serverName || 'Root Server';
      } else if (serverType === 'tld') {
        serverId = 'tld';
        displayName = serverName || 'TLD Server';
      } else if (serverType === 'sld') {
        // Second Level Domain (e.g., .ac.in, .co.uk)
        serverId = 'sld';
        displayName = serverName || 'SLD Server';
      } else if (serverType === 'delegation') {
        // Subdomain delegation (e.g., iitgn.ac.in)
        serverId = 'delegation';
        displayName = serverName || 'Delegated Server';
      } else if (serverType === 'authoritative') {
        serverId = 'authoritative';
        displayName = serverName || 'Authoritative Server';
      } else if (serverType === 'cache') {
        // Only add cache if it's actually in the data
        if (stage.includes('browser')) {
          serverId = 'browser_cache';
          displayName = 'Browser Cache';
        } else if (stage.includes('os')) {
          serverId = 'os_cache';
          displayName = 'OS Cache';
        }
      } else if (
        serverName?.toLowerCase().includes('dns') ||
        serverName?.toLowerCase().includes('resolver') ||
        stage.includes('recursive') ||
        stage.includes('local_resolver')
      ) {
        // Always register recursive resolver even on client_to / to_client stages
        serverId = 'recursive_resolver';
        displayName = serverName || (isLiveMode ? 'Local DNS Resolver' : 'Recursive Resolver');
      }

      // Only add server if we identified it from the data and it's not already added
      if (serverId && !serverMap.has(serverId)) {
        const computedType = serverType || (serverId === 'recursive_resolver' ? 'resolver' : 'unknown');
        serverMap.set(serverId, {
          id: serverId,
          name: displayName,
          type: computedType,
          ip: serverInfo.ip || 'N/A',
          firstSeen: idx,
          step: step
        });
      }
    });

    const servers = Array.from(serverMap.values());
    console.log('[DYNAMIC VIZ] Servers from data:', servers.map(s => `${s.id} (${s.name})`));

    if (servers.length === 0) {
      // Show message if no servers detected
      g.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#fff')
        .attr('font-size', '18px')
        .text('No DNS servers detected in steps data');
      return;
    }

    // HIERARCHICAL positioning for better visualization
    // Layout: Client (left) -> Caches (top-left) -> Recursive (center) -> Hierarchy servers (right)
    const positions = {
      'client': { x: 140, y: height / 2 },
      'browser_cache': { x: 320, y: height / 2 - 140 },
      'os_cache': { x: 320, y: height / 2 + 140 },
      'recursive_resolver': { x: 520, y: height / 2 },
      'root': { x: 840, y: height / 2 - 190 },
      'tld': { x: 840, y: height / 2 - 60 },
      'sld': { x: 840, y: height / 2 + 70 },
      'delegation': { x: 1060, y: height / 2 },
      'authoritative': { x: 840, y: height / 2 + 240 }
    };

    // In live mode, render Local DNS Resolver with the right-side server cluster
    if (isLiveMode) {
      // Move resolver slightly right and below SLD to prevent overlap with TLD/SLD/Authoritative
      positions['recursive_resolver'] = { x: 880, y: height / 2 + 140 };
    }

    servers.forEach((server) => {
      const pos = positions[server.id];
      if (pos) {
        server.x = pos.x;
        server.y = pos.y;
      } else {
        // Fallback for unknown servers
        server.x = 600;
        server.y = height / 2;
      }
      
      // Colors
      const colorMap = {
        'client': '#10b981',
        'browser_cache': '#3b82f6',
        'os_cache': '#06b6d4',
        'recursive_resolver': '#f59e0b',
        'root': '#8b5cf6',
        'tld': '#ec4899',
        'sld': '#f97316',
        'delegation': '#eab308',
        'authoritative': '#ef4444'
      };
      server.color = colorMap[server.id] || '#64748b';
      
      // Icons
      const iconMap = {
        'client': '💻',
        'browser_cache': '🗄️',
        'os_cache': '💾',
        'recursive_resolver': isLiveMode ? '🏠' : '🔄',
        'root': '🌍',
        'tld': '🏢',
        'sld': '🏛️',
        'delegation': '🔗',
        'authoritative': '📋'
      };
      server.icon = iconMap[server.id] || '🖥️';
    });

    // Ensure resolver node displays "Local DNS Resolver" in live mode
    if (isLiveMode) {
      servers.forEach(s => {
        if (s.id === 'recursive_resolver') {
          if (!s.name || s.name.toLowerCase().includes('recursive')) {
            s.name = 'Local DNS Resolver';
          }
        }
      });
    }

    // Auto-spread right-side cluster in live mode and keep resolver at the top
    if (isLiveMode) {
      const order = ['recursive_resolver', 'root', 'tld', 'sld', 'delegation', 'authoritative'];
      const present = order.map(id => servers.find(s => s.id === id)).filter(Boolean);
      if (present.length > 0) {
        // Compute adaptive gap within a visually pleasing range
        const topMargin = 70;
        const bottomMargin = 70;
        const span = Math.max(100, height - topMargin - bottomMargin);
        const count = present.length;
        let gap = count > 1 ? span / (count - 1) : span;
        gap = Math.max(90, Math.min(140, gap)); // clamp
        const startY = (height - gap * (count - 1)) / 2;
        present.forEach((node, idx) => {
          node.y = startY + idx * gap;
          // Keep x as per default positions, but ensure resolver isn't left of core column
          if (node.id === 'recursive_resolver') {
            node.x = Math.max(node.x || 840, 840);
          }
        });
      }
    }

    // Edge rendering derived strictly from steps
    // Arrow markers
    const defs = g.append('defs');
    const makeMarker = (id, color) => {
      defs.append('marker')
        .attr('id', id)
        .attr('viewBox', '0 0 10 10')
        .attr('refX', 10)
        .attr('refY', 5)
        .attr('markerWidth', 8)
        .attr('markerHeight', 8)
        .attr('orient', 'auto-start-reverse')
        .append('path')
        .attr('d', 'M 0 0 L 10 5 L 0 10 z')
        .attr('fill', color)
        .attr('opacity', 0.9);
    };
    makeMarker('arrow-default', '#64748b');
    makeMarker('arrow-query', '#60a5fa');
    makeMarker('arrow-response', '#4ade80');

    // Helper to compute a curved path between two nodes
    const curvedPath = (src, dst) => {
      const mx = (src.x + dst.x) / 2;
      const my = (src.y + dst.y) / 2;
      const dx = dst.x - src.x;
      const dy = dst.y - src.y;
      const len = Math.max(1, Math.hypot(dx, dy));
      const nx = -dy / len;
      const ny = dx / len;
      const curvature = 40; // px offset
      const cx = mx + nx * curvature;
      const cy = my + ny * curvature;
      return `M ${src.x} ${src.y} Q ${cx} ${cy} ${dst.x} ${dst.y}`;
    };

    // Map a stage to an edge {from, to}
    // LIVE MODE: iterative by client (client <-> local resolver, then client <-> root/TLD/SLD/delegation/authoritative)
    // DETERMINISTIC MODE: recursive resolver performs hierarchy lookups (recursive_resolver <-> hierarchy)
    const mapStageToEdge = (stage) => {
      let sourceId = null;
      let targetId = null;
      if (!stage) return null;
      // Cache
      if (stage.includes('browser_cache_query')) { sourceId = 'client'; targetId = 'browser_cache'; }
      else if (stage.includes('browser_cache_response')) { sourceId = 'browser_cache'; targetId = 'client'; }
      else if (stage.includes('os_cache_query')) { sourceId = 'client'; targetId = 'os_cache'; }
      else if (stage.includes('os_cache_response')) { sourceId = 'os_cache'; targetId = 'client'; }
      // Local resolver
      else if (stage === 'local_resolver_query' || stage.includes('local_resolver_query')) { sourceId = 'client'; targetId = 'recursive_resolver'; }
      else if (stage === 'local_resolver_response' || stage.includes('local_resolver_response')) { sourceId = 'recursive_resolver'; targetId = 'client'; }
      // Root
      else if (stage === 'root_query') { sourceId = isLiveMode ? 'client' : 'recursive_resolver'; targetId = 'root'; }
      else if (stage === 'root_response') { sourceId = 'root'; targetId = isLiveMode ? 'client' : 'recursive_resolver'; }
      // Iterative (deterministic) explicit client↔root stages
      else if (stage === 'client_to_root_query') { sourceId = 'client'; targetId = 'root'; }
      else if (stage === 'root_to_client_response') { sourceId = 'root'; targetId = 'client'; }
      else if (stage.includes('recursive_to_root')) { sourceId = 'recursive_resolver'; targetId = 'root'; }
      else if (stage.includes('root_to_recursive')) { sourceId = 'root'; targetId = 'recursive_resolver'; }
      // TLD
      else if (stage === 'tld_query') { sourceId = isLiveMode ? 'client' : 'recursive_resolver'; targetId = 'tld'; }
      else if (stage === 'tld_response') { sourceId = 'tld'; targetId = isLiveMode ? 'client' : 'recursive_resolver'; }
      // Iterative (deterministic) explicit client↔tld stages
      else if (stage === 'client_to_tld_query') { sourceId = 'client'; targetId = 'tld'; }
      else if (stage === 'tld_to_client_response') { sourceId = 'tld'; targetId = 'client'; }
      else if (stage.includes('recursive_to_tld')) { sourceId = 'recursive_resolver'; targetId = 'tld'; }
      else if (stage.includes('tld_to_recursive')) { sourceId = 'tld'; targetId = 'recursive_resolver'; }
      // SLD
      else if (stage === 'sld_query') { sourceId = isLiveMode ? 'client' : 'recursive_resolver'; targetId = 'sld'; }
      else if (stage === 'sld_response') { sourceId = 'sld'; targetId = isLiveMode ? 'client' : 'recursive_resolver'; }
      else if (stage.includes('recursive_to_sld')) { sourceId = 'recursive_resolver'; targetId = 'sld'; }
      else if (stage.includes('sld_to_recursive')) { sourceId = 'sld'; targetId = 'recursive_resolver'; }
      // Delegation
      else if (stage === 'delegation_query') { sourceId = isLiveMode ? 'client' : 'recursive_resolver'; targetId = 'delegation'; }
      else if (stage === 'delegation_response') { sourceId = 'delegation'; targetId = isLiveMode ? 'client' : 'recursive_resolver'; }
      else if (stage.includes('recursive_to_delegation')) { sourceId = 'recursive_resolver'; targetId = 'delegation'; }
      else if (stage.includes('delegation_to_recursive')) { sourceId = 'delegation'; targetId = 'recursive_resolver'; }
      // Authoritative
      else if (stage === 'authoritative_query') { sourceId = isLiveMode ? 'client' : 'recursive_resolver'; targetId = 'authoritative'; }
      else if (stage === 'authoritative_response') { sourceId = 'authoritative'; targetId = isLiveMode ? 'client' : 'recursive_resolver'; }
      // Iterative (deterministic) explicit client↔authoritative stages
      else if (stage === 'client_to_auth_query') { sourceId = 'client'; targetId = 'authoritative'; }
      else if (stage === 'auth_to_client_response') { sourceId = 'authoritative'; targetId = 'client'; }
      else if (stage.includes('recursive_to_authoritative')) { sourceId = 'recursive_resolver'; targetId = 'authoritative'; }
      else if (stage.includes('authoritative_to_recursive')) { sourceId = 'authoritative'; targetId = 'recursive_resolver'; }
  // NXDOMAIN (authoritative negative answer)
  else if (stage === 'nxdomain_query') { sourceId = isLiveMode ? 'client' : 'recursive_resolver'; targetId = 'authoritative'; }
  else if (stage === 'nxdomain_response') { sourceId = 'authoritative'; targetId = isLiveMode ? 'client' : 'recursive_resolver'; }
      // Final
      else if (stage === 'final_query') { sourceId = isLiveMode ? 'client' : 'recursive_resolver'; targetId = 'authoritative'; }
      else if (stage === 'final_answer') { sourceId = 'authoritative'; targetId = isLiveMode ? 'client' : 'recursive_resolver'; }
      // Generic
      else if (stage.includes('client_to_recursive')) { sourceId = 'client'; targetId = 'recursive_resolver'; }
      else if (stage.includes('recursive_to_client')) { sourceId = 'recursive_resolver'; targetId = 'client'; }
      if (!sourceId || !targetId) return null;
      const src = servers.find(s => s.id === sourceId);
      const dst = servers.find(s => s.id === targetId);
      if (!src || !dst) return null;
      return { from: sourceId, to: targetId, src, dst };
    };
    // Container for dotted edges (added after round-trip completion)
    const edgesCompleted = g.append('g').attr('class', 'edges-completed');

    // Draw servers
    const serverGroups = g.selectAll('.server')
      .data(servers)
      .enter()
      .append('g')
      .attr('class', 'server')
      .attr('transform', d => `translate(${d.x}, ${d.y})`);

    // Server circles with subtle halo
    serverGroups.append('circle')
      .attr('r', 0)
      .attr('fill', d => d.color)
      .attr('opacity', 0.95)
      .attr('stroke', '#fff')
      .attr('stroke-width', 3)
      .style('filter', d => `drop-shadow(0 0 10px rgba(0,0,0,0.35)) drop-shadow(0 0 16px ${d.color})`)
      .transition()
      .duration(600)
      .delay((d, i) => i * 200)
      .attr('r', 50);

    // Server icons
    serverGroups.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 10)
      .attr('font-size', '32px')
      .style('opacity', 0)
      .style('pointer-events', 'none')
      .text(d => d.icon)
      .transition()
      .duration(500)
      .delay((d, i) => i * 200 + 200)
      .style('opacity', 1);

    // Server labels
    serverGroups.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 80)
      .attr('fill', '#fff')
      .attr('font-size', '13px')
      .attr('font-weight', 'bold')
      .style('opacity', 0)
      .style('text-shadow', '0 2px 4px rgba(0,0,0,0.8)')
      .style('pointer-events', 'none')
      .text(d => d.name)
      .transition()
      .duration(500)
      .delay((d, i) => i * 200 + 200)
      .style('opacity', 1);

    // Add IP address labels for non-cache servers
    serverGroups.filter(d => d.ip !== 'N/A' && d.ip !== 'Local')
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 95)
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .style('opacity', 0)
      .style('pointer-events', 'none')
      .text(d => d.ip)
      .transition()
      .duration(500)
      .delay((d, i) => i * 200 + 300)
      .style('opacity', 0.8);

    // Save refs for animation effect
    vizRef.current = { svg, g, edgesCompleted, servers, curvedPath, mapStageToEdge };

    // Reset play state when results change
    setIsPlaying(false);
    setHasPlayed(false);

  }, [results, isLiveMode]);

  // Animation scheduler: round-trip per unique interaction
  useEffect(() => {
    if (!isPlaying) return;
    if (!results || !results.steps || results.steps.length === 0) return;
    if (!vizRef.current) return;

    const { g, edgesCompleted, servers, curvedPath, mapStageToEdge } = vizRef.current;

    // cleanup any existing packets/dotted edges
    edgesCompleted.selectAll('*').remove();
    g.selectAll('.packet').remove();

    // Build edges with flags for every step (we animate all steps, not dedup)
    const stepEdges = results.steps.map((step, idx) => {
      const stage = step.stage || '';
      const edge = mapStageToEdge(stage);
      if (!edge) return null;
      const isQuery = step.messageType === 'QUERY' || step.direction === 'request' || stage.includes('query');
      const isResponse = step.messageType === 'RESPONSE' || step.direction === 'response' || stage.includes('response') || stage.includes('answer');
      return { ...edge, isQuery, isResponse, idx, stage };
    }).filter(Boolean);

    const normalizeKey = (a, b) => [a, b].sort().join('|');
    const pairState = new Map(); // key -> {queryIndices:[], responseIndices:[], src, dst, completed:boolean}

    const durationBase = 900;
    const eventGap = 260; // fixed gap for clarity
    let offset = servers.length * 300 + 500;
    const timers = [];
    let scheduled = 0;
    let finished = 0;

    stepEdges.forEach((e) => {
      const key = normalizeKey(e.from, e.to);
      const st = pairState.get(key) || { queryIndices: [], responseIndices: [], src: e.src, dst: e.dst, completed: false };
      if (e.isQuery) st.queryIndices.push(e.idx);
      if (e.isResponse) st.responseIndices.push(e.idx);
      pairState.set(key, st);
    });

    const scheduleStep = (edge) => {
      const color = edge.isQuery ? '#60a5fa' : (edge.isResponse ? '#4ade80' : '#94a3b8');
      const packet = g.append('circle')
        .attr('class', 'packet')
        .attr('cx', edge.src.x)
        .attr('cy', edge.src.y)
        .attr('r', 10)
        .attr('fill', color)
        .attr('stroke', '#fff')
        .attr('stroke-width', 2.5)
        .style('filter', `drop-shadow(0 0 10px ${color})`);
      const duration = durationBase;
      const t = setTimeout(() => {
        packet.transition()
          .duration(duration)
          .ease(d3.easeCubicInOut)
          .attr('cx', edge.dst.x)
          .attr('cy', edge.dst.y)
          .on('end', () => {
            packet.remove();
            finished += 1;
            const key = normalizeKey(edge.from, edge.to);
            const st = pairState.get(key);
            if (st && !st.completed) {
              // Mark complete only after first query AND first response have both appeared
              if (st.queryIndices.length > 0 && st.responseIndices.length > 0) {
                st.completed = true;
                pairState.set(key, st);
                edgesCompleted.append('path')
                  .attr('d', curvedPath(st.src, st.dst))
                  .attr('fill', 'none')
                  .attr('stroke', '#64748b')
                  .attr('stroke-width', 2)
                  .attr('stroke-dasharray', '6,6')
                  .attr('opacity', 0.55)
                  .attr('marker-end', 'url(#arrow-default)');
              }
            }
            if (finished >= scheduled) {
              setIsPlaying(false);
              setHasPlayed(true);
            }
          });
      }, offset);
      timers.push(t);
      offset += duration + eventGap;
      scheduled += 1;
    };

    // Schedule every step in original chronological order
    stepEdges.forEach(scheduleStep);

    return () => {
      timers.forEach(clearTimeout);
      g.selectAll('.packet').interrupt().remove();
    };
  }, [isPlaying, results, isLiveMode]);

  if (!results || !results.steps || results.steps.length === 0) {
    return (
      <div style={{ width: '100%', height: '600px', background: '#1e293b', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
        <p>No DNS resolution data available</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      {/* Minimal Control Panel: Play to end */}
      <div style={{
        background: '#334155',
        padding: '12px',
        borderRadius: '8px',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        justifyContent: 'center'
      }}>
        <button
          onClick={handlePlay}
          style={{
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
            padding: '8px 24px',
            borderRadius: '4px',
            cursor: isPlaying ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
          disabled={isPlaying}
          title={isPlaying ? 'Playing...' : 'Play from start'}
        >
          {isPlaying ? '⏳ Playing…' : (hasPlayed ? '▶️ Replay' : '▶️ Play')}
        </button>
      </div>

      {/* Visualization */}
      <div style={{ width: '100%', height: '600px', background: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>
        <svg ref={svgRef} style={{ display: 'block' }}></svg>
      </div>
    </div>
  );
};

export default DynamicVisualization;
