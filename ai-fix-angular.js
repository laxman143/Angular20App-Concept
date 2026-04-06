/*
  ai-fix-angular.js

  Node script to analyze a GitHub issue, detect relevant Angular files,
  call an AI model to generate fixes, and (optionally) commit & create a PR.

  Usage:
    node ai-fix-angular.js --prepare   # writes modified files to workspace, creates .ai-fix/prepare.json
    node ai-fix-angular.js --finalize  # commits, pushes branch, creates PR (requires GITHUB_TOKEN)

  Environment:
    GITHUB_EVENT_PATH - path to GitHub event JSON (set by Actions)
    HUGGINGFACE_API_KEY - (optional) Hugging Face Inference API key
    GITHUB_TOKEN - token to push branch & create PR

  Safety:
    - Will skip if no relevant files found
    - Limits max files modified to 5
    - In prepare step, only writes files locally (no commits)
    - In finalize step, creates branch and PR only if prepare file exists

*/

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');

const MAX_FILES = 5;
const AI_TEMP_DIR = '.ai-fix';

function log(...args){ console.log('[ai-fix]', ...args); }

function readJsonSafe(p){ try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch(e){ return null; } }

function writeJsonSafe(p, obj){ fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8'); }

function getEvent(){ const evPath = process.env.GITHUB_EVENT_PATH || process.env.GITHUB_EVENT || './event.json'; if(!fs.existsSync(evPath)){ log('GITHUB_EVENT_PATH not found:', evPath); return null; } return readJsonSafe(evPath); }

function extractIssueData(event){ if(!event || !event.issue) return null; const issue = event.issue; return { number: issue.number, title: issue.title || '', body: issue.body || '', labels: (issue.labels||[]).map(l=> typeof l === 'string' ? l : l.name).filter(Boolean) }; }

function findMentionedFiles(text){ if(!text) return []; const re = /([\w\-\/\.]+\.(ts|html|scss|css))/gi; const matches = []; let m; while((m = re.exec(text))){ matches.push(m[1]); } return Array.from(new Set(matches)); }

function findFilesByBasename(basename){
  const results = [];
  function walk(dir){ const list = fs.readdirSync(dir); for(const f of list){ const full = path.join(dir,f); const stat = fs.statSync(full); if(stat.isDirectory()){ walk(full); } else { if(path.basename(full) === basename) results.push(path.relative(process.cwd(), full).replace(/\\/g,'/')); } } }
  try{ walk(path.join(process.cwd(), 'src')); }catch(e){}
  return results;
}

function keywordsFromText(text){ if(!text) return []; const kws = ['component','service','module','pipe','directive','html','template','scss','style','route','router','guard','interceptor','form','http','rxjs']; const found = new Set(); const t = (text||'').toLowerCase(); for(const k of kws) if(t.includes(k)) found.add(k); return Array.from(found); }

function findFilesByKeywords(keywords){ const globs = [];
  // Simple heuristics: look for filenames containing keyword under src/
  const root = process.cwd();
  function walk(dir){ const res = []; const list = fs.readdirSync(dir); for(const f of list){ const full = path.join(dir,f); const stat = fs.statSync(full); if(stat.isDirectory()){ res.push(...walk(full)); } else { res.push(full); } } return res; }
  let files = [];
  try{ files = walk(path.join(process.cwd(), 'src')); } catch(e){ files = []; }
  const candidate = [];
  for(const f of files){ const rel = path.relative(process.cwd(), f).replace(/\\/g,'/'); const lower = rel.toLowerCase(); for(const k of keywords){ if(lower.includes(k)) { candidate.push(rel); break; } }
    // also include TypeScript Angular artifacts
    if(/\.component\.ts$/.test(lower) || /\.service\.ts$/.test(lower) || /\.module\.ts$/.test(lower)) candidate.push(rel);
  }
  return Array.from(new Set(candidate));
}

async function callHuggingFace(prompt, model='bigcode/starcoder'){
  if(!process.env.HUGGINGFACE_API_KEY){ log('HUGGINGFACE_API_KEY not set; skipping AI call.'); return null; }
  const data = JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 1024, temperature: 0.0 } });

  // Try the recommended router endpoint first, then fallback to api-inference
  const hosts = ['router.huggingface.co', 'api-inference.huggingface.co'];
  for(const host of hosts){
    const options = {
      hostname: host,
      path: `/models/${model}`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    try{
      const out = await new Promise((resolve, reject)=>{
        const req = https.request(options, res => {
          let body = '';
          res.on('data', d => body += d);
          res.on('end', () => resolve({ status: res.statusCode, body }));
        });
        req.on('error', e => reject(e));
        req.write(data);
        req.end();
      });
      if(out && out.body){
        // Save raw response for debugging
        fs.mkdirSync(AI_TEMP_DIR, { recursive: true });
        fs.writeFileSync(path.join(AI_TEMP_DIR,'ai-raw-response.txt'), out.body, 'utf8');
        try{
          const parsed = JSON.parse(out.body);
          // Response shapes vary: try several common fields
          if(typeof parsed === 'string') return parsed;
          if(parsed.error) throw new Error(parsed.error.toString());
          if(Array.isArray(parsed) && parsed[0] && parsed[0].generated_text) return parsed[0].generated_text;
          if(parsed.generated_text) return parsed.generated_text;
          if(parsed.data && Array.isArray(parsed.data) && parsed.data[0] && parsed.data[0].generated_text) return parsed.data[0].generated_text;
          // Some router responses return text directly
          if(typeof parsed === 'object') return JSON.stringify(parsed);
        }catch(e){
          // not JSON — return raw body
          return out.body;
        }
      }
    }catch(e){
      log(`Hugging Face call to ${host} failed:`, e.message || e);
      // try next host
    }
  }
  // all hosts failed
  throw new Error('All Hugging Face endpoints failed');
}

