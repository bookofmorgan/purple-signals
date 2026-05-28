# Cowork Project Setup Guide

A portable, self-contained reference for standing up a new project in Claude
Cowork with Git version control. Covers folder connection, CLAUDE.md scaffold,
state docs, agent coordination and the Git workaround for the Cowork sandbox.

---

## 1. Connect a Local Folder

Cowork projects start by selecting a folder from your Mac as the shared workspace.

1. Open Claude Desktop → start a new Cowork session.
2. When prompted (or via the folder picker), select the project folder you want
   Claude to read from and write to.
3. That folder becomes the **workspace mount** — Claude can access everything
   inside it and deliver files back to it.

**Tip:** Create the folder and its skeleton structure *before* connecting it.
Cowork mirrors what's on disk; starting with a clean scaffold saves setup time
inside the session.

---

## 2. Create the Project Scaffold

Every project gets the same four root files. Domain folders are project-specific
and not prescribed here — add them as the work demands.

| File           | Purpose                                  | Update cadence        |
|----------------|------------------------------------------|-----------------------|
| `CLAUDE.md`    | Boot sequence — Claude reads this first  | When project shape changes |
| `STATUS.md`    | Current phase, blockers, next actions    | Every session wrap    |
| `journal.md`   | Append-only field notes and observations | During or after work  |
| `decisions.md` | Decisions with context and rationale     | When a decision lands |

The bottom three are the shared truth layer. Agents read them on session start
and update them at session end.

---

## 3. Write the CLAUDE.md

`CLAUDE.md` sits at the project root and acts as the boot sequence — Claude reads
it automatically when the folder is connected. Structure it with these sections:

```markdown
# {Project Name}

## Project Identity
What this project is, what it produces, why it exists.

## Phase Structure (optional)
If the project is phased, list numbered phases with one-line descriptions.
Skip this section for continuous or non-phased work.

## Conventions
Style rules, naming patterns, editorial standards.

## Agent Roles
Who does what — human, research agent, analyst, engineer, etc.
Define the expected shape so Claude knows which hat to wear.

## Coordination
How agents hand off work. Recommended defaults:

- **File-bus pattern:** Coordinate via shared markdown files, not direct messages.
- **Human-routed:** User decides which agent to engage and carries context.
- **Pull-based state:** Agents read state docs on startup. No push notifications.
- **Scope boundaries:** Agents never make changes outside their explicit brief.
- **Session wrap:** Update state docs at session end. Commit and push.

## Git
Repo URL, branch strategy, and the Cowork Git workflow (see Section 5 below).
```

Keep it factual and tight. Claude treats this as instructions, not prose to admire.

---

## 4. Set Up a GitHub PAT

The Cowork sandbox can't use SSH keys or credential helpers from your host
machine. A Personal Access Token (PAT) stored in the repo's Git config bridges
the gap.

### Create the token

1. Go to **GitHub → Settings → Developer settings → Personal access tokens →
   Fine-grained tokens**.
2. Click **Generate new token**.
3. Configure:
   - **Token name:** `cowork-{project-slug}` (or similar — makes revocation easy)
   - **Expiration:** 90 days
   - **Repository access:** Only select repositories → pick the single repo
   - **Permissions:** Contents → Read and write. Nothing else.
4. Copy the token immediately — GitHub won't show it again.

### Store the token

On your local machine (not inside Cowork), navigate to the repo and embed the
token in the remote URL:

```bash
cd /path/to/{project-slug}
git remote set-url origin https://{github-username}:<PAT>@github.com/{github-username}/{repo-name}.git
```

This writes the PAT into `.git/config`, which lives only on your machine and is
never committed. The Cowork sandbox reads it when cloning.

### Renewal cadence

PATs expire after 90 days. Set a calendar reminder at day 80. To rotate:

1. Generate a new token with the same settings.
2. Run the `git remote set-url` command again with the new token.
3. Revoke the old token in GitHub settings.

---

## 5. Git Inside the Cowork Sandbox

The Cowork sandbox mounts your project folder but doesn't support Git's internal
file operations (specifically unlinking) on that mount. The workaround: clone to
`/tmp` inside the sandbox, rsync your workspace into the clone, then commit and
push from there.

### The clone-to-tmp pattern

Paste this into the CLAUDE.md's Git section, replacing the placeholders:

```bash
cd /tmp && rm -rf {repo-name}-sync && \
git clone "https://{github-username}:<PAT>@github.com/{github-username}/{repo-name}.git" {repo-name}-sync && \
cd {repo-name}-sync && \
git config user.email "{your-email}" && \
git config user.name "{your-name}" && \
rsync -a --exclude='.git' "/sessions/<session-id>/mnt/{workspace-folder-name}/" . && \
git add -A && \
git commit -m "<message>" && \
git push
```

### Placeholders reference

| Placeholder                | Source                                              |
|----------------------------|-----------------------------------------------------|
| `{github-username}`        | Your GitHub handle                                  |
| `{repo-name}`              | The GitHub repository name                          |
| `<PAT>`                    | The fine-grained token from Section 4               |
| `{your-email}`             | Git commit email                                    |
| `{your-name}`              | Git commit display name                             |
| `<session-id>`             | The Cowork sandbox session path (changes each time) |
| `{workspace-folder-name}`  | The folder name you selected in Cowork              |

**Finding the session ID:** Inside the Cowork sandbox, the workspace is mounted
at `/sessions/{session-id}/mnt/{workspace-folder-name}/`. The `{session-id}` is
a unique string per session. Run `ls /sessions/` in bash to find it, or note the
path shown when Claude references the sandbox mount.

### When to commit

Commit at every session wrap. The session-wrap ritual is:

1. Update `STATUS.md` with current state.
2. Append session notes to `journal.md`.
3. Log any decisions in `decisions.md`.
4. Run the clone-to-tmp script with a descriptive commit message.

---

## 6. Session Lifecycle

### Starting a session

1. Open Cowork, select the project folder.
2. Claude reads `CLAUDE.md` automatically.
3. Optionally ask Claude to read `STATUS.md` and `journal.md` to pick up where
   you left off.

### During a session

- Work happens in the workspace mount. Claude reads and writes files there.
- State docs are the coordination surface — update them as work progresses.
- If multiple agent roles are involved, the human routes context between them.

### Wrapping a session

1. Update all three state docs.
2. Commit and push via the clone-to-tmp pattern.
3. Confirm the push succeeded before closing the session.

---

## Quick-Start Checklist

- [ ] Create the project folder
- [ ] Write the CLAUDE.md (Section 3)
- [ ] Initialise the three state docs (STATUS.md, journal.md, decisions.md)
- [ ] Create the GitHub repo
- [ ] Generate a fine-grained PAT scoped to that repo (Section 4)
- [ ] Store the PAT in the repo's local Git config
- [ ] Connect the folder in Cowork
- [ ] Paste the clone-to-tmp script into CLAUDE.md's Git section
- [ ] Run a test commit from inside Cowork to confirm the pipeline works
