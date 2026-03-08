#!/usr/bin/env python3
"""
BNI ACE FAQ Auto-Learner
- Scans bni-ace.html for member cards → auto-generates FAQ for new members
- Reads unanswered questions from GitHub Issue → generates answers via AI
- Updates bni-ace-faq.json and pushes to GitHub
- Runs daily via LaunchAgent ai.openclaw.bni-faq-auto
"""

import json, hashlib, os, re, subprocess, sys
from datetime import datetime
from pathlib import Path

REPO_DIR = Path.home() / 'Documents' / 'cloudpipe-landing'
FAQ_JSON = REPO_DIR / 'bni-ace-faq.json'
HTML_FILE = REPO_DIR / 'bni-ace.html'
REPO = 'Inari-Kira-Isla/cloudpipe-landing'
LOG_FILE = Path.home() / '.openclaw' / 'memory' / 'bni_faq_auto.log'

def log(msg):
    ts = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    line = f'[{ts}] {msg}'
    print(line)
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(LOG_FILE, 'a') as f:
        f.write(line + '\n')

def load_faq():
    with open(FAQ_JSON, 'r') as f:
        return json.load(f)

def save_faq(faq):
    with open(FAQ_JSON, 'w') as f:
        json.dump(faq, f, ensure_ascii=False, indent=2)

def scan_members():
    """Extract member data from HTML member cards."""
    html = HTML_FILE.read_text()
    pattern = r'data-name="([^"]+)"\s+data-industry="([^"]+)"'
    members = []
    for m in re.finditer(pattern, html):
        name, industry = m.group(1), m.group(2)
        members.append({'name': name, 'industry': industry})
    return members

def find_existing_member_names(faq):
    """Find member names already mentioned in FAQ answers."""
    all_text = ' '.join(item['a'] for item in faq)
    return all_text

def generate_member_faq(member):
    """Generate a FAQ entry for a new member (anonymized, no personal names per PDPA)."""
    industry = member['industry']

    keywords = [industry]

    answer = f'ACE 分會設有{industry}席位。\n\n如需了解更多，歡迎透過 Facebook 專頁 bniacechapter 或參加每週二早上的早餐商務會議。'

    return {'k': keywords, 'a': answer}

def auto_detect_new_members(faq):
    """Detect new members not in FAQ and add entries."""
    members = scan_members()
    existing_text = find_existing_member_names(faq)
    new_entries = []

    for member in members:
        name = member['name']
        # Check if this member is already mentioned in any FAQ answer
        if name in existing_text:
            continue
        # Check Chinese name part
        zh_name = name.split(' ', 1)[0]
        if zh_name in existing_text:
            continue

        entry = generate_member_faq(member)
        new_entries.append(entry)
        log(f'New member detected: [REDACTED] ({member["industry"]})')

    return new_entries

def get_pending_questions():
    """Read unanswered questions from GitHub Issue comments."""
    try:
        result = subprocess.run(
            ['gh', 'api', f'repos/{REPO}/issues', '-q',
             '[.[] | select(.labels[].name == "faq-queue" and .state == "open")] | .[0].number'],
            capture_output=True, text=True, cwd=str(REPO_DIR)
        )
        issue_num = result.stdout.strip()
        if not issue_num or issue_num == 'null':
            return []

        result = subprocess.run(
            ['gh', 'api', f'repos/{REPO}/issues/{issue_num}/comments',
             '-q', '[.[] | {id: .id, body: .body}]'],
            capture_output=True, text=True, cwd=str(REPO_DIR)
        )
        comments = json.loads(result.stdout) if result.stdout.strip() else []

        questions = []
        for c in comments:
            # Extract question from comment body (after "> ")
            match = re.search(r'> (.+)', c['body'])
            if match:
                questions.append({'id': c['id'], 'q': match.group(1).strip()})
        return questions
    except Exception as e:
        log(f'Error reading GitHub Issue: {e}')
        return []

def generate_answer_ai(question, faq):
    """Try to generate an answer using AI. Falls back to template."""
    # Try MiniMax API (same as site_article_generator.py)
    api_key = os.environ.get('MINIMAX_API_KEY', '')
    if not api_key:
        # Try reading from openclaw config
        config_path = Path.home() / '.openclaw' / '.env'
        if config_path.exists():
            for line in config_path.read_text().splitlines():
                if line.startswith('MINIMAX_API_KEY='):
                    api_key = line.split('=', 1)[1].strip().strip('"\'')
                    break

    if not api_key:
        return None  # No AI available, skip

    # Build context from existing FAQ
    context = '\n'.join(f'Q: {" ".join(item["k"][:3])}\nA: {item["a"][:200]}' for item in faq[:15])

    try:
        import urllib.request
        prompt = f"""Based on the following BNI ACE Chapter FAQ knowledge base, generate a concise answer in Traditional Chinese for this question: "{question}"

Context:
{context}

Rules:
- Answer in Traditional Chinese
- Be concise and factual
- If unsure, say to contact via Facebook bniacechapter
- Include relevant details (time, location, fee) if applicable
- NEVER include personal names, phone numbers, email addresses, or home/business addresses in the answer (PDPA compliance)
- Refer users to Facebook page bniacechapter for specific member contact info"""

        data = json.dumps({
            'model': 'MiniMax-Text-01',
            'messages': [{'role': 'user', 'content': prompt}],
            'max_tokens': 500,
            'temperature': 0.3
        }).encode()

        req = urllib.request.Request(
            'https://api.minimax.chat/v1/text/chatcompletion_v2',
            data=data,
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            }
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read())
            answer = result.get('choices', [{}])[0].get('message', {}).get('content', '')
            if answer:
                return answer.strip()
    except Exception as e:
        log(f'AI generation error: {e}')

    return None

