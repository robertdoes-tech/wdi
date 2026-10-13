"""Score + sound design + VO mix for the WDI 45s showreel.

Music is synthesised here (120 BPM, A minor, vi-IV-I-V) so downbeats land on the cuts.
VO and SFX are ElevenLabs generations placed against the edit's cue sheet (see README).
"""
import subprocess, sys, json
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR = 44100
DUR = 45.0
N = int(SR * DUR)
BEAT = 0.5          # 120 BPM
rng = np.random.default_rng(7)
AUD = sys.argv[1] if len(sys.argv) > 1 else "audio"
OUT = sys.argv[2] if len(sys.argv) > 2 else "build/mix.wav"


def load(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()


def bus():
    return np.zeros((N, 2), np.float32)


def place(dst, clip, t, gain=1.0, align_peak=False):
    if align_peak:
        env = np.abs(clip).max(1)
        t -= np.argmax(env) / SR
    i = int(round(t * SR))
    if i < 0:
        clip, i = clip[-i:], 0
    n = min(len(clip), N - i)
    if n > 0:
        dst[i:i + n] += clip[:n] * gain


def lp(x, f, order=2):
    return sosfilt(butter(order, f, "low", fs=SR, output="sos"), x, axis=0)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x, axis=0)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x, axis=0)


def st(m, w=0.0):
    """mono -> stereo, optional width via tiny delay"""
    m = m.astype(np.float32)
    if w <= 0:
        return np.stack([m, m], 1)
    d = int(w * SR)
    r = np.concatenate([np.zeros(d, np.float32), m[:-d]])
    return np.stack([m, r], 1)


def tvec(sec):
    return np.arange(int(sec * SR)) / SR


def saw(freq, t, phase=0.0):
    p = (freq * t + phase) % 1.0
    return 2 * p - 1


def note(n):  # midi -> Hz
    return 440.0 * 2 ** ((n - 69) / 12)


def reverb(x, sec=1.8, mix=0.25, seed=1):
    r = np.random.default_rng(seed)
    n = int(sec * SR)
    env = np.exp(-np.linspace(0, 7, n))
    ir = np.stack([r.standard_normal(n) * env, r.standard_normal(n) * env], 1)
    ir = lp(ir, 6000)
    ir /= np.sqrt((ir ** 2).sum(0))
    wet = np.stack([fftconvolve(x[:, c], ir[:, c])[:len(x)] for c in range(2)], 1)
    return x * (1 - mix) + wet * mix * 3


# ---------------------------------------------------------------- instruments
def kick():
    t = tvec(0.5)
    f = 45 + 95 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 7.5)
    click = hp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 300) * 0.25
    return st(np.tanh((body + click) * 1.6) * 0.9)


def clap():
    t = tvec(0.45)
    n = bp(rng.standard_normal(len(t)), 900, 3200)
    env = np.zeros_like(t)
    for o in (0, 0.011, 0.022):
        env += (t >= o) * np.exp(-np.clip(t - o, 0, None) * (60 if o < 0.02 else 14))
    return st(n * env * 0.55, 0.008)


def hat(open_=False):
    t = tvec(0.3 if open_ else 0.08)
    n = hp(rng.standard_normal(len(t)), 7500, 4)
    return st(n * np.exp(-t * (14 if open_ else 70)) * 0.22)


def crash():
    t = tvec(2.5)
    n = hp(rng.standard_normal(len(t)), 4500, 2)
    return st(n * np.exp(-t * 1.6) * 0.28, 0.011)


def boom(sec=2.2):
    t = tvec(sec)
    f = 32 + 60 * np.exp(-t * 6)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.8)
    return st(np.tanh(s * 2.2) * 0.8)


def tick(f=2400, dur=0.03, g=0.25):
    t = tvec(dur)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t * 180) + hp(rng.standard_normal(len(t)), 5000) * np.exp(-t * 400) * 0.4
    return st(s * g)


def noise_riser(sec):
    t = tvec(sec)
    n = rng.standard_normal(len(t))
    # sweep by crossfading 6 band-passed layers
    out = np.zeros_like(t)
    bands = [(300, 900), (700, 1800), (1500, 3500), (3000, 6500), (5000, 10000), (8000, 16000)]
    pos = (t / sec) * (len(bands) - 1)
    for k, (lo, hi) in enumerate(bands):
        w = np.clip(1 - np.abs(pos - k), 0, 1)
        out += bp(n, lo, hi) * w
    return st(out * (t / sec) ** 2.2 * 0.5, 0.013)


