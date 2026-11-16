"""Sync JSON data mirrors and create the standalone Fighter Lab demo (fighter-preview.html).

index.html es ahora el juego (game/) y NO se genera aquí.
"""
from pathlib import Path
import base64
import json

ROOT=Path(__file__).resolve().parents[1]
for json_file,js_file,global_name in [
    ('assets/fighter.json','assets/fighter-data.js','FIGHTER_DATA'),
    ('assets/bottle.json','assets/bottle-data.js','BOTTLE_DATA'),
    ('assets/stage/stage.json','assets/stage/stage-data.js','TERRACE_STAGE_DATA'),
    ('assets/police/police.json','assets/police/police-data.js','POLICE_DATA')]:
    data=json.loads((ROOT/json_file).read_text(encoding='utf-8'))
    (ROOT/js_file).write_text('window.'+global_name+' = '+json.dumps(data,separators=(',',':'),ensure_ascii=False)+';\n',encoding='utf-8')

html=(ROOT/'templates/index.template.html').read_text(encoding='utf-8')
for token,file in [
    ('DATA','assets/fighter-data.js'),('BOTTLE_DATA','assets/bottle-data.js'),
    ('ENGINE','src/fighter.js'),('BOTTLE_ENGINE','src/bottle.js'),
    ('STAGE_DATA','assets/stage/stage-data.js'),('STAGE_ENGINE','src/stage.js'),
    ('POLICE_DATA','assets/police/police-data.js'),('POLICE_ENGINE','src/police.js')]:
    html=html.replace('/*__'+token+'__*/',(ROOT/file).read_text(encoding='utf-8'))
for token,file in [('IMAGE','assets/fighter.png'),('BOTTLE_IMAGE','assets/bottle.png')]:
    html=html.replace('/*__'+token+'__*/','data:image/png;base64,'+base64.b64encode((ROOT/file).read_bytes()).decode())
for file in ['assets/stage/01-wall.png','assets/stage/02-tables.png','assets/stage/03-arena-floor.png',
             'assets/police/officer.png','assets/police/patrol-lights.png']:
    html=html.replace(file,'data:image/png;base64,'+base64.b64encode((ROOT/file).read_bytes()).decode())
if '/*__' in html:
    raise RuntimeError('A template resource marker was not resolved')
# index.html es el juego: aquí solo se generan las demos autónomas del kit.
for name in ['fighter-preview.html','police-preview.html']:
    (ROOT/name).write_text(html,encoding='utf-8')
print('Built fighter-preview.html and police-preview.html (Fighter Lab) from portable sources; index.html is the game')