function buildPrompt(issueTitle, issueBody, filesMap){
  // Produce a strict JSON-only response: { "files": { "path1": "...contents...", ... } }
  let prompt = `You are an Angular expert. You will produce fixes for a Git repository. Respond with JSON only and no commentary.\
`;
  prompt += `Requirements:\n`;
  prompt += `- Only return a JSON object with a single key \"files\" mapping relative file paths to full file contents.\n`;
  prompt += `- Do not create new files unless absolutely necessary; prefer editing existing files.\n`;
  prompt += `- Limit modified files to ${MAX_FILES} files.\n`;
  prompt += `- Preserve formatting and imports. Maintain TypeScript types and Angular syntax (decorators, DI, lifecycle hooks).\n`;
  prompt += `- Avoid breaking changes; do not change public APIs without minimal, safe updates.\n`;
  prompt += `- If you cannot safely fix, return {\"files\":{}}.\n\n`;
  prompt += `Issue title:\n${issueTitle}\n\nIssue body:\n${issueBody}\n\n`;
  prompt += `Repository files to consider (each follows with a marker):\n`;
  for(const [p, content] of Object.entries(filesMap)){
    prompt += `---FILE:${p}---\n`;
    prompt += content + '\n';
    prompt += `---ENDFILE:${p}---\n`;
  }
  prompt += `\nReturn exactly: {\"files\": { "relative/path": "<new file contents>" } } with escaped newlines. Do not include any extra fields.\n`;
  return prompt;
}

function safeWriteFiles(filesObj){ const written = []; for(const [rel, content] of Object.entries(filesObj)){ const target = path.join(process.cwd(), rel); if(!fs.existsSync(path.dirname(target))){ log('Skipping path outside repo:', rel); continue; } written.push(rel); fs.writeFileSync(target, content, 'utf8'); }
  return written;
}

function gitCommand(cmd){ return execSync(cmd, { encoding: 'utf8' }).trim(); }

