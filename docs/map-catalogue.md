# Offline map catalogue

The public catalogue contains 21 real map renders: 8 MicroBattles, 3 Pitchout, 4 SkyWars, BuildBattles, TurfWars, BedWars, and the 3 Nomad Wars previews. Personal Skyblock islands are excluded.

BlueMap 5.23 renders disposable copies of the configured arena ZIPs with Minecraft 26.1.2 resources. The legacy MicroBattles game-5 map and legacy chunks of game-2 require conversion before rendering; the source archive remains untouched. Nomad maps come from the versioned `NomadWars/maps` ZIPs in Cookies.

Export completed BlueMap web directories with:

```sh
python3 scripts/export-map-viewer.py /path/to/bluemap/web
```

The exporter copies only viewer assets, texture tables, geometry tiles and map settings. Player and marker endpoints are replaced by empty static responses. No world archives, player inventories, live positions or server configuration are published. `public/map-viewer/manifest.json` records SHA-256 hashes.

Keep `utils/map-catalog.ts` synchronized with the map identifiers. Fixed WebP covers must be captured from the fully loaded real viewer; wait for camera movement and texture loading to settle, then visually inspect framing. They are not generated illustrations.

The viewer is loaded only on request and can be unloaded with the still-image button. Three-dimensional and top-down views use the same geometry. JavaScript canvas/WebGL support is required. A first visit may take several seconds.

Static geometry is exported uncompressed: Nitro creates HTTP gzip/Brotli variants during the production build. BlueMap client decompression is disabled to avoid decoding HTTP-compressed responses twice. Low-resolution heightfield rendering is disabled because it distorts floating islands. SkyWars 1 also requires `remove-caves-below-y: -10000` in its BlueMap render configuration: cave culling otherwise hides islands below tree canopies.

BlueMap attribution remains in the viewer. Upstream: https://github.com/BlueMap-Minecraft/BlueMap (MIT).