def extract_keywords(question):
    """Extract meaningful keywords from a question."""
    # Remove common stop words
    stops = {'的', '是', '什麼', '怎麼', '如何', '可以', '嗎', '呢', '了', '有', '在',
             '和', '與', '或', '到', '會', '能', '要', '想', '請問', 'what', 'how',
             'can', 'is', 'the', 'a', 'an', 'do', 'does', 'where', 'when'}
    words = re.findall(r'[\u4e00-\u9fff]+|[a-zA-Z]+', question.lower())
    return [w for w in words if w not in stops and len(w) > 1]

def process_questions(faq):
    """Process pending questions and generate new FAQ entries."""
    questions = get_pending_questions()
    if not questions:
        log('No pending questions found')
        return [], []

    log(f'Found {len(questions)} pending questions')
    new_entries = []
    processed_ids = []

    # Group similar questions
    seen = set()
    unique_qs = []
    for q in questions:
        normalized = q['q'].lower().strip()
        if normalized not in seen:
            seen.add(normalized)
            unique_qs.append(q)

    for q in unique_qs:
        question = q['q']
        q_hash = hashlib.md5(question.encode()).hexdigest()[:8]
        log(f'Processing question: [{q_hash}]')

        # Check if already answered by existing FAQ
        ql = question.lower()
        already_covered = False
        for item in faq:
            score = sum(1 for k in item['k'] if k.lower() in ql)
            if score >= 2:
                already_covered = True
                break

        if already_covered:
            log(f'  Already covered by existing FAQ, skipping')
            processed_ids.append(q['id'])
            continue

        # Try AI generation
        answer = generate_answer_ai(question, faq)
        if answer:
            keywords = extract_keywords(question)
            if keywords:
                new_entries.append({'k': keywords, 'a': answer})
                log(f'  Generated answer with AI ({len(answer)} chars)')
        else:
            log(f'  No AI available, question logged for manual review')

        processed_ids.append(q['id'])

    return new_entries, processed_ids

def delete_processed_comments(comment_ids):
    """Delete processed comments from GitHub Issue."""
    for cid in comment_ids:
        try:
            subprocess.run(
                ['gh', 'api', '-X', 'DELETE',
                 f'repos/{REPO}/issues/comments/{cid}'],
                capture_output=True, text=True, cwd=str(REPO_DIR)
            )
        except Exception as e:
            log(f'Error deleting comment {cid}: {e}')

def git_push(message):
    """Commit and push changes."""
    try:
        subprocess.run(['git', 'add', 'bni-ace-faq.json'], cwd=str(REPO_DIR), check=True)
        result = subprocess.run(
            ['git', 'diff', '--cached', '--quiet'],
            cwd=str(REPO_DIR)
        )
        if result.returncode == 0:
            log('No changes to commit')
            return False

        subprocess.run(
            ['git', 'commit', '-m', message],
            cwd=str(REPO_DIR), check=True
        )
        subprocess.run(
            ['git', 'push', 'origin', 'main'],
            cwd=str(REPO_DIR), check=True
        )
        log('Pushed to GitHub successfully')
        return True
    except subprocess.CalledProcessError as e:
        log(f'Git error: {e}')
        return False

def main():
    log('=== BNI FAQ Auto-Learner started ===')

    faq = load_faq()
    log(f'Loaded {len(faq)} existing FAQ entries')

    changes = False

    # 1. Auto-detect new members
    member_entries = auto_detect_new_members(faq)
    if member_entries:
        faq.extend(member_entries)
        changes = True
        log(f'Added {len(member_entries)} new member FAQ entries')

    # 2. Process pending questions
    question_entries, processed_ids = process_questions(faq)
    if question_entries:
        faq.extend(question_entries)
        changes = True
        log(f'Added {len(question_entries)} new FAQ entries from questions')

    # 3. Save and push
    if changes:
        save_faq(faq)
        ts = datetime.now().strftime('%Y-%m-%d')
        msg = f'auto: update FAQ ({len(member_entries)} members, {len(question_entries)} questions) [{ts}]'
        git_push(msg)

    # 4. Clean up processed comments
    if processed_ids:
        delete_processed_comments(processed_ids)
        log(f'Cleaned up {len(processed_ids)} processed comments')

    log(f'=== Done. Total FAQ entries: {len(faq)} ===\n')

if __name__ == '__main__':
    main()
