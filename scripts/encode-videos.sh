#!/bin/sh
# Builds the web assets of every video found in a source folder:
#
#   public/media/<slug>/poster.avif  thumbnail, AVIF
#   public/media/<slug>/poster.jpg   thumbnail, JPEG fallback
#   public/media/<slug>/preview.mp4  6 s muted 720p loop, hover/scroll
#   public/media/<slug>/full.mp4     full video played in the dialog
#
# and rewrites src/data/media.json, the list the site renders. The file
# name, without its extension, is the title shown on the site; the date
# recorded in the file (or its modification date) orders the list.
#
# In production the full videos are served from a bucket, under the
# name written as "remote" in media.json: the source file name itself
# when the source can be played as is, so it can be uploaded untouched.
# Otherwise the script says which file to upload under which name.
#
# The full video is never recompressed when a browser can already play
# it (H.264 4:2:0 with AAC or no audio): it is only remuxed so that the
# index sits at the start of the file (faststart). Anything else is
# transcoded to H.264/AAC.
#
# Set FULL_CRF (e.g. FULL_CRF=20) to recompress every full video at that
# x264 quality instead, capped at 1080p: much lighter files, at the cost
# of one more generation of compression.
#
# Usage: scripts/encode-videos.sh <source-folder>
# Needs ffmpeg and ffprobe (provided by the flake's dev shell). Assets
# newer than their source are left alone, so reruns are cheap.

set -eu

src_dir=${1:?usage: encode-videos.sh <source-folder>}
root=$(cd "$(dirname "$0")/.." && pwd)
out_root=$root/public/media
manifest=$root/src/data/media.json

# Prints one ffprobe value. $1 file, $2 stream selector, $3 entry.
probe() {
  ffprobe -v error -select_streams "$2" -show_entries "$3" \
    -of default=nw=1:nk=1 "$1" | head -n 1
}

# True when the asset $1 has to be (re)built from the source $2.
stale() {
  [ ! -s "$1" ] || [ "$2" -nt "$1" ]
}

# True when the MP4 index (moov) of $1 comes before its data (mdat), so
# playback can start before the whole file is downloaded.
faststart() {
  ffprobe -v trace "$1" 2>&1 | grep -o "type:'m[od][oa][vt]'" | head -n 1 |
    grep -q moov
}

# Escapes $1 for a JSON string.
json() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

mkdir -p "$out_root" "$(dirname "$manifest")"
entries=$(mktemp)
trap 'rm -f "$entries"' EXIT
count=0

