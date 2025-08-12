// provision-calcom.js
// Creates two tools (get_available_slots, book_meeting) and attaches them to your agent.
// Usage:
//   node provision-calcom.js --agent <AGENT_ID> --calkey <CALCOM_API_KEY>
// You must have ELEVENLABS_API_KEY set in env/Secrets.
import 'dotenv/config';
import fetch from 'node-fetch';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  const k = process.argv[i];
  const v = process.argv[i+1];
  if (k && k.startsWith('--')) args.set(k.slice(2), v);
}

const XI_KEY = process.env.ELEVENLABS_API_KEY;
const AGENT_ID = args.get('agent');
const CALKEY = args.get('calkey') || process.env.CALCOM_API_KEY;
if (!XI_KEY || !AGENT_ID || !CALKEY) {
  console.log('Usage: node provision-calcom.js --agent <AGENT_ID> --calkey <CALCOM_API_KEY>');
  process.exit(1);
}

const BASE = 'https://api.elevenlabs.io/v1';

async function api(path, method='GET', body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'xi-api-key': XI_KEY },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : {}; } catch (e) {}
  if (!res.ok) {
    console.error(`[api] ${method} ${path} -> ${res.status}`, text);
    throw new Error(`${method} ${path} failed`);
  }
  return json;
}

async function ensureSecret(name, value) {
  for (const p of ['/convai/secrets', '/conversational-ai/secrets']) {
    try {
      const existing = await api(p, 'GET');
      const match = (existing.secrets || []).find(s => s.name === name);
      if (match) return { path: p, data: match };
      const created = await api(p, 'POST', { name, value, type: 'new' });
      return { path: p, data: created };
    } catch (e) {}
  }
  throw new Error('Unable to create/list secrets (API path may have changed).');
}

async function createTool(payload) {
  for (const p of ['/convai/tools', '/conversational-ai/tools']) {
    try {
      const created = await api(p, 'POST', payload);
      return { path: p, data: created };
    } catch (e) {}
  }
  throw new Error('Unable to create tool (API path/schema may have changed).');
}

async function attachToolToAgent(agent_id, tool_id) {
  for (const p of ['/convai/agents', '/conversational-ai/agents']) {
    try {
      const agent = await api(`${p}/${agent_id}`, 'GET');
      const current = agent?.conversation_config?.agent?.prompt?.tool_ids || [];
      if (!current.includes(tool_id)) {
        await api(`${p}/${agent_id}`, 'PATCH', {
          conversation_config: { agent: { prompt: { tool_ids: [...current, tool_id] } } }
        });
      }
      return;
    } catch (e) {}
  }
  throw new Error('Unable to attach tool to agent (API path may have changed).');
}

(async () => {
  console.log('== Cal.com Tool Provisioning ==');
  const calSecret = await ensureSecret('cal_api_key', `Bearer ${CALKEY}`);
  const secret_id = calSecret.data.secret_id || calSecret.data.id;

  // Tool 1: get_available_slots
  const getSlots = await createTool({
    tool_config: {
      type: 'webhook',
      name: 'get_available_slots',
      description: 'Check if a time is available in Cal.com',
      api_schema: {
        url: 'https://api.cal.com/v2/slots',
        method: 'GET',
        request_headers: [
          { type: 'secret', name: 'Authorization', secret_id: secret_id },
          { type: 'value', name: 'Content-Type', value: 'application/json' },
        ],
        query_params_schema: {
          type: 'object',
          required: ['date'],
          properties: {
            date: { type: 'string', description: 'YYYY-MM-DD' },
            timezone: { type: 'string', description: 'IANA tz like America/Chicago' },
          }
        }
      }
    }
  });

  // Tool 2: book_meeting
  const bookMeeting = await createTool({
    tool_config: {
      type: 'webhook',
      name: 'book_meeting',
      description: 'Create a booking in Cal.com',
      api_schema: {
        url: 'https://api.cal.com/v2/bookings',
        method: 'POST',
        request_headers: [
          { type: 'secret', name: 'Authorization', secret_id: secret_id },
          { type: 'value', name: 'Content-Type', value: 'application/json' },
        ],
        request_body_schema: {
          type: 'object',
          required: ['title', 'start', 'end', 'email'],
          properties: {
            title:  { type: 'string', description: 'Meeting subject' },
            start:  { type: 'string', description: 'ISO datetime' },
            end:    { type: 'string', description: 'ISO datetime' },
            email:  { type: 'string', description: 'Attendee email' },
            notes:  { type: 'string', description: 'Optional notes' }
          }
        }
      }
    }
  });

  const toolIds = [getSlots.data.id || getSlots.data.tool_id, bookMeeting.data.id || bookMeeting.data.tool_id];
  for (const id of toolIds) await attachToolToAgent(AGENT_ID, id);
  console.log('== Done. Attached get_available_slots & book_meeting tools. ==');
})().catch(err => {
  console.error('[fatal]', err.message);
  process.exit(1);
});