async function prepare(){
  const ev = getEvent(); if(!ev) throw new Error('No event payload');
  const issue = extractIssueData(ev); if(!issue) throw new Error('No issue data');
  log('Issue:', issue.number, issue.title);

  // Optionally skip unless label ai-fix exists
  const requireLabel = process.env.REQUIRE_AI_FIX_LABEL || 'false';
  if(requireLabel === 'true' && !(issue.labels||[]).includes('ai-fix')){ log('Label ai-fix not present; skipping.'); return; }

  // Detect candidate files
  let mentions = findMentionedFiles(issue.title + '\n' + issue.body);
  // If user mentioned a bare filename (no path) try to resolve it to repo files
  const resolvedMentions = [];
  for(const m of mentions){ const candidatePath = path.join(process.cwd(), m); if(fs.existsSync(candidatePath)){ resolvedMentions.push(m); } else { const basenames = findFilesByBasename(path.basename(m)); if(basenames.length) resolvedMentions.push(...basenames); else resolvedMentions.push(m); } }
  mentions = Array.from(new Set(resolvedMentions));
  const kws = keywordsFromText(issue.title + ' ' + issue.body);
  let candidates = [];
  if(mentions.length) candidates.push(...mentions);
  candidates.push(...findFilesByKeywords(kws));
  candidates = Array.from(new Set(candidates)).slice(0, MAX_FILES);

  if(candidates.length === 0){ log('No relevant files detected. Exiting.'); writeJsonSafe(path.join(AI_TEMP_DIR,'prepare.json'), { issue: issue, files: [], message: 'no-files' }); return; }

  // Read file contents
  const filesMap = {};
  for(const f of candidates){ try{ filesMap[f] = fs.readFileSync(path.join(process.cwd(), f), 'utf8'); } catch(e){ log('Failed to read', f); }
  }

  // Build prompt
  const prompt = buildPrompt(issue.title, issue.body, filesMap);

  // Call AI
  log('Calling AI for', Object.keys(filesMap).length, 'files');
  let aiResp;
  try{ aiResp = await callHuggingFace(prompt); }catch(e){ log('AI call failed:', e.message);
    // Save raw error to aid debugging
    fs.mkdirSync(AI_TEMP_DIR, { recursive: true });
    fs.writeFileSync(path.join(AI_TEMP_DIR,'ai-error.txt'), String(e && e.message ? e.message : e), 'utf8');
    // If HF router notice, hint to user
    if(String(e.message || '').includes('router.huggingface.co')){
      log('Hugging Face inference endpoint changed. Update script to use router.huggingface.co or update API usage. See .ai-fix/ai-error.txt');
    }
    // Attempt a safe deterministic fallback: simple find-and-replace based on issue text
    const replaceRegex = /should be\s+"([^"]+)"\s+instead of\s+"([^"]+)"/i;
    const m = (issue.body || issue.title || '').match(replaceRegex);
    if(m){
      const newText = m[1];
      const oldText = m[2];
      log('Attempting deterministic replacement:', JSON.stringify({ oldText, newText }));
      const replacements = {};
      for(const [rel, content] of Object.entries(filesMap)){
        if(content && content.includes(oldText)){
          replacements[rel] = content.split(oldText).join(newText);
        }
      }
      if(Object.keys(replacements).length){
        const written = safeWriteFiles(replacements);
        writeJsonSafe(path.join(AI_TEMP_DIR,'prepare.json'), { issue: issue, candidates: candidates, written: written, fallback: 'deterministic-replace', replaced: Object.keys(replacements) });
        log('Deterministic replacements written for files:', Object.keys(replacements));
        // continue — prepare considered complete
        return;
      } else {
        log('Deterministic replacement did not find occurrences of the old text in candidate files.');
      }
    }
    writeJsonSafe(path.join(AI_TEMP_DIR,'prepare.json'), { issue: issue, files: candidates, error: e.message, ai_error_path: AI_TEMP_DIR + '/ai-error.txt' });
    return;
  }

  // Expect JSON response
  let parsed = null;
  try{ parsed = JSON.parse(aiResp); }catch(e){ // sometimes returned text contains JSON inside
    const m = aiResp.match(/\{[\s\S]*\}/); if(m) try{ parsed = JSON.parse(m[0]); }catch(e2){ parsed = null; }
  }

  if(!parsed || typeof parsed.files !== 'object'){
    log('AI did not return valid files JSON. Attempting to extract files from response.');
    fs.mkdirSync(AI_TEMP_DIR, { recursive: true });
    fs.writeFileSync(path.join(AI_TEMP_DIR,'ai-response.txt'), aiResp, 'utf8');

    // Try to extract JSON inside triple-backticks ```json ... ```
    let extractedFiles = null;
    const codeBlockJson = aiResp.match(/```json\s*([\s\S]*?)```/i);
    if(codeBlockJson){
      try{
        const j = JSON.parse(codeBlockJson[1]);
        if(j && typeof j.files === 'object') extractedFiles = j.files;
      }catch(e){ /* ignore */ }
    }

    // If not found, try to extract using ---FILE:filename--- markers
    if(!extractedFiles){
      const fileMarkerRegex = /---FILE:([^\n]+)---\n([\s\S]*?)---ENDFILE:[^\n]+---/g;
      const filesObj = {};
      let fm;
      while((fm = fileMarkerRegex.exec(aiResp)) !== null){
        const p = fm[1].trim();
        const c = fm[2];
        filesObj[p] = c.replace(/\r\n/g,'\n');
      }
      if(Object.keys(filesObj).length) extractedFiles = filesObj;
    }

    if(extractedFiles && typeof extractedFiles === 'object'){
      // enforce safety limit
      const respFiles = Object.keys(extractedFiles).slice(0, MAX_FILES);
      const allowed = respFiles.reduce((acc,p)=>{ acc[p]=extractedFiles[p]; return acc; }, {});
      const written = safeWriteFiles(allowed);
      writeJsonSafe(path.join(AI_TEMP_DIR,'prepare.json'), { issue: issue, candidates: candidates, written: written, ai_response_path: AI_TEMP_DIR + '/ai-response.txt', extracted_from_ai: true, extracted_files: Object.keys(allowed) });
      log('Extracted and wrote files from AI response:', Object.keys(allowed));
      return;
    }

    // fallback: save response and exit prepare
    writeJsonSafe(path.join(AI_TEMP_DIR,'prepare.json'), { issue: issue, files: candidates, ai_response_path: AI_TEMP_DIR + '/ai-response.txt' });
    return;
  }

  // Enforce safety: do not modify more than MAX_FILES
  const respFiles = Object.keys(parsed.files || {});
  if(respFiles.length > MAX_FILES){ log('AI attempted to modify too many files; limiting to first', MAX_FILES); }

  const allowed = respFiles.slice(0, MAX_FILES).reduce((acc, p) => { acc[p] = parsed.files[p]; return acc; }, {});

  // Write files (prepare phase: write but do not commit)
  const written = safeWriteFiles(allowed);

  // Record prepare metadata
  writeJsonSafe(path.join(AI_TEMP_DIR,'prepare.json'), { issue: issue, candidates: candidates, written: written, ai_response_summary: Object.keys(allowed) });
  log('Prepare complete. Modified files:', written);
}

