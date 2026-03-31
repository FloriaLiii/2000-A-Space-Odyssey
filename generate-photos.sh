#!/usr/bin/env bash
# 自动扫描 assets/hobbies/ 下的照片，生成 photos.json
# 用法：更新照片后运行 bash generate-photos.sh

cd "$(dirname "$0")"

OUTPUT="assets/hobbies/photos.json"

echo '{' > "$OUTPUT"

first_category=true
for dir in assets/hobbies/*/; do
  category=$(basename "$dir")

  if [ "$first_category" = true ]; then
    first_category=false
  else
    echo ',' >> "$OUTPUT"
  fi

  printf '  "%s": [' "$category" >> "$OUTPUT"

  first_file=true
  find "$dir" -maxdepth 1 -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.webp' \) | sort | while read -r file; do
    if [ "$first_file" = true ]; then
      first_file=false
      printf '\n' >> "$OUTPUT"
    else
      printf ',\n' >> "$OUTPUT"
    fi
    printf '    "%s"' "$file" >> "$OUTPUT"
  done

  printf '\n  ]' >> "$OUTPUT"
done

echo '' >> "$OUTPUT"
echo '}' >> "$OUTPUT"

echo "photos.json 已更新："
cat "$OUTPUT"
