#!/bin/bash
input=$(cat)
agent_id=$(jq -r '.agent_id // empty' <<<"$input")
tool_name=$(jq -r '.tool_name' <<<"$input")

[ -n "$agent_id" ] && exit 0

case "$tool_name" in
  Edit|Write)
    echo "Orchestrator mode: delegate file changes to a subagent (general-purpose, model: opus)." >&2
    exit 2
    ;;
esac
exit 0