for src in "$src_dir"/*; do
  [ -f "$src" ] || continue
  name=$(basename "$src")
  ext=$(printf '%s' "${name##*.}" | tr '[:upper:]' '[:lower:]')
  case $ext in
    mp4 | mov | m4v) ;;
    *) continue ;;
  esac

  title=${name%.*}
  # Accents are transliterated (Été -> ete) rather than dropped.
  slug=$(printf '%s' "$title" | iconv -f UTF-8 -t ASCII//TRANSLIT 2>/dev/null |
    tr '[:upper:]' '[:lower:]' |
    sed -e 's/[^a-z0-9]\{1,\}/-/g' -e 's/^-//' -e 's/-$//')
  if [ -z "$slug" ]; then
    echo "skipped (no usable characters in the name): $name" >&2
    continue
  fi
  out=$out_root/$slug
  mkdir -p "$out"

  width=$(probe "$src" v:0 stream=width)
  height=$(probe "$src" v:0 stream=height)
  vcodec=$(probe "$src" v:0 stream=codec_name)
  pix_fmt=$(probe "$src" v:0 stream=pix_fmt)
  acodec=$(probe "$src" a:0 stream=codec_name)
  duration=$(probe "$src" v:0 format=duration)
  rotation=$(probe "$src" v:0 stream_side_data=rotation)
  created=$(probe "$src" v:0 format_tags=creation_time)

  if [ -z "$width" ] || [ -z "$height" ] || [ -z "$duration" ]; then
    echo "skipped (unreadable video): $name" >&2
    continue
  fi

  # Phones store portrait videos as landscape frames plus a rotation.
  case ${rotation#-} in
    90 | 270) set -- "$height" "$width" && width=$1 height=$2 ;;
  esac

  # Date recorded by the camera or the editing software, else the date
  # the file was last written.
  date=${created%%.*}
  case $date in
    [0-9][0-9][0-9][0-9]-*) date=${date%Z}Z ;;
    *) date=$(date -u -r "$src" +%Y-%m-%dT%H:%M:%SZ) ;;
  esac

  # Poster frame and preview start 10 s in, or a quarter of the way
  # through shorter videos.
  start=$(awk -v d="$duration" 'BEGIN { printf "%.2f", (d > 20 ? 10 : d / 4) }')

  echo "$name -> $slug (${width}x${height}, ${duration}s, $vcodec/${acodec:-no audio}, $date)"

  # Posters are 960 px wide, 540 px for portrait videos (shown narrower).
  if stale "$out/poster.jpg" "$src"; then
    ffmpeg -v error -y -ss "$start" -i "$src" -frames:v 1 \
      -vf "scale='min(if(gt(iw,ih),960,540),iw)':-2" -q:v 3 "$out/poster.jpg"
  fi

  if stale "$out/poster.avif" "$src"; then
    ffmpeg -v error -y -ss "$start" -i "$src" -frames:v 1 \
      -vf "scale='min(if(gt(iw,ih),960,540),iw)':-2,format=yuv420p" \
      -c:v libaom-av1 -still-picture 1 -crf 32 -b:v 0 -cpu-used 6 \
      "$out/poster.avif"
  fi

  if stale "$out/preview.mp4" "$src"; then
    ffmpeg -v error -y -ss "$start" -t 6 -i "$src" -an \
      -vf "scale=-2:'min(720,ih)',format=yuv420p" \
      -c:v libx264 -crf 26 -preset slow -movflags +faststart \
      "$out/preview.mp4"
  fi

  playable=no
  case $vcodec:$pix_fmt in
    h264:yuv420p | h264:yuvj420p)
      case $acodec in '' | aac) playable=yes ;; esac
      ;;
  esac

  if stale "$out/full.mp4" "$src"; then
    if [ "$playable" = yes ] && [ -z "${FULL_CRF:-}" ]; then
      ffmpeg -v error -y -i "$src" -map 0:v:0 -map '0:a:0?' -c copy \
        -movflags +faststart "$out/full.mp4"
    else
      # Shorter side capped at 1080 (1920x1080, or 1080x1920 for reels).
      full_scale="scale='if(gt(iw,ih),-2,min(1080,iw))':'if(gt(iw,ih),min(1080,ih),-2)'"
      echo "  transcoding the full video (source is $vcodec/$pix_fmt)"
      ffmpeg -v error -y -i "$src" -map 0:v:0 -map '0:a:0?' \
        -vf "$full_scale,format=yuv420p" \
        -c:v libx264 -crf "${FULL_CRF:-20}" -preset medium \
        -c:a aac -b:a 160k -movflags +faststart "$out/full.mp4"
    fi
  fi

  # Name of the full video in the bucket: the source itself when it can
  # be uploaded untouched, else the web version built above.
  if [ "$playable" = yes ] && [ "$ext" = mp4 ] && [ -z "${FULL_CRF:-}" ] &&
    faststart "$src"; then
    remote=$name
  else
    remote=$title.mp4
    echo "  to upload: public/media/$slug/full.mp4, renamed \"$remote\""
  fi

  [ "$count" -eq 0 ] || printf ',\n' >>"$entries"
  printf '  { "slug": "%s", "title": "%s", "remote": "%s", "date": "%s", "width": %s, "height": %s, "duration": %s }' \
    "$slug" "$(json "$title")" "$(json "$remote")" "$date" \
    "$width" "$height" \
    "$(awk -v d="$duration" 'BEGIN { printf "%.2f", d }')" >>"$entries"
  count=$((count + 1))
done

{
  printf '[\n'
  cat "$entries"
  [ "$count" -eq 0 ] || printf '\n'
  printf ']\n'
} >"$manifest"

echo "$count video(s) written to ${manifest#"$root"/}"
