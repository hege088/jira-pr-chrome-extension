# Jira to GitHub PR — Chrome Extension

A Chrome extension that adds a "Create PR" button on Jira issue pages. Clicking it dispatches the ticket details to a GitHub Actions workflow that triggers an AI coding agent (Jules) to create a pull request.

## Setup

1. Open `chrome://extensions/` in Chrome
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked** and select this folder
4. Click the extension icon in the toolbar and configure:
   - **GitHub PAT** — a classic PAT with `repo` scope, or a fine-grained PAT with Contents read/write permission
   - **Repository** — e.g. `github/cli`

## Usage

1. Navigate to any Jira issue page
2. A blue **Create PR** button appears in the bottom-left corner
3. Click it — the extension extracts the issue key, summary, and description, then dispatches a `repository_dispatch` event to your GitHub repo
4. The GitHub Actions workflow picks it up and triggers the AI agent to create a PR

## How It Works

```
Jira Page → Chrome Extension → GitHub API (repository_dispatch) → GitHub Actions → Jules API → PR
```

The extension sends a `POST /repos/{owner}/{repo}/dispatches` request with:

```json
{
  "event_type": "jira-copilot-pr",
  "client_payload": {
    "jira_key": "PROJ-123",
    "summary": "Ticket title",
    "description": "Ticket description text"
  }
}
```

## Files

- `manifest.json` — Manifest V3 config
- `content.js` — Injected into Jira pages; extracts ticket data and shows the button
- `popup.html` / `popup.js` — Settings popup for PAT and repo
- `icons/` — Extension icons
