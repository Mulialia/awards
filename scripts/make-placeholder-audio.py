#!/usr/bin/env python3
"""
PLACEHOLDER soundtrack for the YORA nominee system.

Everything is synthesised from scratch with numpy (sine/FM tones + filtered noise + a synthetic
reverb), so there is NO third-party music or sample licensing involved. It is a timing-accurate
sketch of the sonic language (warm pad · gold bell tones · airy transitions) for review and
sync-testing — replace it with commissioned/licensed audio before the ceremony.

Usage:  python3 scripts/make-placeholder-audio.py [categoryId | nominee_count] [out.wav]
Timing: reads src/data/timing.json; cue frames below mirror src/utils/timing.ts (keep in sync).

First argument is either a CATEGORY ID (default: every category in awards.json gets its own
master at out/audio/<categoryId>-soundtrack.wav, sized to that category's nominee count) or a
plain nominee count for the legacy single-file output.
"""
import json, sys, wave
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000
T = json.load(open('src/data/timing.json', encoding='utf-8'))
FPS, INTRO, NOMF, ROST = T['fps'], T['introFrames'], T['nomineeFrames'], T['rosterFrames']

AWARDS = json.load(open('src/data/awards.json', encoding='utf-8'))
CATS = {c['id']: c for c in AWARDS['categories']}
arg = sys.argv[1] if len(sys.argv) > 1 else AWARDS['categories'][0]['id']
if arg in CATS:                      # per-category master (recommended)
    N = len(CATS[arg]['nominees'])
    OUT = sys.argv[2] if len(sys.argv) > 2 else f'out/audio/{arg}-soundtrack.wav'
else:                                # legacy: bare nominee count
    N = int(arg)
    OUT = sys.argv[2] if len(sys.argv) > 2 else 'out/audio/placeholder-soundtrack.wav'
rng = np.random.default_rng(7)

total = (INTRO + N * NOMF + ROST) / FPS
L = np.zeros(int(total * SR) + SR * 2)
R = np.zeros_like(L)
t_of = lambda f: f / FPS

def put(sig, at, pan=0.0, gain=1.0):
    i = int(at * SR)
    n = min(len(sig), len(L) - i)
    if n <= 0: return
    l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
    L[i:i + n] += sig[:n] * gain * l * 1.41
    R[i:i + n] += sig[:n] * gain * r * 1.41

def env(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)

