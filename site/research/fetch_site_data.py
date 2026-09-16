import sys, json
sys.path.insert(0, r'C:\Users\Jan\AOP')
from research.feeds import fetch_all
data = fetch_all()
out = {
    'timestamp': __import__('datetime').datetime.now().isoformat(),
    'feeds': data
}
with open(r'C:\Users\Jan\Documents\rankfixer-website\site\research\latest.json', 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
print('OK')
