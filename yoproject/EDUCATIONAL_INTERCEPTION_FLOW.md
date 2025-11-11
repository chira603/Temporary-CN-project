# Educational Packet Interception Flow Implementation

## User Requirements

The user wants a complete educational visualization showing:

1. **Packet Interception**: Client sends packet → packet stops mid-flight (interception point)
2. **Packet Duplication**: Copy of packet created → sent to Attacker node
3. **Dual Paths**: Original packet continues → DNS Resolver (legitimate path)
4. **Attacker Modification**: User clicks attacker's copy → modifies it (Transaction ID, IP, TTL, etc.)
5. **Modified Packet Sent**: Attacker sends modified packet → DNS Resolver
6. **Outcome Visualization**: Show BOTH paths simultaneously:
   - **Green Path** (Legitimate): Original packet → Correct Website (no attack)
   - **Red Path** (Malicious): Modified packet → Wrong Website/Attacker's Server (attack succeeded)

## Implementation Plan

### Phase 1: Add Interception Point to Packet Flows
- Update `getPacketFlows()` to include:
  - `interceptable: true` - marks packets that should be intercepted
  - `interceptPoint: 'midpoint'` - location to stop packet
  - `attackerCopy: true` - whether to send copy to attacker

### Phase 2: Implement Multi-Stage Packet Animation
- **Stage 1**: Packet moves from source → interception point (stops)
- **Stage 2a**: Copy packet created → sent to Attacker node
- **Stage 2b**: Original packet continues → destination
- **Stage 3**: User modifies attacker's copy (modal interaction)
- **Stage 4**: Modified packet sent from attacker → destination

### Phase 3: Add Dual-Path Visualization
- After both packets reach destination:
  - Determine attack success (Transaction ID matching, timing, etc.)
  - Create two destination nodes:
    - `legitimateDestination`: "Real Bank Server" (green)
    - `maliciousDestination`: "Attacker's Fake Site" (red)
  - Animate packets along both paths simultaneously
  - Color-code paths: green (safe), red (danger)

### Phase 4: Add Educational Annotations
- Show decision point at resolver: "Checking Transaction ID..."
- Display why attack succeeded/failed
- Highlight which packet "won" the race
- Show impact on end user (redirected to safe vs unsafe site)

## Current State Variables

Already added:
```javascript
const [packetIntercepted, setPacketIntercepted] = useState(false);
const [attackerModified, setAttackerModified] = useState(false);
const [showBothPaths, setShowBothPaths] = useState(false);
```

## Next Steps

1. Update `getPacketFlows()` to include interception metadata for Cache Poisoning attack
2. Modify `drawPackets()` to check for `interceptable` flag
3. Implement interception animation logic
4. Add destination nodes to actor positions
5. Implement dual-path drawing function
6. Add educational labels and decision points

## Example Flow (Cache Poisoning - Step 1)

```javascript
{
  from: 'client',
  to: 'resolver',
  interceptable: true,
  interceptPoint: 'midpoint',
  attackerCopy: true,
  label: 'DNS Query',
  malicious: false,
  packetData: {
    type: 'DNS Query',
    transactionID: '0x1a2b',
    // ... rest of packet data
  }
}
```

This will trigger:
1. Packet stops at midpoint
2. Copy sent to attacker
3. Original continues to resolver
4. User can modify attacker's copy
5. Both outcomes shown