function finalize(){
  const prep = readJsonSafe(path.join(AI_TEMP_DIR,'prepare.json'));
  if(!prep){ log('No prepare.json found; run --prepare first'); return; }
  if(!prep.written || prep.written.length === 0){
    // No files were prepared by AI — create a safe diagnostic file so a PR is created for human review.
    const issue = prep.issue || {};
    const issueNumber = issue.number || 'unknown';
    const diagRel = path.join(AI_TEMP_DIR, `diagnostic-issue-${issueNumber}.md`);
    const diagAbs = path.join(process.cwd(), diagRel);
    const aiRespPath = path.join(AI_TEMP_DIR, 'ai-response.txt');
    const aiErrPath = path.join(AI_TEMP_DIR, 'ai-error.txt');
    const diagContent = `# AI Diagnostic for issue #${issueNumber}\n\n` +
      `**Issue:** ${issue.title || ''}\n\n` +
      `**Body:**\n${issue.body || ''}\n\n` +
      `---\n` +
      `AI response saved at: ${aiRespPath}\n` +
      `AI error saved at: ${aiErrPath}\n` +
      `Candidate files considered:\n${(prep.candidates||[]).join('\n')}\n`;
    try{ fs.mkdirSync(path.dirname(diagAbs), { recursive: true }); fs.writeFileSync(diagAbs, diagContent, 'utf8'); }catch(e){ log('Failed to write diagnostic file:', e.message); }
    // ensure the diagnostic file is treated as a prepared file so the existing commit/push/PR flow works
    prep.written = [diagRel];
    writeJsonSafe(path.join(AI_TEMP_DIR,'prepare.json'), prep);
    log('Created diagnostic file:', diagRel);
  }
  const issue = prep.issue || {}; const issueNumber = issue.number || 'unknown';

  // Create branch
  const branch = `ai-fix/issue-${issueNumber}-${Date.now().toString(36).slice(-6)}`.replace(/[\s]/g,'-');
  log('Creating branch', branch);
  gitCommand(`git checkout -b ${branch}`);

  // Ensure git has a committer identity in CI
  try{
    const actor = process.env.GITHUB_ACTOR || 'github-actions[bot]';
    gitCommand(`git config user.email "${actor}@users.noreply.github.com"`);
    gitCommand(`git config user.name "${actor}"`);
  }catch(e){ log('Warning: could not set git user identity:', e.message); }

  // Add files
  for(const f of prep.written){ gitCommand(`git add "${f}"`); }
  gitCommand(`git commit -m "AI: Proposed fix for issue #${issueNumber}"`);

  // Push branch
  try{
    gitCommand(`git push --set-upstream origin ${branch}`);
  }catch(e){ log('git push failed:', e.message); throw e; }

  // Create PR via REST using GITHUB_TOKEN
  const token = process.env.GITHUB_TOKEN; if(!token){ log('GITHUB_TOKEN not available; cannot create PR'); return; }
  const repo = process.env.GITHUB_REPOSITORY || (()=>{ try{ const rem = gitCommand('git remote get-url origin'); const m = rem.match(/[:/]([^/]+\/[^/]+)(?:\.git)?$/); return m ? m[1] : null; }catch(e){ return null; } })();
  if(!repo){ log('Could not determine repository; set GITHUB_REPOSITORY env var.'); return; }

  const [owner, repoName] = repo.split('/');
  const baseBranch = process.env.BASE_BRANCH || 'master';
  const postData = JSON.stringify({ title: `AI proposed fix for issue #${issueNumber}: ${issue.title}`, head: branch, base: baseBranch, body: `Automated fix suggested by AI for issue #${issueNumber}. Please review. Do not merge automatically.` });

  const options = {
    hostname: 'api.github.com', path: `/repos/${owner}/${repoName}/pulls`, method: 'POST',
    headers: { 'User-Agent': 'ai-fix-script', 'Authorization': `token ${token}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
  };
  const req = https.request(options, res => { let body=''; res.on('data', d=> body+=d); res.on('end', ()=>{ try{ const parsed = JSON.parse(body); if(parsed.html_url){ log('Pull Request created:', parsed.html_url); // optionally comment on the issue
        commentOnIssue(owner, repoName, issueNumber, `AI prepared a PR: ${parsed.html_url}`); } else log('PR creation response:', parsed); }catch(e){ log('PR creation parse error:', e.message); } }); });
  req.on('error', e => log('PR request failed:', e.message)); req.write(postData); req.end();
}

function commentOnIssue(owner, repo, issueNumber, message){ const token = process.env.GITHUB_TOKEN; if(!token) return; const post = JSON.stringify({ body: message });
  const options = { hostname: 'api.github.com', path: `/repos/${owner}/${repo}/issues/${issueNumber}/comments`, method: 'POST', headers: { 'User-Agent':'ai-fix-script', 'Authorization': `token ${token}`, 'Content-Type':'application/json', 'Content-Length': Buffer.byteLength(post) } };
  const req = https.request(options, res => { let body=''; res.on('data', d=> body+=d); res.on('end', ()=>{ log('Comment response status', res.statusCode); }); });
  req.on('error', e=> log('Comment failed', e.message)); req.write(post); req.end();
}

// CLI
const args = process.argv.slice(2);
if(args.includes('--prepare')){
  prepare().catch(e=>{ log('Prepare error:', e.message); process.exit(1); });
} else if(args.includes('--finalize')){
  try{ finalize(); }catch(e){ log('Finalize error', e.message); process.exit(1); }
} else {
  console.log('Usage: node ai-fix-angular.js --prepare|--finalize');
}
