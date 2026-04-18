import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Add chat input IDs
html = html.replace('<input class="bg-transparent', '<input id="chat-input" class="bg-transparent')
html = html.replace('<button class="material-symbols-outlined text-secondary">send</button>', '<button id="chat-send-btn" class="material-symbols-outlined text-secondary hover:brightness-110 active:scale-95 transition-all">send</button>')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Added input IDs to index.html")
