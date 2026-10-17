"""cues.json for the .srt, from the page's own events (the same intervals the page burns in)."""
import json, os, sys
D = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ev = json.load(open(os.path.join(D, 'events.json')))['ev']
lines = {l['id']: l['sub'] for l in json.load(open(os.path.join(D, 'voice/lines.json')))}
cues = [{'t0': e['t'], 't1': round(e['t'] + max(1.8, e['dur'] + 0.6), 3), 'text': lines[e['id']]} for e in ev if e['type'] == 'vo']
json.dump(cues, open(os.path.join(D, 'cues.json'), 'w'), indent=1)
print(len(cues), 'cues')
