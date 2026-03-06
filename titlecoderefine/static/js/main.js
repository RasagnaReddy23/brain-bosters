/* ============================================================
   TitleCodeRefine — Main JavaScript
   ============================================================ */

// ─── STATE ────────────────────────────────────────────────
const state = {
  totalBugs: 0,
  filesAnalyzed: 0,
  scoreTotal: 0,
  currentIssueTab: 'bugs',
  lastResult: null,
};

// ─── SAMPLE CODE ──────────────────────────────────────────
const sampleCodes = {
  python: `import sqlite3
import hashlib

def get_user(username, password):
    conn = sqlite3.connect("users.db")
    query = f"SELECT * FROM users WHERE username='{username}' AND password='{password}'"
    cursor = conn.execute(query)
    result = cursor.fetchall()
    return result

def process_data(items):
    result = []
    for i in range(len(items)):
        for j in range(len(items)):
            if items[i] == items[j] and i != j:
                result.append(items[i])
    return result

def save_password(pwd):
    return hashlib.md5(pwd.encode()).hexdigest()

passwords = []
for i in range(1000000):
    passwords.append(save_password(str(i)))

data = [1, 2, 3, 2, 1, 4]
print(process_data(data))`,

  javascript: `var userData = null;

function fetchUser(id) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', '/api/users/' + id, false);
  xhr.send();
  userData = JSON.parse(xhr.responseText);
  return userData;
}

function renderUser(user) {
  document.getElementById('user').innerHTML = 
    '<h1>' + user.name + '</h1><p>' + user.bio + '</p>';
}

function processUsers(users) {
  var result = [];
  for (var i = 0; i < users.length; i++) {
    for (var j = 0; j < users.length; j++) {
      if (users[i].id === users[j].id && i !== j) {
        result.push(users[i]);
      }
    }
  }
  return result;
}

var user = fetchUser(localStorage.getItem('userId'));
renderUser(user);`,

  java: `import java.sql.*;
import java.util.*;

public class UserManager {
    static Connection conn;
    
    public static List<String> getUsers(String dept) {
        List<String> users = new ArrayList();
        try {
            String query = "SELECT * FROM users WHERE dept='" + dept + "'";
            Statement stmt = conn.createStatement();
            ResultSet rs = stmt.executeQuery(query);
            while (rs.next()) {
                users.add(rs.getString("name"));
            }
        } catch(Exception e) {}
        return users;
    }
    
    public static String[] processArray(String[] arr) {
        for (int i = 0; i < arr.length; i++) {
            for (int j = 0; j < arr.length; j++) {
                if (arr[i].equals(arr[j])) {
                    String temp = arr[i];
                    arr[i] = arr[j];
                    arr[j] = temp;
                }
            }
        }
        return arr;
    }
}`,
};

// ─── DOM REFS ──────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const codeInput = $('codeInput');
const languageSelect = $('languageSelect');
const analyzeBtn = $('analyzeBtn');
const clearBtn = $('clearBtn');
const sampleBtn = $('sampleBtn');
const lineNumbers = $('lineNumbers');
const charCount = $('charCount');
const emptyState = $('emptyState');
const loadingState = $('loadingState');
const resultsContent = $('resultsContent');

// ─── LINE NUMBERS ──────────────────────────────────────────
function updateLineNumbers() {
  const lines = codeInput.value.split('\n');
  lineNumbers.textContent = lines.map((_, i) => i + 1).join('\n');
  const len = codeInput.value.length;
  charCount.textContent = `${len.toLocaleString()} chars · ${lines.length} lines`;
}

codeInput.addEventListener('input', updateLineNumbers);
codeInput.addEventListener('scroll', () => {
  lineNumbers.scrollTop = codeInput.scrollTop;
});
codeInput.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = codeInput.selectionStart;
    const end = codeInput.selectionEnd;
    codeInput.value = codeInput.value.substring(0, start) + '  ' + codeInput.value.substring(end);
    codeInput.selectionStart = codeInput.selectionEnd = start + 2;
    updateLineNumbers();
  }
});
updateLineNumbers();

