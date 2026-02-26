(function () {
  'use strict';

  const BUTTON_ID = 'jira-gh-pr-btn';
  const TOAST_ID = 'jira-gh-pr-toast';

  function getIssueKey() {
    const match = window.location.pathname.match(/\/browse\/([A-Z][A-Z0-9]+-\d+)/);
    if (match) return match[1];

    const breadcrumb = document.querySelector('[data-testid="issue.views.issue-base.foundation.breadcrumbs.current-issue.item"]');
    if (breadcrumb) return breadcrumb.textContent.trim();

    return null;
  }

  function getSummary() {
    const heading = document.querySelector('[data-testid="issue.views.issue-base.foundation.summary.heading"]');
    if (heading) return heading.textContent.trim();

    const h1 = document.querySelector('h1[data-testid]');
    if (h1) return h1.textContent.trim();

    const title = document.title.replace(/\s*-\s*Jira.*$/i, '').trim();
    const cleaned = title.replace(/^\[?[A-Z]+-\d+\]?\s*/, '');
    return cleaned || title;
  }

  function getDescription() {
    const descField = document.querySelector('[data-testid="issue.views.field.rich-text.description"] .ak-renderer-document');
    if (descField) return descField.innerText.trim();

    const descArea = document.querySelector('[data-testid="issue.views.field.rich-text.description"]');
    if (descArea) return descArea.innerText.trim();

    return '';
  }

  function showToast(message, isError) {
    let toast = document.getElementById(TOAST_ID);
    if (toast) toast.remove();

    toast = document.createElement('div');
    toast.id = TOAST_ID;
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '130px',
      right: '24px',
      padding: '12px 20px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      color: '#fff',
      background: isError ? '#cf222e' : '#1a7f37',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: '999999',
      transition: 'opacity 0.3s',
      opacity: '0',
    });
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => { toast.style.opacity = '1'; });
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  async function dispatchWorkflow() {
    const data = await chrome.storage.sync.get(['githubPat', 'githubRepo']);
    if (!data.githubPat || !data.githubRepo) {
      showToast('Configure PAT and repo in the extension popup first', true);
      return;
    }

    const key = getIssueKey();
    if (!key) {
      showToast('Could not detect Jira issue key', true);
      return;
    }

    const summary = getSummary();
    const description = getDescription();

    const btn = document.getElementById(BUTTON_ID);
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Dispatching...';
    }

    try {
      const response = await fetch(
        `https://api.github.com/repos/${data.githubRepo}/dispatches`,
        {
          method: 'POST',
          headers: {
            'Accept': 'application/vnd.github+json',
            'Authorization': `Bearer ${data.githubPat}`,
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event_type: 'jira-jules-pr',
            client_payload: {
              jira_key: key,
              summary: summary,
              description: description,
            },
          }),
        }
      );

      if (response.status === 204) {
        showToast(`Dispatched PR creation for ${key}`, false);
      } else if (response.status === 404) {
        showToast('GitHub returned 404 — check PAT permissions and repo name', true);
      } else {
        const body = await response.text();
        showToast(`GitHub API error ${response.status}: ${body}`, true);
      }
    } catch (err) {
      showToast(`Network error: ${err.message}`, true);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Create PR';
      }
    }
  }

  function injectButton() {
    if (document.getElementById(BUTTON_ID)) return;
    if (!getIssueKey()) return;

    const btn = document.createElement('button');
    btn.id = BUTTON_ID;
    btn.textContent = 'Create PR';
    Object.assign(btn.style, {
      position: 'fixed',
      bottom: '80px',
      right: '24px',
      padding: '10px 18px',
      borderRadius: '8px',
      border: 'none',
      background: '#0969da',
      color: '#fff',
      fontSize: '13px',
      fontWeight: '600',
      cursor: 'pointer',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      zIndex: '999998',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      transition: 'background 0.15s, transform 0.1s',
    });

    btn.addEventListener('mouseenter', () => { btn.style.background = '#0860c7'; });
    btn.addEventListener('mouseleave', () => { btn.style.background = '#0969da'; });
    btn.addEventListener('mousedown', () => { btn.style.transform = 'scale(0.97)'; });
    btn.addEventListener('mouseup', () => { btn.style.transform = 'scale(1)'; });
    btn.addEventListener('click', dispatchWorkflow);

    document.body.appendChild(btn);
  }

  function removeButton() {
    const btn = document.getElementById(BUTTON_ID);
    if (btn) btn.remove();
  }

  function checkAndInject() {
    if (getIssueKey()) {
      injectButton();
    } else {
      removeButton();
    }
  }

  checkAndInject();

  const observer = new MutationObserver(() => {
    checkAndInject();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      removeButton();
      setTimeout(checkAndInject, 500);
    }
  }, 500);
})();