def bell(freq, dur=3.2, bright=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    mod = bright * 2.2 * np.exp(-t * 3.0) * np.sin(2 * np.pi * freq * 3.5 * t)
    s = np.sin(2 * np.pi * freq * t + mod) + 0.35 * np.sin(2 * np.pi * freq * 2.001 * t) * np.exp(-t * 2)
    return s * env(n, 0.004, 0.9)

def pluck(freq, dur=1.6):  # marimba-ish
    n = int(dur * SR); t = np.arange(n) / SR
    s = np.sin(2 * np.pi * freq * t) + 0.5 * np.sin(2 * np.pi * freq * 4 * t) * np.exp(-t * 14)
    return s * env(n, 0.002, 0.28)

def noise_sweep(dur, f0, f1, rise=True, q=0.9):
    n = int(dur * SR); x = rng.standard_normal(n); out = np.zeros(n)
    blocks = 40
    for b in range(blocks):
        a, e = b * n // blocks, (b + 1) * n // blocks
        fc = f0 * (f1 / f0) ** (b / (blocks - 1))
        sos = butter(2, [fc * 0.7, min(fc * 1.4, SR / 2 - 100)], btype='band', fs=SR, output='sos')
        out[a:e] = sosfilt(sos, x[a:e])
    t = np.linspace(0, 1, n)
    shape = np.sin(np.pi * t) ** (1.6 if rise else 1.0)
    shape = np.where(t < 0.8, (t / 0.8) ** 2, ((1 - t) / 0.2) ** 1.5) if rise else shape
    return out / (np.abs(out).max() + 1e-9) * shape

def sub_hit(f=48, dur=2.2):
    n = int(dur * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * (f + 40 * np.exp(-t * 9)) * t) * env(n, 0.003, 0.7)

# A minor pentatonic keeps everything consonant
A = {'A2': 110.0, 'E3': 164.81, 'A3': 220.0, 'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'G4': 392.0, 'A4': 440.0, 'C5': 523.25, 'E5': 659.25}

# ── warm pad bed ─────────────────────────────────────────────────────────────────────────────
n = len(L); t = np.arange(n) / SR
pad = np.zeros(n)
for f, g in [(55.0, 0.55), (82.41, 0.4), (110.0, 0.35), (164.81, 0.18), (220.0, 0.12)]:
    for det in (-0.6, 0.0, 0.7):
        pad += g * np.sin(2 * np.pi * (f + det) * t + rng.uniform(0, 6.28))
pad *= 0.5 + 0.5 * (0.6 + 0.4 * np.sin(2 * np.pi * t / 9.0))
fade = np.minimum(1, t / 3) * np.minimum(1, np.maximum(0, (total - t)) / 2.5)
pad *= fade * 0.05
L += pad; R += np.roll(pad, 240)

# ── category introduction ────────────────────────────────────────────────────────────────────
put(sub_hit(46), t_of(8), gain=0.5)
put(bell(A['A4'], 4.5), t_of(14), pan=-0.15, gain=0.16)             # logo
put(bell(A['E5'], 4.0, 0.7), t_of(18), pan=0.2, gain=0.07)
put(noise_sweep(2.2, 400, 5200, True), t_of(40), gain=0.16)          # ideas converge
for i, (nt, fr) in enumerate([('A3', 80), ('C4', 90), ('E4', 100)]):  # title reveal arpeggio
    put(pluck(A[nt], 2.4), t_of(fr), pan=-0.3 + 0.3 * i, gain=0.22)
put(bell(A['A4'], 4.0), t_of(112), gain=0.14)                         # "AWARD"
put(sub_hit(41, 2.6), t_of(112), gain=0.4)
put(noise_sweep(0.9, 6000, 900, False), t_of(126), gain=0.12)         # hairline returns

# ── nominees (cue frames mirror NOM in src/utils/timing.ts — 150-frame scene) ─────────────────
phrase = ['A4', 'C5', 'G4', 'E5', 'D4']  # varied sparkle per nominee (cycled)
for i in range(N):
    base = INTRO + i * NOMF
    S = lambda f: t_of(base + f)
    put(noise_sweep(0.7, 700, 4200, True), S(2), gain=0.09)             # hairline collapse / frame draws
    put(noise_sweep(1.5, 300, 3000, True), S(12), gain=0.13)            # portrait reveal (portraitWipe 10–40)
    put(sub_hit(44, 1.8), S(26), gain=0.38)                              # name lands (nameStart 26)
    put(bell(A[phrase[i % len(phrase)]], 3.6), S(26), pan=0.1, gain=0.17)
    put(pluck(A['E4'], 1.8), S(30), pan=-0.2, gain=0.09)
    put(pluck(A['A3'], 1.8), S(34), pan=0.25, gain=0.08)
    put(pluck(A['C5'], 1.2), S(56), pan=0.3, gain=0.06)                 # identity appears (identityStart 56)
    put(pluck(A['G4'], 1.2), S(66), pan=-0.3, gain=0.05)
    put(noise_sweep(1.3, 3800, 500, False), S(110), gain=0.11)          # exit (exitStart 108)
    put(noise_sweep(0.95, 700, 5500, True), S(130), gain=0.08)          # hairline redraws (hairlineOut 128)

# ── closing roster ────────────────────────────────────────────────────────────────────────────
rb = INTRO + N * NOMF
RS = lambda f: t_of(rb + f)
put(noise_sweep(0.7, 700, 4200, True), RS(2), gain=0.09)
put(sub_hit(46, 2.0), RS(8), gain=0.35)
put(bell(A['A4'], 4.0), RS(10), gain=0.14)
for i in range(N):                                                       # one soft pluck per row
    put(pluck(A[['A3','C4','E4','G4','A4','C5','D4'][i % 7]], 1.4), RS(34 + i * 8), pan=-0.3 + 0.6 * (i % 3) / 2, gain=0.1)
put(bell(A['E4'], 5.0), RS(34 + N * 8 + 14), gain=0.12)                  # resolve
put(bell(A['A4'], 5.5, 0.6), RS(34 + N * 8 + 18), gain=0.1)
# No exit cues: the roster holds on the full nominee list through the final frame.

# ── space & master ───────────────────────────────────────────────────────────────────────────
def reverb(x, secs=2.8, seed=1):
    r = np.random.default_rng(seed); m = int(secs * SR)
    ir = r.standard_normal(m) * np.exp(-np.arange(m) / (SR * secs / 4.5))
    sos = butter(1, 5500, btype='low', fs=SR, output='sos'); ir = sosfilt(sos, ir)
    return fftconvolve(x, ir / np.sqrt((ir ** 2).sum()), mode='full')[:len(x)]

wetL, wetR = reverb(L, seed=1), reverb(R, seed=2)
L2, R2 = L * 0.78 + wetL * 0.32, R * 0.78 + wetR * 0.32
end = int(total * SR)
L2, R2 = L2[:end], R2[:end]
peak = max(np.abs(L2).max(), np.abs(R2).max())
g = 0.7 / peak  # peak ≈ −3 dBFS
st = np.stack([L2 * g, R2 * g], axis=1)
import os
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with wave.open(OUT, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(st, -1, 1) * 32767).astype('<i2').tobytes())
print(f'wrote {OUT}  ({total:.1f}s, {N} nominees, 48 kHz stereo)')
