const agentSelect = document.getElementById('agent');
const patInput = document.getElementById('pat');
const repoInput = document.getElementById('repo');
const saveBtn = document.getElementById('save');
const statusEl = document.getElementById('status');
const prContent = document.getElementById('pr-content');

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.panel).classList.add('active');
  });
});

chrome.storage.sync.get(['githubPat', 'githubRepo', 'agent'], (data) => {
  if (data.githubPat) patInput.value = data.githubPat;
  if (data.githubRepo) repoInput.value = data.githubRepo;
  agentSelect.value = data.agent || 'jules';
});

saveBtn.addEventListener('click', () => {
  const pat = patInput.value.trim();
  const repo = repoInput.value.trim();

  if (!pat) {
    showStatus('PAT is required', 'error');
    return;
  }
  if (!repo || !repo.includes('/')) {
    showStatus('Repo must be in owner/repo format', 'error');
    return;
  }

  const agent = agentSelect.value;
  chrome.storage.sync.set({ githubPat: pat, githubRepo: repo, agent }, () => {
    showStatus('Settings saved', 'success');
  });
});

function showStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className = type;
  setTimeout(() => { statusEl.textContent = ''; }, 3000);
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

async function searchPR(pat, repo, jiraKey) {
  const query = encodeURIComponent(`repo:${repo} is:pr "${jiraKey}" in:title`);
  const res = await fetch(`https://api.github.com/search/issues?q=${query}&sort=created&order=desc&per_page=5`, {
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${pat}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!res.ok) return null;

  const data = await res.json();
  if (data.items && data.items.length > 0) {
    const keyPattern = new RegExp(`(^|[\\s\\[\\(])${jiraKey.replace('-', '\\-')}([\\s\\]\\):]|$)`);
    const match = data.items.find(item => keyPattern.test(item.title));
    const pr = match || data.items[0];
    let state = 'open';
    if (pr.pull_request && pr.pull_request.merged_at) state = 'merged';
    else if (pr.state === 'closed') state = 'closed';
    return { url: pr.html_url, number: pr.number, state };
  }
  return null;
}

async function loadPRs() {
  const [syncData, localData] = await Promise.all([
    chrome.storage.sync.get(['githubPat', 'githubRepo']),
    chrome.storage.local.get({ dispatches: [] }),
  ]);

  const dispatches = localData.dispatches;
  if (!dispatches.length) {
    prContent.innerHTML = '<div class="empty">No PRs dispatched yet.<br>Click "Create PR" on a Jira issue to get started.</div>';
    return;
  }

  if (!syncData.githubPat || !syncData.githubRepo) {
    prContent.innerHTML = '<div class="empty">Configure your PAT in Settings first.</div>';
    return;
  }

  const list = document.createElement('ul');
  list.className = 'pr-list';

  for (const d of dispatches) {
    const item = document.createElement('li');
    item.className = 'pr-item';

    const keyEl = document.createElement('div');
    keyEl.className = 'pr-key';
    keyEl.textContent = d.jiraKey;

    const summaryEl = document.createElement('div');
    summaryEl.className = 'pr-summary';
    summaryEl.textContent = d.summary;

    const metaEl = document.createElement('div');
    metaEl.className = 'pr-meta';
    const agentLabel = d.agent === 'copilot' ? 'Copilot' : 'Jules';
    const agentClass = d.agent === 'copilot' ? 'badge-copilot' : 'badge-jules';
    metaEl.innerHTML = `<span>${timeAgo(d.timestamp)}</span><span class="pr-badge ${agentClass}">${agentLabel}</span>`;

    item.append(keyEl, summaryEl, metaEl);
    list.appendChild(item);
  }

  prContent.innerHTML = '';
  prContent.appendChild(list);

  const items = list.querySelectorAll('.pr-item');
  for (let i = 0; i < dispatches.length; i++) {
    const d = dispatches[i];
    const metaEl = items[i].querySelector('.pr-meta');
    const repo = d.repo || syncData.githubRepo;

    try {
      const pr = await searchPR(syncData.githubPat, repo, d.jiraKey);
      if (pr) {
        const badge = document.createElement('span');
        badge.className = `pr-badge badge-${pr.state}`;
        badge.textContent = pr.state;
        metaEl.appendChild(badge);

        const link = document.createElement('a');
        link.className = 'pr-link';
        link.href = pr.url;
        link.target = '_blank';
        link.textContent = `#${pr.number}`;
        metaEl.appendChild(link);
      } else {
        const badge = document.createElement('span');
        badge.className = 'pr-badge badge-pending';
        badge.textContent = 'pending';
        metaEl.appendChild(badge);
      }
    } catch {
      const badge = document.createElement('span');
      badge.className = 'pr-badge badge-pending';
      badge.textContent = 'unknown';
      metaEl.appendChild(badge);
    }
  }
}

loadPRs();
