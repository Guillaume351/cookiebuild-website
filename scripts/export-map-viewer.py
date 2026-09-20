"""Export offline BlueMap renders only; never publish world/player data.
Usage: python3 scripts/export-map-viewer.py SOURCE_WEB [SOURCE_WEB ...]
"""
import argparse, json, shutil, hashlib, re, gzip
from pathlib import Path
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('sources', nargs='+', type=Path)
args=parser.parse_args()
target=Path(__file__).resolve().parents[1]/'public/map-viewer'
target.mkdir(parents=True,exist_ok=True)
ids=[]
for source in args.sources:
 for folder in ['assets','lang']:
  shutil.copytree(source/folder,target/folder,dirs_exist_ok=True)
 settings=json.loads((source/'settings.json').read_text())
 metadata_path=source.parent/'catalog.json'
 metadata={e['id']:e for e in json.loads(metadata_path.read_text())} if metadata_path.exists() else {}
 for mid in settings['maps']:
  if mid in ['oasis','ruins','canyon']: continue  # superseded prototype drafts
  src=source/'maps'/mid
  dest=target/'maps'/mid
  dest.mkdir(parents=True,exist_ok=True)
  for child in src.iterdir():
   if child.name not in ['tiles','hires','lowres','textures.json.gz','textures.json','settings.json']: continue
   if child.is_dir(): shutil.copytree(child,dest/child.name,dirs_exist_ok=True)
   else: shutil.copyfile(child,dest/child.name)
  if mid in metadata:
   meta=metadata[mid]
   map_settings=json.loads((dest/'settings.json').read_text())
   map_settings['startPos']=[meta['center'][0],meta['center'][2]]
   if mid.startswith('skywars_legacy_'):
    map_settings['name']='SkyWars — Sky Arena '+mid.rsplit('_',1)[-1]
   (dest/'settings.json').write_text(json.dumps(map_settings,separators=(',',':')))
  # BlueMap polls these static endpoints. Always empty, never copied from a live server.
  live=dest/'live';live.mkdir(exist_ok=True)
  (live/'players.json').write_text('[]')
  (live/'markers.json').write_text('{}')
  ids.append(mid)
 html=re.sub(r'<script>window.nomadInitialHash=window.location.hash;</script>', '', (source/'index.html').read_text())
 html=html.replace('<head>', '<head><script src="./nomad-init.js"></script>')
 html=html.replace('<title>BlueMap</title>','<title>Cookie Build — Map viewer</title>').replace('content="index,nofollow"','content="noindex,nofollow"')
 (target/'index.html').write_text(html)
settings.update(maps=sorted(set(ids)),useCookies=False,clientDecompression=False,resolutionDefault=1,hiresSliderDefault=500,lowresSliderDefault=0,lowresSliderMin=0,scripts=['nomad-view.js'])
(target/'settings.json').write_text(json.dumps(settings,separators=(',',':')))
(target/'nomad-init.js').write_text('window.nomadInitialHash=window.location.hash;')
(target/'nomad-view.js').write_text('''// BlueMap loads custom scripts after its map. Cancel the deferred initial camera animation.
const initial = (window.nomadInitialHash || '').slice(1).split(':');
const app = window.bluemap;
if (initial.length === 10 && app?.mapViewer.map?.data.id === initial[0]) {
  app.viewAnimation?.cancel();
  const controls = app.mapViewer.controlsManager;
  controls.position.set(Number(initial[1]), Number(initial[2]), Number(initial[3]));
  ['distance', 'rotation', 'angle', 'tilt', 'ortho'].forEach((key, i) => { controls[key] = Number(initial[i + 4]); });
  controls.controls = initial[9] === 'free' ? app.freeFlightControls : app.mapControls;
  app.appState.controls.state = initial[9];
  app.updatePageAddress();
  app.mapViewer.updateLoadedMapArea();
}
''')
# Nitro handles HTTP content encoding; publish ordinary files to avoid double decompression.
for packed in target.rglob('*.gz'):
 packed.with_suffix('').write_bytes(gzip.decompress(packed.read_bytes()))
 packed.unlink()
manifest={p.relative_to(target).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(target.rglob('*')) if p.is_file() and p.name!='manifest.json'}
(target/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(f'Exported {len(set(ids))} maps, {len(manifest)} static files. No world or player data.')