# chords: Am  F  C  G  (vi IV I V), one per bar (2 s)
CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
ROOTS = [33, 29, 36, 31]


def chord_at(t):
    return int(t // 2.0) % 4


def pad_layer(t0, t1, cutoff, gain=0.16):
    t = tvec(t1 - t0)
    out = np.zeros((len(t), 2))
    for bar_start in np.arange(t0, t1, 2.0):
        ci = chord_at(bar_start + 1e-6)
        seg = (t + t0 >= bar_start) & (t + t0 < bar_start + 2.0)
        tt = t[seg]
        for n_ in CHORDS[ci] + [CHORDS[ci][0] + 12]:
            for det, pan in ((-0.09, 0), (0.0, 0.5), (0.1, 1)):
                s = saw(note(n_ + det), tt, phase=rng.random())
                out[seg, 0] += s * (1 - pan * 0.6)
                out[seg, 1] += s * (0.4 + pan * 0.6)
    out = lp(out, cutoff, 2) * gain / 6
    fade = int(0.04 * SR)
    for bar_start in np.arange(t0, t1, 2.0):
        i = int((bar_start - t0) * SR)
        if 0 < i < len(out):
            out[max(0, i - fade):i] *= np.linspace(1, 0.4, min(fade, i))[:, None]
            out[i:i + fade] *= np.linspace(0.4, 1, min(fade, len(out) - i))[:, None]
    return out.astype(np.float32)


def bass_note(midi, dur, cutoff=900):
    t = tvec(dur)
    s = saw(note(midi), t) * 0.6 + saw(note(midi) * 1.005, t) * 0.4
    s += np.sin(2 * np.pi * note(midi - 12) * t) * 0.8
    env = np.minimum(1, t / 0.004) * np.exp(-t * 5)
    return st(np.tanh(lp(s * env, cutoff) * 1.4) * 0.42)


def pluck(midi, dur=0.35, cutoff=3200):
    t = tvec(dur)
    s = (saw(note(midi), t) + 0.5 * np.sign(np.sin(2 * np.pi * note(midi) * 2 * t))) * np.exp(-t * 11)
    return st(lp(s, cutoff) * 0.12)


def stab(ci, dur=0.5):
    t = tvec(dur)
    s = sum(saw(note(n + 12), t, rng.random()) for n in CHORDS[ci]) * np.exp(-t * 6)
    return st(lp(s, 3500) * 0.09, 0.012)


def glitch(sec=0.4):
    t = tvec(sec)
    sq = np.sign(np.sin(2 * np.pi * 180 * t * (1 + 3 * (t * 7 % 1))))
    gate = (np.floor(t * 40) % 2)
    return st(lp(sq * gate, 5000) * 0.18 * np.exp(-t * 3))


# ---------------------------------------------------------------- arrangement (see README cue sheet)
drums, bass, pads, arp, fx = bus(), bus(), bus(), bus(), bus()
K, C, HC, HO = kick(), clap(), hat(), hat(True)
FULL = [(4.0, 8.4), (14.0, 20.0), (28.0, 34.5), (35.0, 37.5)]
GROOVE = [(8.5, 14.0)]
HALF = [(21.0, 25.3), (38.5, 43.0)]
SILENT = [(27.72, 28.0)]
kick_times = []


def in_any(t, spans):
    return any(a <= t < b for a, b in spans)


for i in range(int(DUR / 0.125)):
    t = i * 0.125
    bp_ = (t / BEAT) % 4
    on_beat = abs(t / BEAT - round(t / BEAT)) < 1e-6
    if in_any(t, FULL):
        if on_beat:
            place(drums, K, t); kick_times.append(t)
            if round(bp_) in (1, 3):
                place(drums, C, t, 0.9)
        place(drums, HC, t, 0.55 if i % 2 else 0.3)
        if abs(((t / BEAT) % 1) - 0.5) < 1e-6:
            place(drums, HO, t, 0.5)
    elif in_any(t, GROOVE):
        if on_beat:
            place(drums, K, t, 0.85); kick_times.append(t)
        if i % 2 == 1:
            place(drums, HC, t, 0.4)
        if abs(bp_ - 3) < 1e-6:
            place(drums, C, t, 0.5)
    elif in_any(t, HALF):
        if abs(bp_) < 1e-6 or abs(bp_ - 2.5) < 1e-6:
            place(drums, K, t, 0.75); kick_times.append(t)
        if abs(bp_ - 2) < 1e-6:
            place(drums, C, t, 0.6)
        if i % 2 == 1:
            place(drums, HC, t, 0.3)
    elif 2.0 <= t < 4.0 and i % 2 == 1:
        place(drums, HC, t, 0.12 + 0.25 * (t - 2) / 2)

# snare rolls into the wipes / drop
for a, b, n in ((20.0, 21.0, 16), (26.68, 27.68, 24), (37.0, 38.0, 16)):
    for k in range(n):
        place(drums, C, a + (b - a) * (1 - (1 - k / n) ** 1.6), 0.2 + 0.6 * k / n)

for i in range(int(DUR / 0.25)):
    t = i * 0.25
    if in_any(t, FULL) or in_any(t, GROOVE):
        place(bass, bass_note(ROOTS[chord_at(t)] + (12 if i % 4 == 3 else 0), 0.24, 1100 if in_any(t, FULL) else 700), t)
    elif in_any(t, HALF) and i % 4 == 0:
        place(bass, bass_note(ROOTS[chord_at(t)], 0.95, 500), t, 0.8)
t = tvec(4.0)
place(bass, st(np.sin(2 * np.pi * note(21) * t) * np.minimum(1, t / 1.5) * 0.35), 0.0)

p0 = pad_layer(0, 4, 500, 0.15)
place(pads, p0 * np.minimum(1, np.arange(len(p0)) / SR / 2.5)[:, None], 0.0)
place(pads, pad_layer(4, 14, 1400, 0.12), 4.0)
place(pads, pad_layer(14, 21, 1800, 0.13), 14.0)
bp21 = pad_layer(21, 27.7, 900, 0.15)
place(pads, bp21 * np.linspace(.7, 1.3, len(bp21))[:, None], 21.0)
place(pads, pad_layer(28, 38, 2200, 0.14), 28.0)
endpad = pad_layer(38, 45, 1800, 0.19)
endpad *= np.clip((45 - (38 + np.arange(len(endpad)) / SR)) / 1.5, 0, 1)[:, None]
place(pads, endpad, 38.0)

for i in range(int(DUR / 0.125)):
    t = i * 0.125
    if 8.5 <= t < 20.0 or 28.0 <= t < 37.5 or 39.0 <= t < 43.0:
        ch = CHORDS[chord_at(t)]
        seq = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[1] + 24]
        g = 1.25 if 28 <= t < 35 else (0.5 if t >= 39 else 0.75)
        place(arp, pluck(seq[i % 4], 0.3, 2400 if t < 28 else 3800), t, g)
