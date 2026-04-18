import re

# Update index.html
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

old_chips = '''                    <div class="flex gap-2">
                        <div
                            class="px-3 py-1 bg-surface-container rounded-full text-[10px] font-bold text-primary-dim border border-primary-dim/20">
                            Ask about load</div>
                        <div
                            class="px-3 py-1 bg-surface-container rounded-full text-[10px] font-bold text-primary-dim border border-primary-dim/20">
                            Material list</div>
                    </div>'''

new_chips = '''                    <div class="flex gap-2">
                        <div
                            class="quick-action-btn cursor-pointer px-3 py-1 bg-surface-container rounded-full text-[10px] font-bold text-primary-dim border border-primary-dim/20 hover:bg-surface-container-high transition-colors">
                            Ask about load</div>
                        <div
                            class="quick-action-btn cursor-pointer px-3 py-1 bg-surface-container rounded-full text-[10px] font-bold text-primary-dim border border-primary-dim/20 hover:bg-surface-container-high transition-colors">
                            Material list</div>
                    </div>'''

html = html.replace(old_chips, new_chips)
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

# Update app.js
with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

old_setup = """function setupChatUI() {
  const sendBtn = document.getElementById('chat-send-btn');
  const inputEl = document.getElementById('chat-input');
  
  if (!sendBtn || !inputEl) return;

  const handleSend = () => {
    const text = inputEl.value.trim();
    if (text) {
      askAssistant(text);
      inputEl.value = '';
    }
  };

  sendBtn.addEventListener('click', handleSend);
  inputEl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
  });
}"""

new_setup = """function setupChatUI() {
  const sendBtn = document.getElementById('chat-send-btn');
  const inputEl = document.getElementById('chat-input');
  const quickActionBtns = document.querySelectorAll('.quick-action-btn');
  
  if (!sendBtn || !inputEl) return;

  const handleSend = () => {
    const text = inputEl.value.trim();
    if (text) {
      askAssistant(text);
      inputEl.value = '';
    }
  };

  sendBtn.addEventListener('click', handleSend);
  inputEl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
  });

  quickActionBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const text = e.target.textContent.trim();
      askAssistant(text);
    });
  });
}"""

js = js.replace(old_setup, new_setup)
with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Updated index.html and app.js")