// ─── TABS ─────────────────────────────────────────────────
document.querySelectorAll('.nav-pill').forEach((pill) => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.nav-pill').forEach((p) => p.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    pill.classList.add('active');
    $(`tab-${pill.dataset.tab}`).classList.add('active');
  });
});

// ─── ANALYSIS TYPE CHIPS ───────────────────────────────────
document.querySelectorAll('.type-chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.type-chip').forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
  });
});

// ─── SAMPLE CODE ──────────────────────────────────────────
clearBtn.addEventListener('click', () => {
  codeInput.value = '';
  updateLineNumbers();
});

sampleBtn.addEventListener('click', () => {
  const lang = languageSelect.value;
  const code = sampleCodes[lang] || sampleCodes.python;
  codeInput.value = code;
  updateLineNumbers();
  showToast('Sample code loaded', 'success');
});

// ─── ISSUE TABS ────────────────────────────────────────────
document.querySelectorAll('.issue-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.issue-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    state.currentIssueTab = tab.dataset.issue;
    if (state.lastResult) renderIssues(state.lastResult, state.currentIssueTab);
  });
});

// ─── ANALYZE ──────────────────────────────────────────────
analyzeBtn.addEventListener('click', async () => {
  const code = codeInput.value.trim();
  if (!code) { showToast('Please paste some code first', 'error'); return; }

  const language = languageSelect.value;
  const analysisType = document.querySelector('input[name="analysisType"]:checked').value;

  showLoading(true);
  animateLoadingSteps();

  try {
    const res = await fetch('/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language, analysis_type: analysisType }),
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Analysis failed');
    }

    showLoading(false);
    renderResults(data.result);
    updateStats(data.result);
    showToast('Analysis complete', 'success');
  } catch (err) {
    showLoading(false);
    showEmpty();
    showToast(err.message || 'Analysis failed', 'error');
  }
});

// ─── LOADING ──────────────────────────────────────────────
function showLoading(show) {
  if (show) {
    emptyState.classList.add('hidden');
    loadingState.classList.remove('hidden');
    resultsContent.classList.add('hidden');
    analyzeBtn.disabled = true;
    analyzeBtn.querySelector('.btn-text').textContent = 'Analyzing...';
  } else {
    loadingState.classList.add('hidden');
    analyzeBtn.disabled = false;
    analyzeBtn.querySelector('.btn-text').textContent = 'Analyze Code';
  }
}
function showEmpty() {
  emptyState.classList.remove('hidden');
  loadingState.classList.add('hidden');
  resultsContent.classList.add('hidden');
}

let stepTimer = null;
function animateLoadingSteps() {
  const steps = document.querySelectorAll('.loading-step');
  let i = 0;
  steps.forEach((s) => { s.classList.remove('active', 'done'); });
  steps[0].classList.add('active');
  stepTimer = setInterval(() => {
    if (i < steps.length - 1) {
      steps[i].classList.remove('active');
      steps[i].classList.add('done');
      i++;
      steps[i].classList.add('active');
    } else {
      clearInterval(stepTimer);
    }
  }, 800);
}

