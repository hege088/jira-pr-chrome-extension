(function () {
  'use strict';

  const BUTTON_ID = 'jira-gh-pr-btn';
  const TOAST_ID = 'jira-gh-pr-toast';
  const STYLE_ID = 'jira-gh-pr-styles';

  const SPARKLE_SVG = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 1.5L4.9 4.1L7.5 5L4.9 5.9L4 8.5L3.1 5.9L0.5 5L3.1 4.1L4 1.5Z" fill="white" opacity="0.9"/>
    <path d="M10 5L10.6 6.9L12.5 7.5L10.6 8.1L10 10L9.4 8.1L7.5 7.5L9.4 6.9L10 5Z" fill="white"/>
    <path d="M6 10L6.45 11.35L7.8 11.8L6.45 12.25L6 13.6L5.55 12.25L4.2 11.8L5.55 11.35L6 10Z" fill="white" opacity="0.7"/>
  </svg>`;

  const PR_ICON_SVG = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="5" cy="3.5" r="2" stroke="white" stroke-width="1.5" fill="none"/>
    <circle cx="5" cy="12.5" r="2" stroke="white" stroke-width="1.5" fill="none"/>
    <circle cx="12" cy="7.5" r="2" stroke="white" stroke-width="1.5" fill="none"/>
    <line x1="5" y1="5.5" x2="5" y2="10.5" stroke="white" stroke-width="1.5"/>
    <path d="M5 5.5C5 7.5 7 7.5 10 7.5" stroke="white" stroke-width="1.5" fill="none"/>
  </svg>`;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      @keyframes jira-pr-shimmer {
        0% { background-position: -200% center; }
        100% { background-position: 200% center; }
      }
      @keyframes jira-pr-glow {
        0%, 100% { box-shadow: 0 2px 12px rgba(139,92,246,0.3), 0 0 20px rgba(59,130,246,0.15); }
        50% { box-shadow: 0 2px 18px rgba(139,92,246,0.5), 0 0 30px rgba(59,130,246,0.25); }
      }
      @keyframes jira-pr-sparkle-float {
        0%, 100% { opacity: 0.7; transform: translateY(0) scale(1); }
        50% { opacity: 1; transform: translateY(-1px) scale(1.1); }
      }
      #${BUTTON_ID} {
        background: linear-gradient(135deg, #3b82f6 0%, #7c3aed 50%, #8b5cf6 100%) !important;
      }
      #${BUTTON_ID}:hover {
        background: linear-gradient(135deg, #2563eb 0%, #6d28d9 50%, #7c3aed 100%) !important;
      }
      #${BUTTON_ID}::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: 12px;
        background: linear-gradient(90deg,
          transparent 0%, rgba(255,255,255,0) 40%,
          rgba(255,255,255,0.15) 50%,
          rgba(255,255,255,0) 60%, transparent 100%);
        background-size: 200% 100%;
        animation: jira-pr-shimmer 3s ease-in-out infinite;
        pointer-events: none;
      }
      #${BUTTON_ID} .sparkle-icon {
        animation: jira-pr-sparkle-float 2s ease-in-out infinite;
        display: flex;
      }
    `;
    document.head.appendChild(style);
  }

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
    const data = await chrome.storage.sync.get(['githubPat', 'githubRepo', 'agent']);
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
      btn.querySelector('.btn-label').textContent = 'Dispatching…';
      btn.style.opacity = '0.85';
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
            event_type: data.agent === 'copilot' ? 'jira-copilot-pr' : 'jira-jules-pr',
            client_payload: {
              jira_key: key,
              summary: summary,
              description: description,
            },
          }),
        }
      );

      if (response.status === 204) {
        const stored = await chrome.storage.local.get({ dispatches: [] });
        const dispatches = stored.dispatches;
        dispatches.unshift({
          jiraKey: key,
          summary: summary,
          repo: data.githubRepo,
          agent: data.agent || 'jules',
          timestamp: Date.now(),
        });
        if (dispatches.length > 20) dispatches.length = 20;
        await chrome.storage.local.set({ dispatches });

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
        btn.querySelector('.btn-label').textContent = 'Create PR';
        btn.style.opacity = '1';
      }
    }
  }

  function injectButton() {
    if (document.getElementById(BUTTON_ID)) return;
    if (!getIssueKey()) return;

    injectStyles();

    const btn = document.createElement('button');
    btn.id = BUTTON_ID;

    const sparkle = document.createElement('span');
    sparkle.className = 'sparkle-icon';
    sparkle.innerHTML = SPARKLE_SVG;

    const icon = document.createElement('span');
    icon.style.display = 'flex';
    icon.innerHTML = PR_ICON_SVG;

    const label = document.createElement('span');
    label.className = 'btn-label';
    label.textContent = 'Create PR';

    btn.append(sparkle, icon, label);

    Object.assign(btn.style, {
      position: 'fixed',
      bottom: '80px',
      right: '24px',
      padding: '10px 18px 10px 14px',
      borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.15)',
      color: '#fff',
      fontSize: '13px',
      fontWeight: '600',
      cursor: 'pointer',
      zIndex: '999998',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      transition: 'transform 0.1s, opacity 0.15s',
      overflow: 'hidden',
      animation: 'jira-pr-glow 3s ease-in-out infinite',
    });

    btn.addEventListener('mousedown', () => { btn.style.transform = 'scale(0.96)'; });
    btn.addEventListener('mouseup', () => { btn.style.transform = 'scale(1)'; });
    btn.addEventListener('mouseleave', () => { btn.style.transform = 'scale(1)'; });
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
