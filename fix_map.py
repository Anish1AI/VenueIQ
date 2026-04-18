import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace the map placeholder image with a div container, and remove the grayscale classes from the parent div
old_map_section = r'<div class="relative w-full h-80 rounded-2xl overflow-hidden bg-surface-container-highest group">\s*<img class="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700"[^>]+>'
new_map_section = '<div class="relative w-full h-80 rounded-2xl overflow-hidden bg-surface-container-highest">\n                    <div id="map-container" class="absolute inset-0 z-0"></div>'

html = re.sub(old_map_section, new_map_section, html)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Updated index.html map container")
