// Vercel Serverless: Collect unanswered chatbot questions → GitHub Issue comments
// Required env vars: GITHUB_TOKEN, FAQ_ISSUE_NUMBER (default: auto-created)
// Repo: Inari-Kira-Isla/cloudpipe-landing

const REPO = 'Inari-Kira-Isla/cloudpipe-landing';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ error: 'GITHUB_TOKEN not configured' });

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const question = (body.q || '').trim();
  if (!question || question.length > 500) return res.status(400).json({ error: 'Invalid question' });

  const issueNumber = process.env.FAQ_ISSUE_NUMBER || await findOrCreateIssue(token);
  if (!issueNumber) return res.status(500).json({ error: 'Cannot find/create issue' });

  const timestamp = new Date(body.t || Date.now()).toISOString();
  const commentBody = `**Unanswered Question** (${timestamp})\n\n> ${question}\n\nSource: ${body.u || 'unknown'}`;

  const ghRes = await fetch(`https://api.github.com/repos/${REPO}/issues/${issueNumber}/comments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ body: commentBody })
  });

  if (!ghRes.ok) {
    const err = await ghRes.text();
    return res.status(500).json({ error: 'GitHub API error', detail: err });
  }

  return res.status(200).json({ ok: true });
}

async function findOrCreateIssue(token) {
  // Search for existing FAQ queue issue
  const searchRes = await fetch(
    `https://api.github.com/repos/${REPO}/issues?labels=faq-queue&state=open&per_page=1`,
    { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json' } }
  );
  const issues = await searchRes.json();
  if (Array.isArray(issues) && issues.length > 0) return issues[0].number;

  // Create new issue
  const createRes = await fetch(`https://api.github.com/repos/${REPO}/issues`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: 'FAQ Auto-Learning Queue',
      body: 'This issue collects unanswered chatbot questions for automatic FAQ generation.\n\nProcessed by `scripts/bni_faq_auto.py` daily.',
      labels: ['faq-queue']
    })
  });
  if (!createRes.ok) return null;
  const issue = await createRes.json();
  return issue.number;
}
