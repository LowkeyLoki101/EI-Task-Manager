# Troubleshooting Guide - Emergent Intelligence
*Last Updated: August 17, 2025*

## Common Issues & Solutions

### 1. AI Workstation Not Visible

#### Symptoms
- Can't see AI Workstation on home page
- Workstation disappears when typing in chat
- +/- buttons not visible

#### Diagnosis
Check z-index and layering issues in `client/src/components/Workstation.tsx`

#### Solution
```typescript
// In Workstation.tsx, ensure proper z-index:
style={{ 
  height: `${height}px`,
  maxHeight: `${height}px`,
  overflow: 'hidden',
  zIndex: 50,  // Should be 50 or higher
  position: 'relative'
}}
```

#### Verification
1. Look for amber border around Workstation
2. Check for +/- buttons in header controls
3. Try expanding with + button if collapsed

---

### 2. Knowledge Base Entries Not Displaying (RESOLVED - Aug 17, 2025)

#### Symptoms
- API returns 107 entries but UI shows empty
- Different displays in Workstation vs full page
- Click Knowledge Base button but nothing shows

#### Root Cause Analysis
**What We Thought**: Frontend component issues, dual implementations
**Actual Problem**: Parallel backend systems with different API endpoints
- **System A** (working): knowledge-base-manager.ts with 108 entries → `/api/knowledge-base/*`
- **System B** (empty): knowledge-base-system.ts with per-session data → `/api/kb/*`
- **Frontend**: Was calling System B while data existed in System A

#### Why This Was Missed Initially
1. **Focused on symptoms not sources**: Assumed frontend display bugs rather than API routing
2. **Ignored server startup logs**: "Loaded 108 entries" message indicated working system
3. **Different response formats**: `results` vs `entries` vs `count` vs `total` masked the issue
4. **SessionId red herring**: Spent time on sessionId consistency when real issue was endpoint mismatch

#### Solution (IMPLEMENTED)
```typescript
// Fixed in KnowledgeBaseManager.tsx
const { data: searchResults } = useQuery({
  queryKey: ['/api/knowledge-base/search', sessionId, searchQuery, selectedType],
  queryFn: async () => {
    const params = new URLSearchParams({
      sessionId: sessionId,
      query: searchQuery || '',
      type: selectedType === 'all' ? '' : selectedType
    });
    const response = await fetch(`/api/knowledge-base/search?${params}`);
    const result = await response.json();
    return {
      results: result.results || [],
      total: result.total || 0
    };
  }
});
```

#### Lesson Learned
**Always verify which backend system contains the actual data before debugging frontend issues.**

#### Verification
1. Check browser console shows `/api/knowledge-base/search` calls (not `/api/kb/entries`)
2. Server logs show "Loaded 108 entries" on startup
3. API response structure uses `results` and `total` properties

---

### 3. Parallel Systems Debugging Framework

#### How to Identify Parallel System Issues
**Warning Signs**:
- API returns data but frontend shows empty
- Server logs indicate successful operations but UI fails  
- Multiple components doing similar things
- Different API endpoint patterns for same functionality

#### Investigation Steps
1. **Check server logs for data loading messages**:
   ```bash
   grep -i "loaded.*entries" logs/
   # Look for: "[KnowledgeBase] Loaded 108 entries"
   ```

2. **Map API endpoints to actual data sources**:
   ```bash
   curl -s "http://localhost:5000/api/knowledge-base/search?sessionId=test" | jq '.total'
   curl -s "http://localhost:5000/api/kb/entries/test" | jq '.count'
   ```

3. **Trace frontend API calls in browser console**:
   - Look for which endpoints are being called
   - Check response structures (results vs entries vs data)
   - Verify parameter formats match backend expectations

4. **Verify data location**:
   ```bash
   find . -name "*.json" | grep -i knowledge
   ls -la data/
   ```

#### Resolution Pattern
1. Identify which system has the actual data
2. Update frontend to use correct API endpoints  
3. Fix parameter mapping and response structure handling
4. Update cache invalidation to match new endpoints

---

### 4. Chat Window Overlapping Workstation

#### Symptoms
- Workstation hidden when clicking in chat input
- Elements overlap when both expanded
- Can't interact with Workstation tools

#### Root Cause
Z-index stacking context issues between components

#### Solution
1. Set Workstation z-index to 50+
2. Ensure chat components have lower z-index
3. Add position: relative to create stacking context

#### Prevention
Always test with both Workstation expanded and chat active

---

### 4. Parallel Pathway Violations

#### Symptoms
- Same data accessed through different interfaces
- Inconsistent behavior between access points
- User confusion about which interface to use

