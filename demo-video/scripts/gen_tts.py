import pathlib, subprocess, json, sys
base = pathlib.Path("demo-video/scripts")
text = (base/"narration.txt").read_text(encoding="utf-8")
# split by lines starting with NN_
segments = []
cur_name=None; cur=[]
for line in text.splitlines():
    if len(line)>3 and line[2]=="_" and line[:2].isdigit():
        if cur_name: segments.append((cur_name, "\n".join(cur).strip()))
        cur_name=line.split(":",1)[0].strip()
        cur=[line.split(":",1)[1].strip()] if ":" in line else []
    else:
        cur.append(line)
if cur_name: segments.append((cur_name, "\n".join(cur).strip()))
outdir = pathlib.Path("demo-video/assets/voice"); outdir.mkdir(parents=True, exist_ok=True)
for name, body in segments:
    txt = base/f"{name}.txt"; txt.write_text(body, encoding="utf-8")
    wav = outdir/f"{name}.wav"
    print(f"TTS {name} ({len(body.split())} words) -> {wav}")
    r = subprocess.run(["npx","hyperframes","tts", str(txt), "-o", str(wav), "-v","am_adam","-s","0.96","--json"], capture_output=True, text=True)
    print(r.stdout[-500:]); print(r.stderr[-500:])
    if r.returncode!=0: sys.exit(1)
print("OK", len(segments))