// ─── RENDER RESULTS ────────────────────────────────────────
function renderResults(result) {
  state.lastResult = result;

  // Summary
  $('summaryBar').textContent = result.summary || '';

  // Score
  const score = result.score || 0;
  $('scoreBig').textContent = score;
  $('scoreValue').textContent = `${score}/100`;
  $('scoreDisplay').classList.remove('hidden');

  // Animate arc: arc path length ≈ 157
  const offset = 157 - (score / 100) * 157;
  setTimeout(() => {
    $('scoreArc').style.strokeDashoffset = offset;
    $('scoreArc').style.stroke = score >= 80 ? '#6ab187' : score >= 60 ? '#d4a84b' : '#d4615a';
  }, 100);

  // Score breakdown
  const bugs = result.bugs?.length || 0;
  const perf = result.performance?.length || 0;
  const sec = result.security?.length || 0;
  const bp = result.best_practices?.length || 0;

  $('scoreBreakdown').innerHTML = [
    { label: 'Bug Score', val: Math.max(0, 100 - bugs * 15), color: '#6ab187' },
    { label: 'Performance', val: Math.max(0, 100 - perf * 12), color: '#d4a84b' },
    { label: 'Security', val: Math.max(0, 100 - sec * 20), color: '#6a9fd4' },
    { label: 'Best Practices', val: Math.max(0, 100 - bp * 8), color: '#9a7fd4' },
  ]
    .map(
      (item) => `
    <div class="score-item">
      <span class="score-item-label">${item.label}</span>
      <div class="score-bar-wrap">
        <div class="score-bar" style="width:${item.val}%;background:${item.color}"></div>
      </div>
    </div>`
    )
    .join('');

  // Issue counts
  $('bugCount').textContent = bugs;
  $('perfCount').textContent = perf;
  $('secCount').textContent = sec;
  $('bpCount').textContent = bp;

  // Render default tab
  renderIssues(result, state.currentIssueTab);

  // Optimized code
  if (result.optimized_code) {
    $('optimizedCode').textContent = result.optimized_code;
    $('improvementsList').innerHTML = (result.improvements_summary || [])
      .map((i) => `<span class="improvement-tag">✓ ${escHtml(i)}</span>`)
      .join('');
    $('optimizedSection').style.display = '';
  }

  resultsContent.classList.remove('hidden');
}

function renderIssues(result, type) {
  const container = $('issuesContent');
  let items = [];
  let html = '';

  if (type === 'bugs') items = result.bugs || [];
  else if (type === 'performance') items = result.performance || [];
  else if (type === 'security') items = result.security || [];
  else if (type === 'practices') items = result.best_practices || [];

  if (!items.length) {
    container.innerHTML = `<div class="no-issues">✓ No ${type === 'practices' ? 'best practice violations' : type + ' issues'} detected</div>`;
    return;
  }

  if (type === 'bugs' || type === 'security') {
    html = items
      .map((bug) => {
        const sev = (bug.severity || 'medium').toLowerCase();
        return `<div class="issue-card ${sev}">
          <div class="issue-header">
            <span class="issue-badge badge-${sev}">${sev}</span>
            ${bug.line ? `<span class="issue-line">Line ${bug.line}</span>` : ''}
          </div>
          <div class="issue-desc">${escHtml(bug.description)}</div>
          <div class="issue-fix"><span class="fix-label">FIX</span>${escHtml(bug.fix || '')}</div>
        </div>`;
      })
      .join('');
  } else if (type === 'performance') {
    html = items
      .map((p) => {
        const imp = (p.impact || 'medium').toLowerCase();
        return `<div class="issue-card ${imp}">
          <div class="issue-header">
            <span class="issue-badge badge-perf-${imp}">${imp} impact</span>
            ${p.line ? `<span class="issue-line">Line ${p.line}</span>` : ''}
          </div>
          <div class="issue-desc">${escHtml(p.description)}</div>
          <div class="issue-fix"><span class="fix-label">OPT</span>${escHtml(p.suggestion || '')}</div>
        </div>`;
      })
      .join('');
  } else if (type === 'practices') {
    html = items
      .map((bp) => {
        return `<div class="issue-card medium">
          <div class="issue-desc">${escHtml(bp.description)}</div>
          <div class="issue-fix"><span class="fix-label">→</span>${escHtml(bp.suggestion || '')}</div>
        </div>`;
      })
      .join('');
  }

  container.innerHTML = html;
}

// ─── COPY OPTIMIZED ────────────────────────────────────────
$('copyOptimized').addEventListener('click', () => {
  const code = $('optimizedCode').textContent;
  navigator.clipboard.writeText(code).then(() => showToast('Code copied!', 'success'));
});

$('diffView').addEventListener('click', () => {
  showToast('Diff view coming soon', 'success');
});

