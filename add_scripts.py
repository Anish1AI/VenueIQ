import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Add Firebase and Maps scripts to <head>
head_scripts = """
<!-- Google Services Stack -->
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"></script>
<script async defer src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=visualization"></script>
"""

# Insert before </head>
html = html.replace('</head>', head_scripts + '\n</head>')

# 2. Add app.js and firebase-config module scripts at the bottom
body_scripts = """
<!-- Core App Logic -->
<script type="module" src="firebase-config.js"></script>
<script type="module" src="app.js"></script>
"""
# Insert before </body>
html = html.replace('</body>', body_scripts + '\n</body>')

# 3. Add an ID to the "Live Intents" container so app.js can populate the psychological predictions
# Looking for 'Live Intents</h4>'
intents_header_idx = html.find('Live Intents</h4>')
if intents_header_idx != -1:
    # We want to find the div wrapping it. Let's just wrap the content inside the space-y-4 div that follows it.
    space_y_idx = html.find('<div class="space-y-4">', intents_header_idx)
    if space_y_idx != -1:
        # replace '<div class="space-y-4">' with '<div id="intent-prediction-layer" class="space-y-4">'
        html = html[:space_y_idx] + '<div id="intent-prediction-layer" class="space-y-4">' + html[space_y_idx + len('<div class="space-y-4">'):]

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Updated index.html with scripts and IDs")
