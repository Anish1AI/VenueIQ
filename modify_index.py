import re

def update_index():
    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    # Text replacements
    html = html.replace('<title>Architect AI Intelligence Hub</title>', '<title>VenueIQ | Predictive Friction Eliminator</title>')
    html = html.replace('Architect AI</span>', 'VenueIQ</span>')
    html = html.replace('Intelligence Hub</h2>', 'Predictive Friction Eliminator</h2>')
    html = html.replace('>Recommendation Hub</h1>', '>Intent Prediction Layer</h1>')
    html = html.replace('>Predictive spatial adjustments for the Neo-Tokyo Quarter project.</p>', '>Surfacing proactive friction alerts for your section.</p>')
    html = html.replace('Spatial Intelligence Map</h2>', 'Stadium Pressure Map</h2>')
    html = html.replace('AI Assistant</p>', 'VenueIQ Assistant</p>')
    html = html.replace('Ask Architect AI...', 'Ask VenueIQ...')
    html = html.replace('Recent Activities</h4>', 'Live Intents</h4>')

    # Add id to recommendations panel and clear hardcoded cards
    # We find the grid container and replace its contents.
    grid_start = html.find('<div class="grid grid-cols-1 md:grid-cols-3 gap-6">')
    if grid_start != -1:
        # Find where this div ends. Since we know the next section is "<!-- Spatial Intel", we can cheat a bit.
        spatial_start = html.find('<!-- Spatial Intel')
        if spatial_start != -1:
            # We replace everything from grid_start to spatial_start with an empty container and a separate metric card container
            new_grid = '''<div id="recommendations-panel" class="grid grid-cols-1 md:grid-cols-3 gap-6">
<!-- Dynamic intent cards will be rendered here by app.js -->
</div>
<div id="bias-audit" class="mt-6"></div>
'''
            html = html[:grid_start] + new_grid + html[spatial_start:]

    # Add id to chat messages
    chat_start = html.find('<div class="space-y-4">')
    if chat_start != -1:
        html = html[:chat_start] + '<div id="chat-messages" class="space-y-4">' + html[chat_start + len('<div class="space-y-4">'):]

    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("Updated index.html")

update_index()
