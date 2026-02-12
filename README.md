# arc-tabs-logger

A macOS launchd agent that logs every URL you visit in [Arc browser](https://arc.net) to a plain text file. Runs every 60 seconds, deduplicates URLs, and stays silent when Arc isn't running.

## Requirements

- macOS
- [Arc browser](https://arc.net)
- Node.js (checked in `/opt/homebrew/bin/node`, `/usr/local/bin/node`, or `~/.nvm/`)
- Automation permission: System Settings > Privacy & Security > Automation > Terminal (or your shell) > Arc

## Files

| File                                  | Purpose                                                |
| ------------------------------------- | ------------------------------------------------------ |
| `arc_tabs.js`                         | Queries Arc tabs via JXA (JavaScript for Automation)   |
| `log-arc-tabs.sh`                     | Wrapper script: gets URLs, appends new ones to the log |
| `com.fictorial.arc-tabs-logger.plist` | launchd agent configuration                            |

## Setup

1. Clone and update the plist path:

```bash
git clone https://github.com/fictorial/arc-tabs-logger.git
cd arc-tabs-logger
```

Edit `com.fictorial.arc-tabs-logger.plist` and set the path to where you cloned the repo.

2. Install the launchd agent:

```bash
cp com.fictorial.arc-tabs-logger.plist ~/Library/LaunchAgents/
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.fictorial.arc-tabs-logger.plist
```

3. Grant Automation permission when macOS prompts you (or enable it manually in System Settings).

## How it works

1. launchd runs `log-arc-tabs.sh` every 60 seconds (and once at login).
2. The script calls `arc_tabs.js --urls-only` to get all open tab URLs via JXA.
3. Each URL is checked against the log file using `grep -Fxq` (exact whole-line match).
4. Only new URLs are appended -- no duplicates.
5. If Arc isn't running, the script exits silently.

URLs are stored in `${XDG_DATA_HOME:-$HOME/.local/share}/arc-tabs/tabs-visited.txt`, one per line.

## Standalone usage

`arc_tabs.js` can also be used directly:

```bash
node arc_tabs.js              # Pretty-printed list of all open tabs
node arc_tabs.js --json       # Full metadata as JSON
node arc_tabs.js --urls-only  # Just URLs, one per line
```

## Uninstall

```bash
launchctl bootout gui/$(id -u)/com.fictorial.arc-tabs-logger
rm ~/Library/LaunchAgents/com.fictorial.arc-tabs-logger.plist
```

## License

MIT