#### Diagnosis
Look for duplicate implementations:
```bash
# Find all Knowledge Base components
grep -r "KnowledgeBase" client/src/
```

#### Solution
Consolidate to single component used everywhere:
```typescript
// Use same component in both locations
import { KnowledgeBaseManager } from '@/components/KnowledgeBaseManager';

// In Workstation tool
case 'knowledge':
  return <KnowledgeBaseManager sessionId={sessionId} />;

// In page route
<Route path="/knowledge-base" component={KnowledgeBaseManager} />
```

---

### 5. AI Mode Not Working

#### Symptoms
- AI doesn't perform autonomous actions
- No thinking display in Mind's Eye
- Mode toggle not changing behavior

#### Diagnosis
Check Workstation state and intervals:
```typescript
// In Workstation.tsx
useEffect(() => {
  if (workstationState.mode === 'ai' || workstationState.mode === 'hybrid') {
    const interval = setInterval(() => {
      performAutonomousAiAction();
    }, workstationState.mode === 'ai' ? 3000 : 8000);
  }
}, [workstationState.mode]);
```

#### Solution
1. Verify OPENAI_API_KEY is set
2. Check browser console for AI action calls
3. Ensure `/api/workstation/ai-action` endpoint works

---

### 6. Height Adjustment Not Working

#### Symptoms
- +/- buttons don't change container size
- Container stuck at one height
- Can't see full content

#### Location
Lines 426-441 in `client/src/components/Workstation.tsx`

#### Solution
```typescript
const adjustHeight = (delta: number) => {
  setHeight(prev => Math.max(200, Math.min(600, prev + delta)));
};

// Buttons should call:
onClick={() => adjustHeight(-50)}  // Minus button
onClick={() => adjustHeight(50)}   // Plus button
```

---

### 7. ElevenLabs Voice Widget Issues

#### Symptoms
- Voice widget not loading
- "Cannot fetch config for agent" errors
- Widget disappears after error

#### Diagnosis
Check agent ID and configuration:
```javascript
// In VoiceWidget.tsx
const AGENT_ID = 'agent_7401k28d3x9kfdntv7cjrj6t43be';
```

#### Solution
1. Verify agent ID is correct
2. Check ElevenLabs console for agent status
3. Ensure ELEVENLABS_API_KEY is set
4. Try refreshing or opening in new tab

---

## Debugging Commands

### Check API Health
```bash
# Test Knowledge Base API
curl http://localhost:5000/api/knowledge-base/search

# Test Workstation AI action
curl -X POST http://localhost:5000/api/workstation/ai-action/YOUR_SESSION_ID

# Check system status
curl http://localhost:5000/api/status
```

### Browser Console Checks
```javascript
// Check if Workstation is mounted
document.querySelector('[data-testid="workstation-container"]')

// Check current z-index
getComputedStyle(document.querySelector('.workstation')).zIndex

// Force Knowledge Base reload
window.dispatchEvent(new CustomEvent('workstation:open', { 
  detail: { tool: 'knowledge' } 
}))
```

### Database Queries
```sql
-- Check Knowledge Base entries
SELECT COUNT(*) FROM knowledge_base_entries;

-- Check recent human actions
SELECT * FROM human_actions ORDER BY timestamp DESC LIMIT 10;

-- Verify task count
SELECT COUNT(*) FROM tasks WHERE status != 'completed';
```

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Cannot fetch config for agent" | ElevenLabs agent issue | Check agent ID and API key |
| "No replacement was performed" | String match failure in edit | Verify exact string match |
| "Context length exceeded" | AI memory too large | Prune diary entries |
| "Load failed" | API endpoint not responding | Check server logs |
| "Module not found" | Import path issue | Verify file exists at path |

## Quick Fixes

### Reset Workstation State
```javascript
// In browser console
localStorage.removeItem('workstation-state');
location.reload();
```

### Force Visibility
```css
/* Add to component temporarily */
.workstation {
  z-index: 9999 !important;
  position: fixed !important;
  top: 100px !important;
  left: 50px !important;
  right: 50px !important;
}
```

### Clear Cache
```bash
# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

## When All Else Fails

1. Check `replit.md` for recent changes
2. Review git history for breaking changes
3. Restart the workflow in Replit
4. Clear browser cache and cookies
5. Open in incognito/private window
6. Check server logs for unhandled errors

## Contact for Help

If issues persist after trying these solutions:
1. Document the exact symptoms
2. Include browser console errors
3. Note recent changes made
4. Check server logs for errors
5. Create a detailed bug report