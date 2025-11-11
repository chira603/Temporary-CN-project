const express = require('express');
const cors = require('cors');
const dnsResolver = require('./dnsResolver');
const liveDNSResolver = require('./liveDNSResolver');
const attackSimulator = require('./attackSimulator');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// DNS Resolution endpoint
app.post('/api/resolve', async (req, res) => {
  try {
    const { domain, recordType, mode, config } = req.body;

    if (!domain) {
      return res.status(400).json({ error: 'Domain name is required' });
    }

    // Determine which resolver to use based on queryMode
    const queryMode = config?.queryMode || 'deterministic';
    const resolver = queryMode === 'live' ? liveDNSResolver : dnsResolver;

    console.log(`[${queryMode.toUpperCase()} MODE] Resolving ${domain} (${recordType || 'A'}) in ${mode || 'recursive'} mode`);

    const result = await resolver.resolve(domain, recordType || 'A', mode || 'recursive', config || {});
    res.json(result);
  } catch (error) {
    console.error('DNS Resolution error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DNS Attack Simulation endpoint
app.post('/api/simulate-attack', async (req, res) => {
  try {
    const { attackType, domain, config } = req.body;

    if (!attackType) {
      return res.status(400).json({ error: 'Attack type is required' });
    }

    console.log(`[ATTACK SIMULATION] Simulating ${attackType} attack on ${domain || 'example.com'}`);

    const result = await attackSimulator.simulateAttack(attackType, {
      domain: domain || 'example.com',
      ...config
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Attack simulation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get available attack types
app.get('/api/attack-types', (req, res) => {
  res.json({
    attacks: [
      {
        id: 'cache_poisoning',
        name: 'DNS Cache Poisoning',
        description: 'Injecting false DNS records into resolver cache',
        severity: 'HIGH',
        educational_value: 'Shows how attackers can redirect users to malicious servers'
      },
      {
        id: 'dns_amplification',
        name: 'DNS Amplification DDoS',
        description: 'Using DNS servers to amplify attack traffic',
        severity: 'CRITICAL',
        educational_value: 'Demonstrates reflection attacks and traffic amplification'
      },
      {
        id: 'dns_tunneling',
        name: 'DNS Tunneling',
        description: 'Exfiltrating data through DNS queries',
        severity: 'HIGH',
        educational_value: 'Shows how DNS can bypass firewalls for data theft'
      },
      {
        id: 'mitm_attack',
        name: 'Man-in-the-Middle DNS Attack',
        description: 'Intercepting and modifying DNS traffic',
        severity: 'CRITICAL',
        educational_value: 'Illustrates risks of unencrypted DNS on untrusted networks'
      },
      {
        id: 'nxdomain_flood',
        name: 'NXDOMAIN Flood Attack',
        description: 'Overwhelming resolver with nonexistent domain queries',
        severity: 'MEDIUM',
        educational_value: 'Demonstrates resource exhaustion attacks'
      },
      {
        id: 'subdomain_takeover',
        name: 'Subdomain Takeover',
        description: 'Claiming abandoned subdomains',
        severity: 'HIGH',
        educational_value: 'Shows importance of DNS hygiene and monitoring'
      }
    ]
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`DNS Simulation Server running on port ${PORT}`);
  console.log(`Attack simulation endpoints available at /api/simulate-attack`);
});


