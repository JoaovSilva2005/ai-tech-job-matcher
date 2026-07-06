import { VALID_ROLES, VALID_SOURCES } from '../cli/cliTypes';
import { SUPPORTED_RESUME_EXTENSIONS } from '../resume/parseResume';

/** Returns the full single-page HTML for the web UI (no build step needed). */
export function indexHtml(): string {
  const roleOptions = VALID_ROLES.map(
    (r) => `<option value="${r}"${r === 'all' ? ' selected' : ''}>${r}</option>`
  ).join('');
  const sourceOptions = VALID_SOURCES.map(
    (s) => `<option value="${s}"${s === 'themuse' ? ' selected' : ''}>${s}</option>`
  ).join('');
  const supportedResumeExtensions = SUPPORTED_RESUME_EXTENSIONS.join(',');
  const supportedResumeLabel = SUPPORTED_RESUME_EXTENSIONS.join(', ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>AI Tech Job Matcher</title>
<style>
  :root {
    --bg: #0f1621; --panel: #16202e; --panel2: #1d2a3a; --border: #26374d;
    --text: #e7edf5; --muted: #9fb0c3; --accent: #4f9cf9; --accent2: #2ecc9b;
    --green: #2ecc9b; --yellow: #f2c94c; --orange: #f2994a; --red: #eb5757;
  }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Segoe UI', system-ui, sans-serif; background: var(--bg); color: var(--text); }
  .wrap { max-width: 1080px; margin: 0 auto; padding: 32px 20px 64px; }
  header h1 { font-size: 26px; margin: 0 0 4px; }
  header p { color: var(--muted); margin: 0 0 24px; }
  .badge { display: inline-block; background: var(--panel2); border: 1px solid var(--border); color: var(--accent2);
    font-size: 12px; padding: 2px 10px; border-radius: 20px; margin-left: 8px; vertical-align: middle; }
  .card { background: var(--panel); border: 1px solid var(--border); border-radius: 14px; padding: 22px; margin-bottom: 20px; }
  form { display: grid; grid-template-columns: 1fr 160px 160px 120px; gap: 14px; align-items: end; }
  label { display: block; font-size: 13px; color: var(--muted); margin-bottom: 6px; }
  input[type=file], select, input[type=number] { width: 100%; background: var(--panel2); border: 1px solid var(--border);
    color: var(--text); padding: 10px; border-radius: 9px; font-size: 14px; }
  .actions { grid-column: 1 / -1; display: flex; gap: 12px; align-items: center; margin-top: 6px; }
  button { background: var(--accent); color: #06121f; border: none; padding: 11px 22px; border-radius: 9px;
    font-size: 15px; font-weight: 600; cursor: pointer; }
  button:disabled { opacity: .55; cursor: not-allowed; }
  button.ghost { background: transparent; color: var(--text); border: 1px solid var(--border); font-weight: 500; }
  .hint { color: var(--muted); font-size: 13px; }
  .stats { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 18px; }
  .stat { background: var(--panel2); border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; min-width: 120px; }
  .stat b { display: block; font-size: 20px; }
  .stat span { color: var(--muted); font-size: 12px; }
  .resultsPanel { margin-top: 6px; }
  .resultsActions { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
  .jobsList { display: grid; gap: 12px; }
  .jobCard { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 16px; }
  .jobTop { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 14px; align-items: start; }
  .jobTitle { margin: 0 0 4px; font-size: 17px; line-height: 1.25; }
  .jobMeta { color: var(--muted); font-size: 12px; line-height: 1.5; }
  .jobBadges { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; justify-content: flex-end; }
  .jobBody { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 14px; }
  .skillBlock { background: rgba(255,255,255,.025); border: 1px solid rgba(255,255,255,.04); border-radius: 8px; padding: 10px; min-width: 0; }
  .skillBlock b { display: block; margin-bottom: 6px; color: var(--text); font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
  .explanation { margin-top: 12px; color: var(--muted); font-size: 12.5px; line-height: 1.45; }
  .jobFooter { display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-top: 14px; flex-wrap: wrap; }
  .sourcePill { color: var(--muted); border: 1px solid var(--border); border-radius: 999px; padding: 4px 9px; font-size: 12px; }
  .applyBtn { display: inline-block; background: var(--accent2); color: #06121f; text-decoration: none; padding: 9px 14px; border-radius: 8px; font-weight: 700; font-size: 13px; }
  .rec { font-size: 12px; font-weight: 600; padding: 3px 9px; border-radius: 14px; white-space: nowrap; }
  .rec.strong_apply { background: rgba(46,204,155,.16); color: var(--green); }
  .rec.apply { background: rgba(46,204,155,.10); color: var(--green); }
  .rec.study_before_applying { background: rgba(242,201,76,.16); color: var(--yellow); }
  .rec.low_priority { background: rgba(242,153,74,.16); color: var(--orange); }
  .rec.not_recommended { background: rgba(235,87,87,.16); color: var(--red); }
  .score { font-weight: 700; font-size: 16px; }
  .skills { color: var(--muted); font-size: 12px; }
  .skills .miss { color: var(--orange); }
  .muted { color: var(--muted); }
  .spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid var(--border);
    border-top-color: var(--accent); border-radius: 50%; animation: spin .8s linear infinite; vertical-align: middle; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .err { color: var(--red); }
  @media (max-width: 900px) { form { grid-template-columns: 1fr 1fr; } .jobBody { grid-template-columns: 1fr; } }
  @media (max-width: 640px) { .jobTop { grid-template-columns: 1fr; } .jobBadges { justify-content: flex-start; } }
  @media (max-width: 520px) { form { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>AI Tech Job Matcher <span class="badge" id="engineBadge">local fallback</span></h1>
    <p>Upload your resume, pick a tech area, and get a ranked list of matching public jobs.</p>
  </header>

  <div class="card">
    <form id="form">
      <div>
        <label for="resume">Resume file (${supportedResumeLabel})</label>
        <input type="file" id="resume" name="resume" accept="${supportedResumeExtensions}" required />
      </div>
      <div>
        <label for="role">Target role</label>
        <select id="role" name="role">${roleOptions}</select>
      </div>
      <div>
        <label for="source">Job source</label>
        <select id="source" name="source">${sourceOptions}</select>
      </div>
      <div>
        <label for="limit">Limit</label>
        <input type="number" id="limit" name="limit" value="16" min="1" max="50" />
      </div>
      <div class="actions">
        <button type="submit" id="submitBtn">Analyze jobs</button>
        <span class="hint">Uses real public job sources. Your resume is deleted from disk right after analysis.</span>
      </div>
    </form>
  </div>

  <div id="status"></div>
  <div id="results"></div>
</div>

<script>
const form = document.getElementById('form');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');
const submitBtn = document.getElementById('submitBtn');

const RECS = {
  strong_apply: 'Strong Apply', apply: 'Apply', study_before_applying: 'Study Before Applying',
  low_priority: 'Low Priority', not_recommended: 'Not Recommended'
};

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  submitBtn.disabled = true;
  resultsEl.innerHTML = '';
  statusEl.innerHTML = '<div class="card"><span class="spinner"></span> &nbsp;Scraping jobs and scoring matches…</div>';

  try {
    const res = await fetch('/api/analyze', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Analysis failed');
    render(data);
    statusEl.innerHTML = '';
  } catch (err) {
    statusEl.innerHTML = '<div class="card err">Error: ' + err.message + '</div>';
  } finally {
    submitBtn.disabled = false;
  }
});

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function list(arr, cls) { if (!arr || !arr.length) return '<span class="muted">—</span>';
  return arr.slice(0, 6).map(s => '<span class="' + (cls||'') + '">' + esc(s) + '</span>').join(', '); }
function valueOrDash(value) { return value ? esc(value) : '<span class="muted">-</span>'; }
function applyLink(url) {
  if (!url) return '';
  return '<a class="applyBtn" href="' + esc(url) + '" target="_blank" rel="noopener">Apply to job</a>';
}
function sourcePill(job) {
  const source = job.source || 'source';
  const workMode = job.workMode && job.workMode !== 'unknown' ? ' - ' + job.workMode : '';
  return '<span class="sourcePill">' + esc(source + workMode) + '</span>';
}
function renderJobCard(job, index) {
  const rec = job.recommendation;
  const rank = index + 1;
  return '<article class="jobCard">' +
    '<div class="jobTop">' +
      '<div>' +
        '<h3 class="jobTitle">#' + rank + ' ' + esc(job.title) + '</h3>' +
        '<div class="jobMeta">' + esc(job.company) + ' - ' + valueOrDash(job.location) + '</div>' +
      '</div>' +
      '<div class="jobBadges">' +
        '<span class="score">' + esc(job.score) + '</span>' +
        '<span class="rec ' + rec + '">' + (RECS[rec]||rec) + '</span>' +
      '</div>' +
    '</div>' +
    '<div class="jobBody">' +
      '<div class="skillBlock"><b>Matched skills</b><div class="skills">' + list(job.matchedSkills) + '</div></div>' +
      '<div class="skillBlock"><b>Missing skills</b><div class="skills miss">' + list(job.missingSkills, 'miss') + '</div></div>' +
    '</div>' +
    '<div class="explanation">' + esc(job.explanation) + '</div>' +
    '<div class="jobFooter">' + sourcePill(job) + applyLink(job.url) + '</div>' +
  '</article>';
}

function render(data) {
  const s = data.summary, r = data.resumeAnalysis, m = data.matches || [];
  document.getElementById('engineBadge').textContent = s.usedFallback ? 'local fallback' : ('AI: ' + s.aiProvider);

  const stats = [
    ['Jobs collected', s.jobsCollected], ['After role filter', s.jobsAfterRoleFilter],
    ['Duplicates removed', s.duplicatesRemoved], ['Detected seniority', r.detectedSeniority],
    ['Top matches', m.length]
  ].map(([k,v]) => '<div class="stat"><b>' + esc(v) + '</b><span>' + esc(k) + '</span></div>').join('');

  const jobCards = m.map(renderJobCard).join('');

  resultsEl.innerHTML =
    '<section class="resultsPanel">' +
      '<div class="stats">' + stats + '</div>' +
      '<div class="resultsActions">' +
        '<a href="' + data.downloadUrl + '"><button type="button">Download Excel report</button></a> ' +
        '<a href="' + data.markdownUrl + '"><button type="button" class="ghost">Download Markdown summary</button></a>' +
      '</div>' +
      (m.length
        ? '<div class="jobsList">' + jobCards + '</div>'
        : '<p class="muted">No jobs matched this role in the selected source. Try <code>role: all</code> or another real source.</p>') +
    '</section>';
}
</script>
</body>
</html>`;
}
