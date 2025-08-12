// server.js
// Minimal Express server that implements a single webhook endpoint your ElevenLabs agent can call.
import 'dotenv/config';
import express from 'express';

const app = express();
app.use(express.json());

const SHARED = process.env.ELEVEN_SHARED_TOKEN;
if (!SHARED) {
  console.warn('[WARN] ELEVEN_SHARED_TOKEN not set. Set it in .env or Replit Secrets.');
}

// Health check
app.get('/', (req, res) => res.send('OK'));

// Main webhook the agent will call
app.post('/voice-action', async (req, res) => {
  try {
    const auth = req.headers['authorization'] || '';
    if (!SHARED || auth !== `Bearer ${SHARED}`) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const { action, details, userEmail } = req.body || {};
    console.log('[voice-action] incoming', { action, details, userEmail });

    let message = 'No-op';
    switch (action) {
      case 'create_note':
        // TODO: save to DB / Notion / Google Sheets
        console.log(`[NOTE] ${details}`);
        message = 'Note created.';
        break;
      case 'send_email':
        // TODO: integrate a real email service (Resend, Sendgrid, Gmail API via OAuth)
        console.log(`[EMAIL] to ${userEmail} | ${details}`);
        message = `Email queued to ${userEmail}.`;
        break;
      case 'book_meeting':
        // TODO: call Cal.com or your scheduler; keep it simple at first
        console.log(`[MEETING] request: ${details}`);
        message = 'Meeting booking requested.';
        break;
      default:
        message = `Unknown action: ${action}`;
    }

    return res.json({ ok: true, message });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[server] listening on ${PORT}`));
