"""Score + sound design + VO mix for the Trim Formworks 30s showreel.

Music is synthesised here (120 BPM, D minor) so every downbeat lands on a cut.
VO and SFX are ElevenLabs generations, placed against the edit's cue sheet.
"""
import subprocess, sys, json
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR = 44100
DUR = 30.0
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


# chords: Dm  Bb  F  C   (i VI III VII), one per bar (2 s)
CHORDS = [[50, 53, 57], [46, 50, 53], [41, 45, 48], [48, 52, 55]]
ROOTS = [38, 34, 41, 36]


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
                f = note(n_ + det)
                s = saw(f, tt, phase=rng.random())
                out[seg, 0] += s * (1 - pan * 0.6)
                out[seg, 1] += s * (0.4 + pan * 0.6)
    out = lp(out, cutoff, 2) * gain / 6
    # soften bar changes
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
    filt = lp(s * env, cutoff)
    return st(np.tanh(filt * 1.4) * 0.42)


def pluck(midi, dur=0.35, cutoff=3200):
    t = tvec(dur)
    s = (saw(note(midi), t) + 0.5 * np.sign(np.sin(2 * np.pi * note(midi) * 2 * t))) * np.exp(-t * 11)
    return st(lp(s, cutoff) * 0.12)


# ---------------------------------------------------------------- arrangement
drums, bass, pads, arp, fx = bus(), bus(), bus(), bus(), bus()
K, C, HC, HO = kick(), clap(), hat(), hat(True)

FULL = [(4.0, 16.0), (20.0, 23.5), (24.0, 28.0)]
HALF = [(16.0, 20.0)]
kick_times = []


def in_any(t, spans):
    return any(a <= t < b for a, b in spans)


for i in range(int(DUR / 0.125)):
    t = i * 0.125
    beat_pos = (t / BEAT) % 4
    if in_any(t, FULL):
        if abs(t / BEAT - round(t / BEAT)) < 1e-6:
            place(drums, K, t, 1.0); kick_times.append(t)
            if round(beat_pos) in (1, 3):
                place(drums, C, t, 0.9)
        place(drums, HC, t, 0.55 if (i % 2) else 0.3)
        if abs(((t / BEAT) % 1) - 0.5) < 1e-6:
            place(drums, HO, t, 0.5)
    elif in_any(t, HALF):
        if abs(beat_pos) < 1e-6 or abs(beat_pos - 2.5) < 1e-6:
            place(drums, K, t, 0.75); kick_times.append(t)
        if abs(beat_pos - 2) < 1e-6:
            place(drums, C, t, 0.6)
        if i % 2 == 1:
            place(drums, HC, t, 0.35)
    elif t < 4.0 and t >= 2.0 and i % 2 == 1:
        place(drums, HC, t, 0.12 + 0.25 * (t - 2) / 2)

# snare roll into the clients drop (19 -> 20) and into the end card (23 -> 23.5)
for a, b in ((19.0, 20.0), (22.75, 23.5)):
    n = 16
    for k in range(n):
        tt = a + (b - a) * (1 - (1 - k / n) ** 1.6)
        place(drums, C, tt, 0.25 + 0.6 * k / n)

# bass: driving 8ths on the root, sidechained by the kick
for i in range(int(DUR / 0.25)):
    t = i * 0.25
    if in_any(t, FULL):
        r = ROOTS[chord_at(t)]
        place(bass, bass_note(r + (12 if i % 4 == 3 else 0), 0.24, 1100), t)
    elif in_any(t, HALF) and i % 4 == 0:
        place(bass, bass_note(ROOTS[chord_at(t)], 0.95, 500), t, 0.8)
# intro sub drone
t = tvec(4.0)
place(bass, st(np.sin(2 * np.pi * note(26) * t) * np.minimum(1, t / 1.5) * 0.35), 0.0)

# pads: dark intro opening up, bright under the drops, wide in the end card
place(pads, pad_layer(0, 4, 500, 0.15) * np.minimum(1, tvec(4) / 2.5)[:, None], 0.0)
place(pads, pad_layer(4, 16, 1400, 0.13), 4.0)
place(pads, pad_layer(16, 20, 2200, 0.16), 16.0)
place(pads, pad_layer(20, 24, 1600, 0.13), 20.0)
endpad = pad_layer(24, 30, 1800, 0.19)
endpad *= np.clip((30 - (24 + tvec(6))) / 2.0, 0, 1)[:, None]
place(pads, endpad, 24.0)

# arp: 16th chord tones from the stats section on, featured in the product breakdown
for i in range(int(DUR / 0.125)):
    t = i * 0.125
    if 8.0 <= t < 23.5 or 24.0 <= t < 28.0:
        ch = CHORDS[chord_at(t)]
        seq = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[1] + 24]
        g = 1.2 if 16 <= t < 20 else 0.75
        place(arp, pluck(seq[i % 4], 0.3, 2400 if t < 16 else 3800), t, g)
# ping-pong delay on the arp (dotted 8th)
d = int(0.375 * SR)
dl = np.zeros_like(arp)
dl[d:, 1] += arp[:-d, 0] * 0.45
dl[2 * d:, 0] += arp[:-2 * d, 1] * 0.3
arp = arp + dl

