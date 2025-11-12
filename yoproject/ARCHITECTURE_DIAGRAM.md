# Component Architecture - Live DNS Resolution Visualization

## Overall Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         App.jsx                                  │
│                                                                   │
│  ┌────────────────┐  ┌──────────────────────────────────────┐  │
│  │  QueryInput    │  │         Main Panel                    │  │
│  │  ConfigPanel   │  │                                       │  │
│  └────────────────┘  │  ┌─────────────────────────────────┐ │  │
│                      │  │   VisualizationPanel            │ │  │
│                      │  │   (Network Diagram)             │ │  │
│                      │  └─────────────────────────────────┘ │  │
│                      │                                       │  │
│                      │  ┌─────────────────────────────────┐ │  │
│                      │  │ LiveResolutionVisualization ⭐   │ │  │
│                      │  │ (NEW - Only in Live Mode)       │ │  │
│                      │  └─────────────────────────────────┘ │  │
│                      │                                       │  │
│                      │  ┌─────────────────────────────────┐ │  │
│                      │  │   ResultsPanel                  │ │  │
│                      │  │   (Text-based results)          │ │  │
│                      │  └─────────────────────────────────┘ │  │
│                      └──────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## LiveResolutionVisualization Component Structure

```
LiveResolutionVisualization
│
├─ Header
│  ├─ Title & Description
│  └─ Controls
│     ├─ Toggle Explanations
│     ├─ Expand All
│     └─ Collapse All
│
├─ Statistics Overview
│  └─ Stats Grid (8 cards)
│     ├─ Total Steps
│     ├─ Total Attempts
│     ├─ Successful
│     ├─ Failed
│     ├─ IPv6 Attempts
│     ├─ IPv4 Attempts
│     ├─ Timeouts
│     └─ DNSSEC Records
│
├─ Filter Controls
│  └─ Filter Buttons
│     ├─ All Steps
│     ├─ With Failures
│     ├─ All Success
│     └─ With DNSSEC
│
└─ Resolution Timeline
   └─ For each step:
      │
      ├─ Step Header (always visible)
      │  ├─ Step Number
      │  ├─ Type Badge
      │  ├─ Zone Name
      │  ├─ Attempt Count Badge
      │  ├─ Failure Badge (if applicable)
      │  ├─ DNSSEC Badge (if applicable)
      │  └─ Expand/Collapse Button
      │
      └─ Step Details (when expanded)
         │
         ├─ Info Section
         │  ├─ Role
         │  ├─ Zone
         │  ├─ Responding Server
         │  └─ Explanation (if enabled)
         │
         ├─ Transport Attempts Section
         │  ├─ Section Explanation (if enabled)
         │  ├─ Attempts Timeline
         │  │  └─ For each attempt:
         │  │     ├─ Timeline Marker
         │  │     └─ Attempt Card
         │  │        ├─ Header (attempt #, badges, time)
         │  │        ├─ Details Grid
         │  │        │  ├─ Target IP
         │  │        │  ├─ Hostname
         │  │        │  ├─ Protocol
         │  │        │  └─ Bytes Received
         │  │        ├─ Error Message (if failed)
         │  │        ├─ Fallback Indicator (if applicable)
         │  │        └─ Explanation (if enabled & failed)
         │  │
         │  ├─ Fallbacks Summary
         │  │  ├─ Fallback Items
         │  │  └─ Explanation (if enabled)
         │  │
         │  └─ Timing Summary
         │     ├─ Total Time
         │     ├─ Successful Attempt Time
         │     └─ Failed Attempts Count
         │
         ├─ DNS Records Section
         │  ├─ Section Explanation (if enabled)
         │  └─ Records Table
         │     ├─ Table Header
         │     └─ Table Rows
         │        ├─ Name
         │        ├─ TTL
         │        ├─ Type
         │        └─ Value
         │
         ├─ DNSSEC Section (if records exist)
         │  ├─ Section Explanation (if enabled)
         │  └─ DNSSEC Records
         │     └─ For each record:
         │        ├─ Header (type, description)
         │        ├─ Data (raw)
         │        └─ Parsed Components (if enabled)
         │
         └─ Notes Section (if notes exist)
            └─ Notes List
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Action                                   │
│              (Query domain in Live Mode)                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                Frontend: api.resolveDNS()                        │
│           POST /api/resolve with queryMode='live'                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Backend: server.js receives request                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│         Backend: LiveDNSTracer.getTrace(domain)                  │
│                Executes: dig +trace domain                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│     LiveDNSTracer: Parse dig output                              │
│     - parseDigTrace()                                            │
│     - enhanceStagesWithAttempts()                                │
│     - extractErrorsAndWarnings()                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│     LiveDNSTracer: generateStructuredExport()                    │
│     Creates detailed JSON with:                                  │
│     - All steps                                                  │
│     - Transport attempts per step                                │
│     - DNS records returned                                       │
│     - DNSSEC records                                             │
│     - Timing summaries                                           │
│     - Notes                                                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│           Backend: server.js sends response                      │
│           {                                                      │
│             success: true,                                       │
│             steps: [...],  // For network diagram                │
│             liveData: {                                          │
│               structuredExport: {...}  // For visualization      │
│             }                                                    │
│           }                                                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│           Frontend: App.jsx receives results                     │
│           Sets state: setResults(resultsWithConfig)              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│       React Re-renders Main Panel Components:                    │
│       1. VisualizationPanel (network diagram)                    │
│       2. LiveResolutionVisualization ⭐ (NEW)                     │
│       3. ResultsPanel (text results)                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  LiveResolutionVisualization receives props:                     │
│  {                                                               │
│    results: {                                                    │
│      liveData: {                                                 │
│        structuredExport: {                                       │
│          steps: [                                                │
│            {                                                     │
│              step_index: 0,                                      │
│              step_type: "root",                                  │
│              attempts: [...],                                    │
│              records_returned: [...],                            │
│              dnssec: [...],                                      │
│              timing_summary: {...}                               │
│            },                                                    │
│            ...                                                   │
│          ]                                                       │
│        }                                                         │
│      }                                                           │
│    }                                                             │
│  }                                                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│      Component processes data:                                   │
│      - Calculates statistics                                     │
│      - Applies filters                                           │
│      - Manages expand/collapse state                             │
│      - Renders visualization                                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  User sees visualization! 🎉                     │
│     - Statistics dashboard                                       │
│     - Interactive timeline                                       │
│     - Detailed step information                                  │
│     - Educational explanations                                   │
└─────────────────────────────────────────────────────────────────┘
```

