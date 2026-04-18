import re

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

new_typing = """  typingIndicator.className = 'flex gap-3';
  typingIndicator.innerHTML = `
    <div class="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center shrink-0">
      <span class="material-symbols-outlined text-primary text-sm animate-spin">sync</span>
    </div>
    <div class="bg-surface-container-highest p-3 rounded-xl max-w-[85%] rounded-tl-sm">
      <p class="text-xs text-on-surface leading-relaxed font-medium animate-pulse">Analyzing spatial data...</p>
    </div>
  `;"""

js = re.sub(r"typingIndicator\.className = [^;]+;\s*typingIndicator\.innerHTML = [^;]+;", new_typing, js)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
