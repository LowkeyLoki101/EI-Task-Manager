# Emergent Intelligence - Documentation Hub
*Last Updated: August 17, 2025*

## 🚨 Critical Issues to Review First
- **[CURRENT_ARCHITECTURE.md](./CURRENT_ARCHITECTURE.md)** - Current system state with critical issues
- **[TROUBLESHOOTING_GUIDE.md](./TROUBLESHOOTING_GUIDE.md)** - Solutions for common problems

## Quick Navigation

### Core Documentation
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Complete technical architecture
- **[TECHNICAL_DOCUMENTATION.md](./TECHNICAL_DOCUMENTATION.md)** - System documentation
- **[AI_WORKSTATION_TRACE_ROUTES.md](./AI_WORKSTATION_TRACE_ROUTES.md)** - Complete button/route mapping
- **[SYSTEM_STATUS.md](./SYSTEM_STATUS.md)** - Current system status

### Developer Resources
- **[DEVELOPER_HANDOVER.md](./DEVELOPER_HANDOVER.md)** - Complete setup guide
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Legacy troubleshooting
- **[DYNAMIC_CONTAINER_SIZING.md](./DYNAMIC_CONTAINER_SIZING.md)** - UI container management
- **[N8N_SETUP_GUIDE.md](./N8N_SETUP_GUIDE.md)** - Workflow automation setup
- **[N8N_WORKFLOW_EXAMPLES.md](./N8N_WORKFLOW_EXAMPLES.md)** - Workflow examples

### ElevenLabs Integration
- **[elevenlabs/SETUP_GUIDE.md](./elevenlabs/SETUP_GUIDE.md)** - Voice setup
- **[elevenlabs/ACTIONS_SETUP.md](./elevenlabs/ACTIONS_SETUP.md)** - Actions configuration  
- **[elevenlabs/MODEL_INSTRUCTIONS.md](./elevenlabs/MODEL_INSTRUCTIONS.md)** - AI model instructions
- **[elevenlabs/API_INTEGRATION.md](./elevenlabs/API_INTEGRATION.md)** - SDK usage
- **[elevenlabs/LEGACY_SETUP_GUIDE.md](./elevenlabs/LEGACY_SETUP_GUIDE.md)** - Old setup

### Architecture & Notes
- **[AGENT_ARCHITECTURE_HANDOVER.md](./AGENT_ARCHITECTURE_HANDOVER.md)** - AI agent architecture
- **[notes/IMPLEMENTATION_LOG.md](./notes/IMPLEMENTATION_LOG.md)** - Development log

## Documentation Structure
```
docs/
├── README.md                            # This index file
├── CURRENT_ARCHITECTURE.md              # 🚨 Current state with issues
├── TROUBLESHOOTING_GUIDE.md             # 🔧 How to fix problems
├── ARCHITECTURE.md                      # Technical architecture
├── TECHNICAL_DOCUMENTATION.md           # System documentation
├── AI_WORKSTATION_TRACE_ROUTES.md       # Button/route mapping
├── SYSTEM_STATUS.md                     # System status
├── DEVELOPER_HANDOVER.md                # Setup guide
├── TROUBLESHOOTING.md                   # Legacy troubleshooting
├── DYNAMIC_CONTAINER_SIZING.md          # UI management
├── N8N_SETUP_GUIDE.md                   # Workflow setup
├── N8N_WORKFLOW_EXAMPLES.md             # Workflow examples
├── AGENT_ARCHITECTURE_HANDOVER.md       # Agent architecture
├── elevenlabs/                          # Voice AI integration
│   ├── SETUP_GUIDE.md                  
│   ├── ACTIONS_SETUP.md                
│   ├── MODEL_INSTRUCTIONS.md           
│   ├── API_INTEGRATION.md              
│   └── LEGACY_SETUP_GUIDE.md           
└── notes/                               
    └── IMPLEMENTATION_LOG.md            
```

## Current System State (August 17, 2025)
- **Tasks**: 433 active
- **Knowledge Base**: 107 entries
- **Diary**: 2352 entries  
- **Blogs**: 29 published
- **Critical Issue**: Parallel Knowledge Base implementations violating single registry principle
- **Fixed Issue**: Workstation visibility (z-index increased to 50)

## Key Problems Being Tracked

### 1. Parallel Pathway Violation
- Two Knowledge Base implementations (full page vs workstation panel)
- Violates "single registry" principle
- User requires unified access for humans, AI, and tools

### 2. Layering Issues (FIXED)
- Workstation was hidden behind chat (z-index: 10 → 50)
- +/- height adjustment buttons now visible
- Bright amber borders added for visibility

### 3. AI Memory Context
- Diary exceeding token limits (171K vs 128K)
- Needs memory pruning strategy

## Where to Start
1. Review **[CURRENT_ARCHITECTURE.md](./CURRENT_ARCHITECTURE.md)** for system state
2. Check **[TROUBLESHOOTING_GUIDE.md](./TROUBLESHOOTING_GUIDE.md)** if something's broken
3. Use **[AI_WORKSTATION_TRACE_ROUTES.md](./AI_WORKSTATION_TRACE_ROUTES.md)** to understand button flows
4. Reference **[ARCHITECTURE.md](./ARCHITECTURE.md)** for technical details