d = int(0.375 * SR)
dl = np.zeros_like(arp)
dl[d:, 1] += arp[:-d, 0] * 0.45
dl[2 * d:, 0] += arp[:-2 * d, 1] * 0.3
arp = arp + dl

duck = np.ones(N, np.float32)
for kt in kick_times:
    i = int(kt * SR); tt = tvec(0.3)
    seg = 1 - 0.65 * np.exp(-tt / 0.09)
    n = min(len(seg), N - i)
    duck[i:i + n] = np.minimum(duck[i:i + n], seg[:n])
bass *= duck[:, None]; pads *= duck[:, None] ** 0.7; arp *= duck[:, None] ** 0.5

# silence the beat for the "gone" gap
for a, b in SILENT:
    g = np.ones(N, np.float32); i, j = int(a * SR), int(b * SR)
    g[i:j] = 0.0
    for bus_ in (drums, bass, arp):
        bus_ *= g[:, None]
    pads[i:j] *= 0.25

# hits
for tt, s in ((4.0, .8), (28.0, 1.0), (38.0, .9)):
    place(drums, K, tt, 1.2); place(fx, boom(), tt, s); place(fx, crash(), tt, s)
for tt in (8.5, 12.0, 14.0, 15.0, 16.0, 17.0, 18.0, 22.85, 23.6, 24.45, 30.0, 35.0):
    place(fx, boom(0.9), tt, 0.35); place(fx, stab(chord_at(tt)), tt, 1.0)
place(fx, crash(), 18.0, 0.5); place(fx, crash(), 14.0, 0.45)
place(fx, noise_riser(2.0), 2.0, 0.6)
place(fx, noise_riser(2.2), 25.5, 0.75)
place(fx, noise_riser(1.0), 37.0, 0.45)
place(fx, glitch(0.4), 3.35, 1.0)
# paper burst on "gone"
t = tvec(0.6); place(fx, st(hp(rng.standard_normal(len(t)), 1500) * np.exp(-t * 9) * 0.5, 0.01), 27.68)