# sidechain pump
duck = np.ones(N, np.float32)
for kt in kick_times:
    i = int(kt * SR)
    tt = tvec(0.3)
    seg = 1 - 0.65 * np.exp(-tt / 0.09)
    n = min(len(seg), N - i)
    duck[i:i + n] = np.minimum(duck[i:i + n], seg[:n])
bass *= duck[:, None]
pads *= duck[:, None] ** 0.7
arp *= duck[:, None] ** 0.5

# final hits
place(drums, K, 24.0, 1.2)
place(fx, boom(), 4.0, 0.7)
place(fx, boom(), 24.0, 0.9)
place(fx, crash(), 4.0, 0.9)
place(fx, crash(), 20.0, 0.6)
place(fx, crash(), 24.0, 1.0)
place(fx, noise_riser(2.0), 2.0, 0.6)
place(fx, noise_riser(1.0), 19.0, 0.45)
place(fx, noise_riser(1.5), 22.5, 0.7)
place(drums, K, 28.0, 0.9)
place(drums, C, 28.0, 0.5)

# UI ticks: odometer, counters, clicks, card lands
for k in range(14):
    place(fx, tick(3200, g=0.12), 0.6 + k * 0.07 * (1 + k * 0.08))
for k in range(26):
    place(fx, tick(2600 + 40 * k, g=0.09), 8.25 + 1.9 * (1 - np.sqrt(1 - k / 26)))
for k in range(16):
    place(fx, tick(3000 + 60 * k, g=0.08), 10.72 + 1.2 * (1 - np.sqrt(1 - k / 16)))
for tt in (17.93, 28.72):
    place(fx, tick(1800, 0.05, 0.5), tt)
    place(fx, tick(5200, 0.02, 0.25), tt + 0.06)
for k in range(4):
    place(fx, tick(900, 0.08, 0.35), 19.95 + k * 0.25)

music = drums * 0.9 + bass * 1.0 + pads * 1.0 + arp * 0.9
music = reverb(music, 1.4, 0.12, seed=3)
fx = reverb(fx, 1.8, 0.18, seed=5)

# ---------------------------------------------------------------- ElevenLabs SFX
A = lambda gid: load(f"{AUD}/{gid}.mp3")
WH = [A(g) for g in ("H1hEQlGxUJKgA4OLXjda", "OArJiwJWNvETEBVGZbEs", "R8bajHRAipK6FoxKrXNf", "ZHHSqLDIV08YSFkCTM28")]
sfx = bus()
place(sfx, A("bS7RzA7EsCyDQQ5NsPan"), 4.0 - 2.04, 0.55)          # riser into the first slam
place(sfx, A("EgKe3QnxKo05aYAvcMLK"), 4.0, 0.9, align_peak=True)  # SHUTTERING slam
place(sfx, A("a6UmrhD4YhlaS9wk3Wlt"), 5.5, 0.7, align_peak=True)  # REINFORCED slam
place(sfx, A("3cZb1GlP8RszHT7Uxke9"), 24.0 - 1.04, 0.5)          # riser into end card
place(sfx, A("QkFpB6xe0kmogdI0kZdF"), 24.0, 1.0, align_peak=True)  # TRIM FORMWORKS hit
for k, (tt, g) in enumerate([(5.4, .55), (7.75, .6), (12.45, .65), (13.45, .35), (14.45, .35), (14.95, .3),
                             (15.55, .45), (16.42, .55), (19.25, .5), (23.5, .6)]):
    place(sfx, WH[k % 4], tt, g, align_peak=True)

# ---------------------------------------------------------------- voice-over
vo_src = load(f"{AUD}/nlFAU1GsrhBF8yYsUpwF.mp3")
CUES = [  # (src_start, src_end, timeline_start)
    (0.00, 3.32, 0.55), (3.32, 4.66, 3.92), (4.66, 6.08, 5.49), (6.08, 8.62, 8.08),
    (8.62, 10.47, 10.57), (10.47, 13.24, 12.72), (13.24, 15.80, 20.21), (15.80, 17.10, 24.03),
    (17.10, 19.10, 25.53), (19.10, 20.35, 27.66),
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
# gentle presence lift + compression-ish saturation
vo = vo + bp(vo, 2500, 6000) * 0.25
vo = np.tanh(vo * 1.6) / np.tanh(1.6)
vo = reverb(vo, 0.9, 0.06, seed=11)

# duck music under the VO
env = np.abs(vo).max(1)
k = int(0.08 * SR)
env = np.convolve(env, np.ones(k) / k, mode="same")
env = np.clip(env / (env.max() * 0.25), 0, 1)
gain = 1 - 0.8 * env
music_d = music * gain[:, None]

mix = music_d * 0.55 + fx * 0.5 + sfx * 0.6 + vo * 1.0
# fade tail
tail = int(0.6 * SR)
mix[-tail:] *= np.linspace(1, 0, tail)[:, None] ** 1.5
mix = np.tanh(mix * 1.1) * 0.95
mix /= np.abs(mix).max() / 0.97

import wave
pcm = (np.clip(mix, -1, 1) * 32767).astype("<i2")
with wave.open(OUT, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
json.dump({"cues": CUES}, open(OUT + ".json", "w"))
print("wrote", OUT)
