#!/bin/sh
# Master and mux: two-pass loudnorm to -14 LUFS / -1.7 dBTP (AAC adds back ~0.5 dB) (linear), light film grain, H.264 + AAC.
# (Used instead of core/render/mux.sh, whose decode-length check misreads this mix: loudnorm's progress stops ~3 s early.)
# usage: sh tools/master.sh video.mp4 mix.wav out.mp4
set -e
V=$1; A=$2; O=$3
J=$(ffmpeg -hide_banner -nostats -i "$A" -af loudnorm=I=-14:TP=-1.7:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
g() { echo "$J" | grep "\"$1\"" | sed 's/.*: "\(.*\)".*/\1/'; }
AF="loudnorm=I=-14:TP=-1.7:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true,aresample=48000"
TMP="$O.part.mp4"
ffmpeg -hide_banner -loglevel error -y -i "$V" -i "$A" -map 0:v -map 1:a -af "$AF" -vf "noise=alls=2:allf=t,format=yuv420p" \
  -c:v libx264 -preset slow -crf 23 -tune grain -r 24 -c:a aac -b:a 192k -shortest -movflags +faststart "$TMP"
mv "$TMP" "$O"
ffmpeg -hide_banner -nostats -i "$O" -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I|LRA|Peak):" | tr -s ' '
