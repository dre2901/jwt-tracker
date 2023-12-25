mkdir build
rm build/jwt-tracker-firefox-v2.zip
rm build/jwt-tracker-firefox-v3.zip
rm build/jwt-tracker-chrome.zip

exclude_files=("build.sh" ".gitignore" "manifest-firefox-v2.json" "manifest-firefox-v3.json" "manifext-chrome.json" "manifest.json.bak")

if [ -f "manifest.json" ]; then
  mv "manifest.json" "manifest.json.bak"
fi

if [ -f "manifest-firefox-v2.json" ]; then
  cp "manifest-firefox-v2.json" "manifest.json"
  zip build/jwt-tracker-firefox-v2 * -D -r -x "${exclude_files[@]}"
  rm manifest.json
fi

if [ -f "manifest-firefox-v3.json" ]; then
  cp "manifest-firefox-v3.json" "manifest.json"
  zip build/jwt-tracker-firefox-v3 * -D -r -x "${exclude_files[@]}"
  rm manifest.json
fi

if [ -f "manifest-chrome.json" ]; then
  cp "manifest-chrome.json" "manifest.json"
  zip build/jwt-tracker-chrome * -D -r -x "${exclude_files[@]}"
  rm manifest.json
fi

if [ -f "manifest.json.bak" ]; then
  mv "manifest.json.bak" "manifest.json"
fi