#!/usr/bin/env python3
"""Automated QA on a rendered category sequence (technical + data-accuracy + continuity).
Usage: python3 scripts/qa-check.py <sequence.mp4> <categoryId>"""
import json, subprocess, sys, os, tempfile
import numpy as np

mp4, cat_id = sys.argv[1], sys.argv[2]
T = json.load(open('src/data/timing.json'))
data = json.load(open('src/data/awards.json'))
cat = next(c for c in data['categories'] if c['id'] == cat_id)
INTRO, NOMF, FPS, ROST = T['introFrames'], T['nomineeFrames'], T['fps'], T['rosterFrames']
expected = INTRO + len(cat['nominees']) * NOMF + ROST
res = {}

# 1 ─ container / stream facts
pr = json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-count_frames','-show_entries',
    'stream=codec_name,profile,width,height,r_frame_rate,pix_fmt,nb_read_frames,duration,bit_rate','-of','json',mp4]))['streams'][0]
print('STREAM', json.dumps(pr))
ok = (pr['codec_name']=='h264' and pr['width']==T['width'] and pr['height']==T['height'] and pr['pix_fmt']=='yuv420p'
      and pr['r_frame_rate']==f"{T['fps']}/1" and int(pr['nb_read_frames'])==expected)
print(f"  expected {expected} frames @ {T['fps']} fps ({expected/FPS:.2f}s) → {'PASS' if ok else 'FAIL'}")
res['stream'] = ok

# 2 ─ every frame at 160×90 luma: black-frame + hard-cut detection
raw = subprocess.check_output(['ffmpeg','-v','error','-i',mp4,'-vf','scale=160:90,format=gray','-f','rawvideo','-'])
fr = np.frombuffer(raw, np.uint8).reshape(-1, 90, 160).astype(np.float32)
mean = fr.mean(axis=(1,2))
diff = np.abs(np.diff(fr, axis=0)).mean(axis=(1,2))
print(f"LUMA  min mean={mean.min():.1f} max mean={mean.max():.1f}  (a fully black frame would be < 2)")
res['no_black_frames'] = bool(mean.min() > 2.0)
print('  black/blank frames:', 'none' if res['no_black_frames'] else 'FOUND')
top = np.argsort(diff)[::-1][:6]
print('  largest frame-to-frame changes (frame→frame: Δ):', ', '.join(f"{i}→{i+1}: {diff[i]:.2f}" for i in top))
bounds = [INTRO + i*NOMF for i in range(len(cat['nominees']) + 1)]  # last = roster start
nom_bounds = bounds[:-1]
bd = [diff[b-1] for b in bounds]
print('  scene-boundary Δ (intro→n1, n1→n2, …):', ', '.join(f"{d:.2f}" for d in bd), f'| median Δ overall={np.median(diff):.2f}')
res['no_hard_cuts'] = bool(max(bd) < max(3.0, 4*np.median(diff)) and diff.max() < 6.0)
print('  hard cuts at boundaries:', 'none' if res['no_hard_cuts'] else 'CHECK')

# 3 ─ data accuracy via OCR of a mid-hold full-res frame per nominee
import pytesseract
from PIL import Image
allok = True
with tempfile.TemporaryDirectory() as d:
    for i, n in enumerate(cat['nominees']):
        g = nom_bounds[i] + (NOMF - 55)   # mid-hold: after Stage C settles, before Stage E exits
        p = os.path.join(d, f'{i}.png')
        subprocess.check_call(['ffmpeg','-v','error','-y','-i',mp4,'-vf',f'select=eq(n\\,{g})','-vframes','1',p])
        im = Image.open(p).convert('L')
        crop = im.crop((800, 280, 1850, 900)).point(lambda v: 255 - v)   # text column, inverted for OCR
        txt = ' '.join(pytesseract.image_to_string(crop).split()).lower()
        okn = all(w in txt for w in n['name'].lower().split()) and all(w.strip('&') in txt for w in n['business'].lower().split() if w != '&')
        allok &= okn
        print(f"OCR   nominee {i+1}: expect “{n['name']} / {n['business']}” → {'PASS' if okn else 'FAIL'}   [ocr: {txt[:90]}]")
# roster screen: every nominee name must be present
rg = bounds[-1] + 150
with tempfile.TemporaryDirectory() as d:
    p = os.path.join(d, 'r.png')
    subprocess.check_call(['ffmpeg','-v','error','-y','-i',mp4,'-vf',f'select=eq(n\\,{rg})','-vframes','1',p])
    im = Image.open(p).convert('L').crop((800, 180, 1860, 950)).point(lambda v: 255 - v)
    rt = ' '.join(pytesseract.image_to_string(im).split()).lower()
    rok = all(all(w in rt for w in n['name'].lower().split()) for n in cat['nominees'])
    print(f"OCR   roster lists all {len(cat['nominees'])} nominees → {'PASS' if rok else 'FAIL'}   [ocr: {rt[:110]}]")
    allok &= rok
res['ocr'] = allok
print('\nSUMMARY', json.dumps(res))
sys.exit(0 if all(res.values()) else 1)
