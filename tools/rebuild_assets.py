"""Repackage the supplied source art; does not call image generation or any API."""
from pathlib import Path
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[1]
(ROOT/'assets/frames').mkdir(parents=True,exist_ok=True)
(ROOT/'assets/stage').mkdir(parents=True,exist_ok=True)
for script in ['build_fighter_base.py','build_fighter_throw.py','build_bottle.py','build_stage.py','build_police.py','build_characters.py','build_demo.py']:
    subprocess.run([sys.executable,str(ROOT/'tools'/script)],cwd=ROOT,check=True)
print('Assets and demo rebuilt. Optional GIF: python3 tools/render_preview.py')
