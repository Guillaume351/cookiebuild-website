# Offline map catalogue

The public catalogue contains 22 real map renders: 8 MicroBattles, 3 Pitchout, 4 SkyWars, BuildBattles, TurfWars, BedWars, the 3 Nomad Wars maps, and Fat King’s Crown of the Depths. Personal Skyblock islands are excluded.

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

## Public beta games

`fatking_crown` is the real generated world for the Fat King beta.
The source generator, world ZIP and map metadata are versioned with `Cookies/FatKing`.
The website publishes only its offline BlueMap geometry, overview and top-down cover.
The English and French Fat King and Nomad Wars pages now describe the public beta.
Fat King opens with two teams of 2–4 players (4–8 total); Nomad Wars accepts 2–8 players.
Players opt in through the game menu or `/fatking play` and `/nomadwars play`.
Automatic Quick Play excludes both betas; matches award no server currency.
Coordinate website publication with the Minecraft release: website copy alone does not deploy the plugins.
Historical JSON release notes stay immutable; the beta opening is recorded in
`content/changelog/2026-09-minigames-public-beta.json`.