## State Management

```
LiveResolutionVisualization Component State:
│
├─ expandedSteps: {
│    0: true,    // Step 0 is expanded
│    1: false,   // Step 1 is collapsed
│    2: true,    // Step 2 is expanded
│  }
│
├─ showExplanations: true/false
│  (Controls visibility of educational notes)
│
└─ filterType: "all" | "failures" | "success" | "dnssec"
   (Controls which steps are displayed)

User Interactions:
│
├─ Click step header → toggleStep(index)
│  Updates expandedSteps state
│
├─ Click "Expand All" → expandAll()
│  Sets all steps to expanded
│
├─ Click "Collapse All" → collapseAll()
│  Clears expandedSteps state
│
├─ Click "Toggle Explanations" → setShowExplanations(!showExplanations)
│  Shows/hides educational content
│
└─ Click filter button → setFilterType(type)
   Changes which steps are visible
```

## CSS Architecture

```
LiveResolutionVisualization.css Structure:
│
├─ Component Container (.live-resolution-visualization)
│
├─ Header Section
│  ├─ Title (.viz-title)
│  └─ Controls (.viz-controls)
│
├─ Statistics (.stats-overview)
│  └─ Stats Grid (.stats-grid)
│     └─ Stat Cards (.stat-card)
│        └─ Variants (.success, .failed, .ipv6, .ipv4, etc.)
│
├─ Filters (.filter-controls)
│  └─ Filter Buttons (.filter-btn)
│
├─ Timeline (.resolution-timeline)
│  └─ Steps (.timeline-step)
│     │
│     ├─ Step Header (.step-header)
│     │  ├─ Left side (.step-header-left)
│     │  │  ├─ Step Number (.step-number)
│     │  │  ├─ Type Badge (.step-type-badge)
│     │  │  └─ Zone Name (.step-name)
│     │  │
│     │  └─ Right side (.step-header-right)
│     │     ├─ Badges (.attempts-badge, .failure-badge, .dnssec-badge)
│     │     └─ Expand Button (.expand-btn)
│     │
│     └─ Step Details (.step-details)
│        │
│        ├─ Detail Sections (.detail-section)
│        │  ├─ Info (.info-section)
│        │  ├─ Attempts (.attempts-section)
│        │  ├─ Records (.records-section)
│        │  ├─ DNSSEC (.dnssec-section)
│        │  └─ Notes (.notes-section)
│        │
│        └─ Subsections
│           ├─ Attempt Cards (.attempt-card)
│           ├─ Records Table (.records-table)
│           ├─ DNSSEC Records (.dnssec-record)
│           └─ Explanations (.explanation-box, .section-explanation)
│
├─ Responsive Breakpoints
│  ├─ Desktop: Full layout
│  ├─ Tablet: Optimized columns
│  └─ Mobile: Stacked layout
│
└─ Accessibility
   ├─ Focus states
   ├─ ARIA labels
   └─ High contrast support
```

## Color Coding System

```
Status Colors:
├─ Success: #4caf50 (Green)
├─ Warning: #ff9800 (Orange)
├─ Error: #f44336 (Red)
├─ Info: #2196f3 (Blue)
└─ Security: #9c27b0 (Purple)

Protocol Colors:
├─ IPv6: #2196f3 (Blue)
└─ IPv4: #4caf50 (Green)

Background Gradients:
├─ Statistics: Purple gradient (667eea → 764ba2)
├─ Headers: Light blue gradient
├─ Explanations: Warm orange gradient
├─ Fallbacks: Purple gradient
└─ Timing: Blue gradient
```

## Performance Optimizations

```
Rendering Strategy:
│
├─ Lazy Rendering
│  └─ Only expanded steps show full details
│     (Prevents rendering 1000+ DOM elements)
│
├─ Filtered Rendering
│  └─ Only matching steps are rendered
│     (Reduces DOM size for filtered views)
│
├─ CSS Transitions
│  └─ Smooth animations without JavaScript
│     (Hardware accelerated, 60fps)
│
└─ Memoization
   └─ Statistics calculated once
      (Cached until data changes)
```

---

This architecture provides a clean, maintainable, and performant visualization system! 🎉