# UI ticks: counters, calendar, cuts, client tiles, click, typing
for k in range(28):
    place(fx, tick(2600 + 40 * k, g=0.09), 8.9 + 1.45 * (1 - np.sqrt(1 - k / 28)))
for k in range(24):
    place(fx, tick(3000 + 50 * k, g=0.08), 12.2 + 1.3 * (1 - np.sqrt(1 - k / 24)))
for k in range(24):
    place(fx, tick(2200 + 60 * k, g=0.07), 25.5 + 1.1 * (1 - np.sqrt(1 - k / 24)))
for k in range(9):
    place(fx, tick(1500 + 120 * k, 0.05, 0.25), 35.1 + k * .125)
for tt in (40.2,):
    place(fx, tick(1800, 0.05, 0.6), tt); place(fx, tick(5200, 0.02, 0.3), tt + 0.06)
for k in range(13):
    place(fx, tick(4200 + (k % 3) * 300, 0.02, 0.18), 41.0 + k * 1.2 / 13)

music = drums * 0.9 + bass * 1.0 + pads * 1.0 + arp * 0.9
music = reverb(music, 1.4, 0.12, seed=3)
fx = reverb(fx, 1.8, 0.18, seed=5)

# ---------------------------------------------------------------- ElevenLabs SFX
A = lambda n: load(f"{AUD}/{n}.mp3")
WH = [A(f"wh{k}") for k in (1, 2, 3, 4)]
sfx = bus()
place(sfx, A("riser1"), 4.0 - 1.0, 0.55)
place(sfx, A("riser1"), 28.0 - 1.0, 0.6)
for k, (tt, g) in enumerate([(3.8, .6), (5.45, .45), (8.35, .6), (11.65, .45), (17.95, .55), (20.8, .6), (22.85, .45), (23.6, .45),
                             (24.45, .45), (25.3, .4), (29.0, .35), (30.0, .5), (32.0, .3), (32.5, .25), (33.0, .3), (33.5, .25),
                             (34.0, .3), (34.6, .45), (37.8, .6), (44.3, .3)]):
    place(sfx, WH[k % 4], tt, g, align_peak=True)

# ---------------------------------------------------------------- voice-over
vo_src = load(f"{AUD}/vo_fqj7.mp3")
CUES = [  # (src_start, src_end, timeline_start) — word timings from ElevenLabs Scribe
    (0.00, 1.75, 0.35), (2.05, 3.85, 2.10), (4.25, 8.70, 3.90), (8.85, 11.85, 8.50), (12.00, 13.95, 12.00),
    (14.30, 14.85, 14.00), (14.95, 15.50, 15.00), (15.60, 16.36, 16.00), (16.38, 17.15, 17.00),
    (17.45, 20.25, 18.00), (20.40, 22.10, 21.00), (22.20, 24.60, 22.80), (24.70, 27.45, 25.40),
    (27.60, 28.50, 38.00), (28.65, 32.70, 39.00),
]
vo = bus()
f = int(0.012 * SR)
for a, b, at in CUES:
    seg = vo_src[int(a * SR):int(b * SR)].copy()
    seg[:f] *= np.linspace(0, 1, f)[:, None]
    seg[-f:] *= np.linspace(1, 0, f)[:, None]
    place(vo, seg, at)
vo = hp(vo, 80)
vo *= 0.9 / np.abs(vo).max()
vo = vo + bp(vo, 2500, 6000) * 0.25
vo = np.tanh(vo * 1.6) / np.tanh(1.6)
vo = reverb(vo, 0.9, 0.06, seed=11)

env = np.abs(vo).max(1)
k = int(0.08 * SR)
env = np.convolve(env, np.ones(k) / k, mode="same")
env = np.clip(env / (env.max() * 0.25), 0, 1)
music_d = music * (1 - 0.75 * env)[:, None]

mix = music_d * 0.55 + fx * 0.5 + sfx * 0.6 + vo * 1.0
tail = int(0.8 * SR)
mix[-tail:] *= np.linspace(1, 0, tail)[:, None] ** 1.5
mix = np.tanh(mix * 1.1) * 0.95
mix /= np.abs(mix).max() / 0.97

import wave
pcm = (np.clip(mix, -1, 1) * 32767).astype("<i2")
with wave.open(OUT, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
json.dump({"cues": CUES}, open(OUT + ".json", "w"))
print("wrote", OUT)
