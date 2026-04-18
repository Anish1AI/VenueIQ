import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Replace tailwind config colors with var(--color-X)
colors_block_match = re.search(r'"colors":\s*\{([^}]+)\}', html)
if colors_block_match:
    colors_str = colors_block_match.group(1)
    new_colors_str = re.sub(r'"([^"]+)":\s*"#[0-9a-fA-F]+"', r'"\1": "var(--color-\1)"', colors_str)
    html = html.replace(colors_str, new_colors_str)

# 2. Replace raw tailwind classes to add light/dark variants
replacements = {
    r'\bbg-slate-950/80\b': 'bg-white/80 dark:bg-slate-950/80',
    r'\bbg-slate-950\b': 'bg-slate-50 dark:bg-slate-950',
    r'\bbg-slate-900/50\b': 'bg-slate-100/50 dark:bg-slate-900/50',
    r'\bbg-slate-900\b': 'bg-slate-100 dark:bg-slate-900',
    r'\btext-white\b': 'text-slate-900 dark:text-white',
    r'\bhover:text-white\b': 'hover:text-slate-900 dark:hover:text-white',
    r'\btext-slate-400\b': 'text-slate-600 dark:text-slate-400',
    r'\btext-slate-500\b': 'text-slate-500 dark:text-slate-400', # Keep 500 for light, 400 for dark
}

for pattern, repl in replacements.items():
    html = re.sub(pattern, repl, html)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Updated index.html")
