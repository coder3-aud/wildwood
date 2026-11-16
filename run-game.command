#!/bin/sh
set -eu

cd "$(dirname "$0")"

python3 -m http.server 8000 --bind 127.0.0.1 &
server_pid=$!

cleanup() {
  kill "$server_pid" 2>/dev/null || true
}
trap cleanup EXIT

attempt=0
while [ "$attempt" -lt 40 ]; do
  if ! kill -0 "$server_pid" 2>/dev/null; then
    echo "Unable to start the game server. Check whether port 8000 is already in use."
    exit 1
  fi
  if curl --silent --fail http://127.0.0.1:8000/ >/dev/null \
    && kill -0 "$server_pid" 2>/dev/null; then
    break
  fi
  sleep 0.25
  attempt=$((attempt + 1))
done

if [ "$attempt" -eq 40 ]; then
  echo "The game server did not become ready. Check whether port 8000 is already in use."
  exit 1
fi

if ! open -a "Google Chrome" http://127.0.0.1:8000; then
  echo "Unable to open Google Chrome. Visit http://127.0.0.1:8000 in your browser."
  exit 1
fi

echo "Wildwood is running at http://127.0.0.1:8000. Close this window to stop the server."
wait "$server_pid"
