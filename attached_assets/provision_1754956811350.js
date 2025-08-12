// provision.js
// CLI: creates a secret, creates a webhook tool, and attaches it to an Agent by ID.
// Usage:
//   node provision.js --agent <AGENT_ID> --url https://<your-repl>.repl.co/voice-action --tool run_action --secret-name shared_token --secret-value <token>
//
import 'dotenv/config';
import fetch from 'node-fetch';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  const k = process.argv[i];
  const v = process.argv[i+1];
  if (k && k.startsWith('--')) args.set(k.slice(2), v);
}

const XI_KEY = process.env.ELEVENLABS_API_KEY;
if (!XI_KEY) {
  console.error('[fatal] ELEVENLABS_API_KEY is not set. Add it to .env or Replit Secrets.');
  process.exit(1);
}

const AGENT_ID = args.get('agent');
const WEBHOOK_URL = args.get('url');
const TOOL_NAME = args.get('tool') || 'run_action';
const SECRET_NAME = args.get('secret-name') || 'shared_token';
const SECRET_VALUE = args.get('secret-value') || process.env.ELEVEN_SHARED_TOKEN;

if (!AGENT_ID || !WEBHOOK_URL || !SECRET_VALUE) {
  console.log('Usage: node provision.js --agent <AGENT_ID> --url <WEBHOOK_URL> --tool run_action --secret-name shared_token --secret-value <token>');
  process.exit(1);
}

const BASE = 'https://api.elevenlabs.io/v1';

async function api(path, method='GET', body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': XI_KEY,
    },
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
  // Try convai secrets; fallback to conversational-ai if needed
  for (const p of ['/convai/secrets', '/conversational-ai/secrets']) {
    try {
      const existing = await api(p, 'GET');
      const match = (existing.secrets || []).find(s => s.name === name);
      if (match) {
        console.log(`[secret] exists: ${match.secret_id}`);
        return { path: p, data: match };
      }
      const created = await api(p, 'POST', { name, value, type: 'new' });
      console.log('[secret] created:', created.secret_id || created.id || 'unknown');
      return { path: p, data: created };
    } catch (e) {
      // try next candidate path
    }
  }
  throw new Error('Unable to create/list secrets (API path may have changed).');
}

async function createWebhookTool(url, secret_id, name, description) {
  const payloadAdvanced = {
    tool_config: {
      type: 'webhook',
      name,
      description,
      api_schema: {
        url,
        method: 'POST',
        request_headers: [
          { type: 'secret', name: 'Authorization', secret_id },
          { type: 'value', name: 'Content-Type', value: 'application/json' },
        ],
        request_body_schema: {
          type: 'object',
          required: ['action'],
          properties: {
            action:    { type: 'string', description: 'Short verb e.g., create_note, send_email' },
            details:   { type: 'string', description: 'Free text or JSON with extra info' },
            userEmail: { type: 'string', description: 'Optional email address' },
          },
        },
      },
    },
  };

  const payloadSimple = {
    type: 'webhook',
    name,
    description,
    url,
    method: 'POST',
  };

  for (const p of ['/convai/tools', '/conversational-ai/tools']) {
    try {
      const created = await api(p, 'POST', payloadAdvanced);
      console.log('[tool] created (advanced):', created.id || created.tool_id || 'unknown');
      return { path: p, data: created };
    } catch (e) {
      // try simple payload
      try {
        const created = await api(p, 'POST', payloadSimple);
        console.log('[tool] created (simple):', created.id || created.tool_id || 'unknown');
        return { path: p, data: created };
      } catch (e2) {
        // try next path
      }
    }
  }
  throw new Error('Unable to create tool (API path/schema may have changed).');
}

async function attachToolToAgent(agent_id, tool_id) {
  for (const p of ['/convai/agents', '/conversational-ai/agents']) {
    try {
      const agent = await api(`${p}/${agent_id}`, 'GET');
      const current = agent?.conversation_config?.agent?.prompt?.tool_ids || [];
      if (current.includes(tool_id)) {
        console.log('[agent] tool already attached.');
        return agent;
      }
      const updated = await api(`${p}/${agent_id}`, 'PATCH', {
        conversation_config: {
          agent: {
            prompt: {
              tool_ids: [...current, tool_id],
            },
          },
        },
      });
      console.log('[agent] tool attached.');
      return updated;
    } catch (e) {
      // try next path
    }
  }
  throw new Error('Unable to attach tool to agent (API path may have changed).');
}

(async () => {
  console.log('== Provisioning ElevenLabs Tool ==');
  console.log('Agent:', AGENT_ID);
  console.log('Webhook URL:', WEBHOOK_URL);
  console.log('Tool Name:', TOOL_NAME);
  console.log('Secret Name:', SECRET_NAME);

  const sec = await ensureSecret(SECRET_NAME, `Bearer ${SECRET_VALUE}`);
  const secret_id = sec.data.secret_id || sec.data.id;
  if (!secret_id) throw new Error('Secret created, but no secret_id returned.');

  const tool = await createWebhookTool(WEBHOOK_URL, secret_id, TOOL_NAME, 'Send an action to my server and read the result.');
  const tool_id = tool.data.id || tool.data.tool_id;
  if (!tool_id) throw new Error('Tool created, but no tool id returned.');

  await attachToolToAgent(AGENT_ID, tool_id);
  console.log('== Done. The agent now has your tool. ==');
})().catch(err => {
  console.error('[fatal]', err.message);
  process.exit(1);
});