// ─── STATS ────────────────────────────────────────────────
function updateStats(result) {
  state.filesAnalyzed++;
  state.totalBugs += (result.bugs?.length || 0) + (result.security?.length || 0);
  state.scoreTotal += result.score || 0;

  animateNumber($('statBugs'), state.totalBugs);
  animateNumber($('statFiles'), state.filesAnalyzed);
  $('statScore').textContent = Math.round(state.scoreTotal / state.filesAnalyzed);
}

function animateNumber(el, target) {
  const start = parseInt(el.textContent) || 0;
  const duration = 600;
  const startTime = performance.now();
  const step = (now) => {
    const progress = Math.min((now - startTime) / duration, 1);
    el.textContent = Math.round(start + (target - start) * progress);
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ─── REWRITE TAB ──────────────────────────────────────────
$('rewriteBtn').addEventListener('click', async () => {
  const code = $('rewriteInput').value.trim();
  if (!code) { showToast('Please paste code to rewrite', 'error'); return; }

  const language = $('rewriteLangSelect').value;
  const instructions = $('rewriteInstructions').value;

  $('rewriteEmpty').classList.add('hidden');
  $('rewriteLoading').classList.remove('hidden');
  $('rewriteResult').classList.add('hidden');
  $('rewriteBtn').disabled = true;

  try {
    const res = await fetch('/rewrite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language, instructions }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Rewrite failed');

    $('rewriteLoading').classList.add('hidden');
    $('rewriteResult').classList.remove('hidden');
    $('rewrittenCode').textContent = data.result.rewritten_code || '';
    $('changesList').innerHTML = (data.result.changes || [])
      .map((c) => `<span class="change-tag">⟳ ${escHtml(c)}</span>`)
      .join('');
    $('copyRewritten').style.display = 'inline-flex';
    showToast('Code rewritten!', 'success');
  } catch (err) {
    $('rewriteLoading').classList.add('hidden');
    $('rewriteEmpty').classList.remove('hidden');
    showToast(err.message, 'error');
  } finally {
    $('rewriteBtn').disabled = false;
  }
});

$('copyRewritten').addEventListener('click', () => {
  navigator.clipboard.writeText($('rewrittenCode').textContent).then(() =>
    showToast('Code copied!', 'success')
  );
});

// ─── EXPLAIN TAB ──────────────────────────────────────────
$('explainBtn').addEventListener('click', async () => {
  const code = $('explainInput').value.trim();
  if (!code) { showToast('Please paste code to explain', 'error'); return; }

  const language = $('explainLangSelect').value;

  $('explainEmpty').classList.add('hidden');
  $('explainLoading').classList.remove('hidden');
  $('explainResult').classList.add('hidden');
  $('explainBtn').disabled = true;

  try {
    const res = await fetch('/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Explanation failed');

    const r = data.result;
    const el = $('explainResult');

    el.innerHTML = `
      <div class="explain-overview">${escHtml(r.overview || '')}</div>
      ${r.breakdown?.length ? `
        <div class="explain-section">
          <div class="explain-section-title">Code Breakdown</div>
          ${r.breakdown.map(b => `
            <div class="breakdown-item">
              <span class="breakdown-section-name">${escHtml(b.section || '')}</span>
              <span class="breakdown-explanation">${escHtml(b.explanation || '')}</span>
            </div>`).join('')}
        </div>` : ''}
      ${r.complexity ? `
        <div class="explain-section">
          <div class="explain-section-title">Complexity Analysis</div>
          <span class="complexity-badge">${escHtml(r.complexity)}</span>
        </div>` : ''}
      ${r.use_cases?.length ? `
        <div class="explain-section">
          <div class="explain-section-title">Use Cases</div>
          ${r.use_cases.map(u => `<div class="usecase-item">${escHtml(u)}</div>`).join('')}
        </div>` : ''}
    `;

    $('explainLoading').classList.add('hidden');
    el.classList.remove('hidden');
    showToast('Explanation ready!', 'success');
  } catch (err) {
    $('explainLoading').classList.add('hidden');
    $('explainEmpty').classList.remove('hidden');
    showToast(err.message, 'error');
  } finally {
    $('explainBtn').disabled = false;
  }
});

// ─── TOAST ────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const toast = $('toast');
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ─── UTILS ────────────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
