const patInput = document.getElementById('pat');
const repoInput = document.getElementById('repo');
const saveBtn = document.getElementById('save');
const statusEl = document.getElementById('status');

chrome.storage.sync.get(['githubPat', 'githubRepo'], (data) => {
  if (data.githubPat) patInput.value = data.githubPat;
  if (data.githubRepo) repoInput.value = data.githubRepo;
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

  chrome.storage.sync.set({ githubPat: pat, githubRepo: repo }, () => {
    showStatus('Settings saved', 'success');
  });
});

function showStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className = type;
  setTimeout(() => { statusEl.textContent = ''; }, 3000);
}
