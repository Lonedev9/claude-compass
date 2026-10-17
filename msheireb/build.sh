#!/bin/sh
# One command: plates (if missing) -> voice -> events -> subtitles -> checks -> picture -> mix -> master -> poster.
set -e
LIB=${LIB:-/root/lemo-opuscar}
HERE=$(cd "$(dirname "$0")" && pwd)
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the Lemo-Opuscar library folder"; exit 1; }
PY="$LIB/.venv/bin/python"
# headless browser: Playwright's, or the one named in PLAYWRIGHT_CHROME
[ -n "$PLAYWRIGHT_CHROME" ] || [ ! -x /opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell ] || \
  export PLAYWRIGHT_CHROME=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell

# imagery: project venv with rasterio (Landsat from the Google Cloud public archive); skipped when the plates exist
if [ ! -f "$HERE/assets/plates.json" ] || [ -n "$FETCH" ]; then
  [ -x "$HERE/.venv/bin/python" ] || { uv venv --quiet --python 3.12 "$HERE/.venv" && uv pip install --quiet --python "$HERE/.venv/bin/python" rasterio numpy pillow scipy pyproj; }
  xargs -P 6 -n 1 "$HERE/.venv/bin/python" "$HERE/tools/fetch.py" < "$HERE/tools/scenes.txt"
  xargs -P 6 -n 1 "$HERE/.venv/bin/python" "$HERE/tools/fetch_region.py" < "$HERE/tools/region_scenes.txt"
  "$HERE/.venv/bin/python" "$HERE/tools/plates.py"
  "$HERE/.venv/bin/python" "$HERE/tools/export_plates.py"
fi

[ -f "$HERE/voice/out/dur.json" ] || "$PY" "$LIB/core/tts/tts.py" "$HERE/voice/lines.json" "$HERE/voice/out"
cd "$LIB"
node core/render/events.mjs "$HERE"
"$PY" "$HERE/tools/cues.py" "$HERE"
"$PY" core/render/srt.py "$HERE/cues.json" "$HERE/msheireb.srt"
node core/render/readcheck.mjs "$HERE" > "$HERE/out/readcheck.txt"
node core/render/video.mjs "$HERE" --fps 24 --workers 4 --out "$HERE/out/video.mp4"
"$PY" "$HERE/mix.py"
sh "$HERE/tools/master.sh" "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/msheireb.mp4"
ffmpeg -loglevel error -y -ss 42.5 -i "$HERE/msheireb.mp4" -frames:v 1 -q:v 2 "$HERE/poster.jpg"
echo "done: $HERE/msheireb.mp4"
