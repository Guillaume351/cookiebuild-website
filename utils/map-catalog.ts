export interface MapPreview {
  slug: string;
  name: string;
  game: string;
  status: "preview" | "available";
  description: string;
  image: string;
  viewerId: string;
  center?: [number, number, number];
  distance?: number;
  districts: Array<{ name: string; role: string }>;
}

// Only publish deliberately exported map snapshots; never connect this to a live world.
export const mapCatalog: MapPreview[] = [
  {
    slug: "fat-king-crown", name: "La Couronne des Profondeurs", game: "Fat King", status: "preview",
    description: "A 289-block world of woodland houses, ruined arches, a great quarry and gardens. Separate districts, contested gold mines and routes through the hills.",
    image: "/maps/fat-king-crown.webp", viewerId: "fatking_crown", center: [0, 70, 0], distance: 360,
    districts: [{ name: "Woodland village", role: "Houses and groves" }, { name: "Ruined sanctuary", role: "Arches and cover" }, { name: "Great quarry", role: "Stone terraces" }, { name: "Gardens and orangery", role: "Paths and walkways" }],
  },
  {
    slug: "nomad-oasis", name: "Sunken Oasis", game: "Nomad Wars", status: "preview",
    description: "Blue domes, a bustling bazaar, palm gardens and a stepped necropolis surround a sunlit arena.",
    image: "/maps/nomad-oasis.webp", viewerId: "oasis_v2",
    districts: [{ name: "Palace", role: "Workshop" }, { name: "Bazaar", role: "Food" }, { name: "Palm gardens", role: "Wood" }, { name: "Necropolis quarry", role: "Ore" }],
  },
  {
    slug: "nomad-ruins", name: "Forgotten Kingdom", game: "Nomad Wars", status: "preview",
    description: "A ruined cathedral, monastery gardens, timber village and ancient aqueduct reclaim an overgrown kingdom.",
    image: "/maps/nomad-ruins.webp", viewerId: "ruins_v2",
    districts: [{ name: "Cathedral", role: "Workshop" }, { name: "Monastery", role: "Food" }, { name: "Timber village", role: "Wood" }, { name: "Aqueduct quarry", role: "Ore" }],
  },
  {
    slug: "nomad-canyon", name: "Redrock Frontier", game: "Nomad Wars", status: "preview",
    description: "A frontier town, terraced mesa mine, adobe fortress and ravine sawmill meet around a red-sand colosseum.",
    image: "/maps/nomad-canyon.webp", viewerId: "canyon_v2",
    districts: [{ name: "Frontier town", role: "Food" }, { name: "Mesa mine", role: "Ore" }, { name: "Adobe fortress", role: "Workshop" }, { name: "Ravine sawmill", role: "Wood" }],
  },
  ...[
  {
    "slug": "microbattles-game-1",
    "name": "Arena 1",
    "game": "MicroBattles",
    "status": "available",
    "description": "Explore Arena 1, a MicroBattles arena, from above or at building level.",
    "image": "/maps/microbattles-game-1.webp",
    "viewerId": "microbattles_game_1",
    "center": [
      149.0,
      16.0,
      149.0
    ],
    "distance": 112,
    "districts": []
  },
  {
    "slug": "microbattles-game-2",
    "name": "Arena 2",
    "game": "MicroBattles",
    "status": "available",
    "description": "Explore Arena 2, a MicroBattles arena, from above or at building level.",
    "image": "/maps/microbattles-game-2.webp",
    "viewerId": "microbattles_game_2",
    "center": [
      153.0,
      15.0,
      134.0
    ],
    "distance": 112,
    "districts": []
  },
  {
    "slug": "microbattles-game-3",
    "name": "Arena 3",
    "game": "MicroBattles",
    "status": "available",
    "description": "Explore Arena 3, a MicroBattles arena, from above or at building level.",
    "image": "/maps/microbattles-game-3.webp",
    "viewerId": "microbattles_game_3",
    "center": [
      103.0,
      16.0,
      129.0
    ],
    "distance": 134,
    "districts": []
  },
  {
    "slug": "microbattles-game-4",
    "name": "Arena 4",
    "game": "MicroBattles",
    "status": "available",
    "description": "Explore Arena 4, a MicroBattles arena, from above or at building level.",
    "image": "/maps/microbattles-game-4.webp",
    "viewerId": "microbattles_game_4",
    "center": [
      147.0,
      15.0,
      102.0
    ],
    "distance": 132,
    "districts": []
  },
  {
    "slug": "microbattles-game-5",
    "name": "Arena 5",
    "game": "MicroBattles",
    "status": "available",
    "description": "Explore Arena 5, a MicroBattles arena, from above or at building level.",
    "image": "/maps/microbattles-game-5.webp",
    "viewerId": "microbattles_game_5",
    "center": [
      0.5,
      41.0,
      0.7
    ],
    "distance": 132,
    "districts": []
  },
  {
    "slug": "microbattles-game-6",
    "name": "Arena 6",
    "game": "MicroBattles",
    "status": "available",
    "description": "Explore Arena 6, a MicroBattles arena, from above or at building level.",
    "image": "/maps/microbattles-game-6.webp",
    "viewerId": "microbattles_game_6",
    "center": [
      127.2,
      25.0,
      128.2
    ],
    "distance": 111,
    "districts": []
  },
  {
    "slug": "microbattles-game-7",
    "name": "Arena 7",
    "game": "MicroBattles",
    "status": "available",
    "description": "Explore Arena 7, a MicroBattles arena, from above or at building level.",
    "image": "/maps/microbattles-game-7.webp",
    "viewerId": "microbattles_game_7",
    "center": [
      1.5,
      44.0,
      -0.8
    ],
    "distance": 125,
    "districts": []
  },
  {
    "slug": "microbattles-game-8",
    "name": "Arena 8",
    "game": "MicroBattles",
    "status": "available",
    "description": "Explore Arena 8, a MicroBattles arena, from above or at building level.",
    "image": "/maps/microbattles-game-8.webp",
    "viewerId": "microbattles_game_8",
    "center": [
      112.5,
      19.0,
      119.8
    ],
    "distance": 113,
    "districts": []
  },
  {
    "slug": "pitchout-frozen",
    "name": "Frozen",
    "game": "Pitchout",
    "status": "available",
    "description": "Explore Frozen, a Pitchout arena, from above or at building level.",
    "image": "/maps/pitchout-frozen.webp",
    "viewerId": "pitchout_frozen",
    "center": [
      0.5,
      67.0,
      0.5
    ],
    "distance": 230,
    "districts": []
  },
  {
    "slug": "pitchout-pitchout1",
    "name": "Pitchout Classic",
    "game": "Pitchout",
    "status": "available",
    "description": "Explore Pitchout Classic, a Pitchout arena, from above or at building level.",
    "image": "/maps/pitchout-pitchout1.webp",
    "viewerId": "pitchout_pitchout1",
    "center": [
      6.5,
      64.0,
      9.5
    ],
    "distance": 174,
    "districts": []
  },
  {
    "slug": "pitchout-pitchout2",
    "name": "Four Corners",
    "game": "Pitchout",
    "status": "available",
    "description": "Explore Four Corners, a Pitchout arena, from above or at building level.",
    "image": "/maps/pitchout-pitchout2.webp",
    "viewerId": "pitchout_pitchout2",
    "center": [
      -1.6,
      23.0,
      -2.6
    ],
    "distance": 294,
    "districts": []
  },
  {
    "slug": "skywars-legacy-0",
    "name": "Sky Arena 0",
    "game": "SkyWars",
    "status": "available",
    "description": "Explore Sky Arena 0, a SkyWars arena, from above or at building level.",
    "image": "/maps/skywars-legacy-0.webp",
    "viewerId": "skywars_legacy_0",
    "center": [
      101.6,
      53.5,
      650.0
    ],
    "distance": 259,
    "districts": []
  },
  {
    "slug": "skywars-legacy-1",
    "name": "Sky Arena 1",
    "game": "SkyWars",
    "status": "available",
    "description": "Explore Sky Arena 1, a SkyWars arena, from above or at building level.",
    "image": "/maps/skywars-legacy-1.webp",
    "viewerId": "skywars_legacy_1",
    "center": [
      -1588.2,
      48.5,
      -797.4
    ],
    "distance": 303,
    "districts": []
  },
  {
    "slug": "skywars-legacy-2",
    "name": "Sky Arena 2",
    "game": "SkyWars",
    "status": "available",
    "description": "Explore Sky Arena 2, a SkyWars arena, from above or at building level.",
    "image": "/maps/skywars-legacy-2.webp",
    "viewerId": "skywars_legacy_2",
    "center": [
      -475.7,
      39.5,
      367.6
    ],
    "distance": 344,
    "districts": []
  },
  {
    "slug": "skywars-legacy-4",
    "name": "Sky Arena 4",
    "game": "SkyWars",
    "status": "available",
    "description": "Explore Sky Arena 4, a SkyWars arena, from above or at building level.",
    "image": "/maps/skywars-legacy-4.webp",
    "viewerId": "skywars_legacy_4",
    "center": [
      188.2,
      65.5,
      202.3
    ],
    "distance": 249,
    "districts": []
  },
  {
    "slug": "buildbattles-legacy-buildbattles",
    "name": "Creative Plots",
    "game": "Build Battle",
    "status": "available",
    "description": "Explore Creative Plots, a Build Battle arena, from above or at building level.",
    "image": "/maps/buildbattles-legacy-buildbattles.webp",
    "viewerId": "buildbattles_legacy_buildbattles",
    "center": [
      122.8,
      5.5,
      112.8
    ],
    "distance": 274,
    "districts": []
  },
  {
    "slug": "turfwars-legacy-turfwars",
    "name": "Turf Arena",
    "game": "Turf Wars",
    "status": "available",
    "description": "Explore Turf Arena, a Turf Wars arena, from above or at building level.",
    "image": "/maps/turfwars-legacy-turfwars.webp",
    "viewerId": "turfwars_legacy_turfwars",
    "center": [
      128.5,
      6.0,
      127.5
    ],
    "distance": 221,
    "districts": []
  },
  {
    "slug": "bedwars-cookie-colosseum-v1",
    "name": "Cookie Colosseum",
    "game": "BedWars",
    "status": "available",
    "description": "Explore Cookie Colosseum, a BedWars arena, from above or at building level.",
    "image": "/maps/bedwars-cookie-colosseum-v1.webp",
    "viewerId": "bedwars_cookie_colosseum_v1",
    "center": [
      0.0,
      65.0,
      0.0
    ],
    "distance": 350,
    "districts": []
  }
] satisfies MapPreview[],
];

export const nomadMaps = mapCatalog.filter((map) => map.game === "Nomad Wars");

export function findMapPreview(slug: string): MapPreview | undefined {
  return mapCatalog.find((map) => map.slug === slug);
}

export function mapViewerUrl(map: MapPreview, topDown = false): string {
  const center = (map.center ?? [0, 76, 0]).join(":");
  const distance = map.distance ?? 450;
  const camera = topDown ? `${center}:${Math.round(distance * 0.76)}:0:0:0:1:flat` : `${center}:${distance}:0.78:0.72:0:0:perspective`;
  return `/map-viewer/index.html#${encodeURIComponent(map.viewerId)}:${camera}`;
}
