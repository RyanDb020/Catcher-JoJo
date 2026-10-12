#!/usr/bin/env bash
set -euo pipefail
project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
python3 "$project_root/tools/generate_combat_audio.py"
mkdir -p "$project_root/assets/combat-audio"
for source in "$project_root"/build/audio-source/*.wav; do
  name="$(basename "$source" .wav)"
  bitrate=32k
  if [[ "$name" == "combat-music" || "$name" == "district-ambience" ]]; then bitrate=12k; fi
  ffmpeg -hide_banner -loglevel error -y -i "$source" -ac 1 -ar 48000 -c:a libopus -b:a "$bitrate" -vbr off "$project_root/assets/combat-audio/$name.ogg"
done
printf 'Created %s local Ogg/Opus combat cues.\n' "$(find "$project_root/assets/combat-audio" -maxdepth 1 -name '*.ogg' | wc -l)"
