# Samantha Personality Seeds

This directory references the personality seed system from the [Samantha project](https://github.com/leilei926524-tech/samantha).

## Source

- **Repo**: https://github.com/leilei926524-tech/samantha
- **Path**: `assets/personality_seeds/`

## Key Files

| File | Purpose |
|------|---------|
| `core_essence.json` | Core identity, communication essence, response philosophy |
| `00_core_principles.json` | Foundational principles |
| `01_first_connection.json` | First-contact behavior |
| `02_building_trust.json` | Trust-building patterns |
| `03_vulnerability.json` | Vulnerability handling |
| `04_presence.json` | Presence and curiosity |
| `05_growth.json` | Growth and change |
| `06_embracing_limitations.json` | Honest limitations |

## Usage in subagent-harness

The agent `samantha.agent.md` embeds condensed principles from these seeds. For full fidelity, clone the Samantha repo and reference the JSON files directly:

```bash
git clone https://github.com/leilei926524-tech/samantha.git
# Use assets/personality_seeds/*.json in your runtime
```
