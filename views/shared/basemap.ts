import type { StyleSpecification } from "maplibre-gl";
// OpenFreeMap Liberty layer definitions, with a quiet dark palette for weather.
// Source: https://tiles.openfreemap.org/styles/liberty (OpenMapTiles schema).
export const basemapStyle: StyleSpecification = {
  "version": 8,
  "sprite": "https://tiles.openfreemap.org/sprites/ofm_f384/ofm",
  "glyphs": "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  "sources": {
    "openmaptiles": {
      "type": "vector",
      "url": "https://tiles.openfreemap.org/planet",
      "attribution": "\u00a9 <a href=\"https://openfreemap.org\" target=\"_blank\" rel=\"noreferrer\">OpenFreeMap</a> © <a href=\"https://openmaptiles.org\" target=\"_blank\" rel=\"noreferrer\">OpenMapTiles</a> \u00a9 <a href=\"https://www.openstreetmap.org/copyright\" target=\"_blank\" rel=\"noreferrer\">OpenStreetMap</a>"
    }
  },
  "layers": [
    {
      "id": "background",
      "type": "background",
      "paint": {
        "background-color": "#151d24"
      }
    },
    {
      "id": "park",
      "type": "fill",
      "source": "openmaptiles",
      "source-layer": "park",
      "paint": {
        "fill-color": "#1b2728",
        "fill-opacity": 0.7,
        "fill-outline-color": "#26343d"
      }
    },
    {
      "id": "landuse_residential",
      "type": "fill",
      "source": "openmaptiles",
      "source-layer": "landuse",
      "maxzoom": 12,
      "filter": [
        "==",
        [
          "get",
          "class"
        ],
        "residential"
      ],
      "paint": {
        "fill-color": "#1b242c"
      }
    },
    {
      "id": "landcover_wood",
      "type": "fill",
      "source": "openmaptiles",
      "source-layer": "landcover",
      "filter": [
        "==",
        [
          "get",
          "class"
        ],
        "wood"
      ],
      "paint": {
        "fill-antialias": false,
        "fill-color": "#1b2728",
        "fill-opacity": 0.4
      }
    },
    {
      "id": "landcover_grass",
      "type": "fill",
      "source": "openmaptiles",
      "source-layer": "landcover",
      "filter": [
        "==",
        [
          "get",
          "class"
        ],
        "grass"
      ],
      "paint": {
        "fill-antialias": false,
        "fill-color": "#1b2728",
        "fill-opacity": 0.3
      }
    },
    {
      "id": "waterway_river",
      "type": "line",
      "source": "openmaptiles",
      "source-layer": "waterway",
      "filter": [
        "all",
        [
          "==",
          [
            "get",
            "class"
          ],
          "river"
        ],
        [
          "!=",
          [
            "get",
            "brunnel"
          ],
          "tunnel"
        ]
      ],
      "layout": {
        "line-cap": "round"
      },
      "paint": {
        "line-color": "#273942",
        "line-width": [
          "interpolate",
          [
            "exponential",
            1.2
          ],
          [
            "zoom"
          ],
          11,
          0.5,
          20,
          6
        ],
        "line-opacity": 0.65
      }
    },
    {
      "id": "water",
      "type": "fill",
      "source": "openmaptiles",
      "source-layer": "water",
      "filter": [
        "!=",
        [
          "get",
          "brunnel"
        ],
        "tunnel"
      ],
      "paint": {
        "fill-color": "#102832"
      }
    },
    {
      "id": "road_minor",
      "type": "line",
      "source": "openmaptiles",
      "source-layer": "transportation",
      "filter": [
        "all",
        [
          "match",
          [
            "geometry-type"
          ],
          [
            "LineString",
            "MultiLineString"
          ],
          true,
          false
        ],
        [
          "match",
          [
            "get",
            "brunnel"
          ],
          [
            "bridge",
            "tunnel"
          ],
          false,
          true
        ],
        [
          "match",
          [
            "get",
            "class"
          ],
          [
            "minor"
          ],
          true,
          false
        ]
      ],
      "layout": {
        "line-cap": "round",
        "line-join": "round"
      },
      "paint": {
        "line-color": "#36424a",
        "line-width": [
          "interpolate",
          [
            "exponential",
            1.2
          ],
          [
            "zoom"
          ],
          13.5,
          0,
          14,
          2.5,
          20,
          18
        ],
        "line-opacity": 0.65
      }
    },
    {
      "id": "road_secondary_tertiary",
      "type": "line",
      "source": "openmaptiles",
      "source-layer": "transportation",
      "filter": [
        "all",
        [
          "match",
          [
            "get",
            "brunnel"
          ],
          [
            "bridge",
            "tunnel"
          ],
          false,
          true
        ],
        [
          "match",
          [
            "get",
            "class"
          ],
          [
            "secondary",
            "tertiary"
          ],
          true,
          false
        ]
      ],
      "layout": {
        "line-cap": "round",
        "line-join": "round"
      },
      "paint": {
        "line-color": "#36424a",
        "line-width": [
          "interpolate",
          [
            "exponential",
            1.2
          ],
          [
            "zoom"
          ],
          6.5,
          0,
          8,
          0.5,
          20,
          13
        ],
        "line-opacity": 0.65
      }
    },
    {
      "id": "road_trunk_primary",
      "type": "line",
      "source": "openmaptiles",
      "source-layer": "transportation",
      "filter": [
        "all",
        [
          "match",
          [
            "get",
            "brunnel"
          ],
          [
            "bridge",
            "tunnel"
          ],
          false,
          true
        ],
        [
          "match",
          [
            "get",
            "class"
          ],
          [
            "primary",
            "trunk"
          ],
          true,
          false
        ]
      ],
      "layout": {
        "line-join": "round"
      },
      "paint": {
        "line-color": "#36424a",
        "line-width": [
          "interpolate",
          [
            "exponential",
            1.2
          ],
          [
            "zoom"
          ],
          5,
          0,
          7,
          1,
          20,
          18
        ],
        "line-opacity": 0.65
      }
    },
    {
      "id": "road_motorway",
      "type": "line",
      "source": "openmaptiles",
      "source-layer": "transportation",
      "minzoom": 5,
      "filter": [
        "all",
        [
          "match",
          [
            "get",
            "brunnel"
          ],
          [
            "bridge",
            "tunnel"
          ],
          false,
          true
        ],
        [
          "==",
          [
            "get",
            "class"
          ],
          "motorway"
        ],
        [
          "!=",
          [
            "get",
            "ramp"
          ],
          1
        ]
      ],
      "layout": {
        "line-cap": "round",
        "line-join": "round"
      },
      "paint": {
        "line-color": "#36424a",
        "line-width": [
          "interpolate",
          [
            "exponential",
            1.2
          ],
          [
            "zoom"
          ],
          5,
          0,
          7,
          1,
          20,
          18
        ],
        "line-opacity": 0.65
      }
    },
    {
      "id": "building",
      "type": "fill",
      "source": "openmaptiles",
      "source-layer": "building",
      "minzoom": 13,
      "maxzoom": 14,
      "paint": {
        "fill-color": "#1b242c",
        "fill-outline-color": "#26343d"
      }
    },
    {
      "id": "boundary_3",
      "type": "line",
      "source": "openmaptiles",
      "source-layer": "boundary",
      "minzoom": 5,
      "filter": [
        "all",
        [
          ">=",
          [
            "get",
            "admin_level"
          ],
          3
        ],
        [
          "<=",
          [
            "get",
            "admin_level"
          ],
          6
        ],
        [
          "!=",
          [
            "get",
            "maritime"
          ],
          1
        ],
        [
          "!=",
          [
            "get",
            "disputed"
          ],
          1
        ],
        [
          "!",
          [
            "has",
            "claimed_by"
          ]
        ]
      ],
      "paint": {
        "line-color": "#53616a",
        "line-dasharray": [
          1,
          1
        ],
        "line-width": [
          "interpolate",
          ["linear"],
          [
            "zoom"
          ],
          7,
          1,
          11,
          2
        ],
        "line-opacity": 0.65
      }
    },
    {
      "id": "boundary_2",
      "type": "line",
      "source": "openmaptiles",
      "source-layer": "boundary",
      "filter": [
        "all",
        [
          "==",
          [
            "get",
            "admin_level"
          ],
          2
        ],
        [
          "!=",
          [
            "get",
            "maritime"
          ],
          1
        ],
        [
          "!=",
          [
            "get",
            "disputed"
          ],
          1
        ],
        [
          "!",
          [
            "has",
            "claimed_by"
          ]
        ]
      ],
      "layout": {
        "line-cap": "round",
        "line-join": "round"
      },
      "paint": {
        "line-color": "#53616a",
        "line-opacity": 0.65,
        "line-width": [
          "interpolate",
          [
            "linear"
          ],
          [
            "zoom"
          ],
          3,
          1,
          5,
          1.2,
          12,
          3
        ]
      }
    },
    {
      "id": "water_name_point_label",
      "type": "symbol",
      "source": "openmaptiles",
      "source-layer": "water_name",
      "filter": [
        "match",
        [
          "geometry-type"
        ],
        [
          "MultiPoint",
          "Point"
        ],
        true,
        false
      ],
      "layout": {
        "text-field": [
          "case",
          [
            "has",
            "name:nonlatin"
          ],
          [
            "concat",
            [
              "get",
              "name:latin"
            ],
            "\n",
            [
              "get",
              "name:nonlatin"
            ]
          ],
          [
            "coalesce",
            [
              "get",
              "name_en"
            ],
            [
              "get",
              "name"
            ]
          ]
        ],
        "text-font": [
          "Noto Sans Italic"
        ],
        "text-letter-spacing": 0.2,
        "text-max-width": 5,
        "text-size": [
          "interpolate",
          [
            "linear"
          ],
          [
            "zoom"
          ],
          0,
          10,
          8,
          14
        ]
      },
      "paint": {
        "text-color": "#81959f",
        "text-halo-color": "#151d24",
        "text-halo-width": 1
      }
    },
    {
      "id": "label_town",
      "type": "symbol",
      "source": "openmaptiles",
      "source-layer": "place",
      "minzoom": 6,
      "filter": [
        "==",
        [
          "get",
          "class"
        ],
        "town"
      ],
      "layout": {
        "icon-allow-overlap": true,
        "icon-image": [
          "step",
          [
            "zoom"
          ],
          "circle_11_black",
          10,
          ""
        ],
        "icon-optional": false,
        "icon-size": 0.2,
        "text-anchor": "bottom",
        "text-field": [
          "case",
          [
            "has",
            "name:nonlatin"
          ],
          [
            "concat",
            [
              "get",
              "name:latin"
            ],
            "\n",
            [
              "get",
              "name:nonlatin"
            ]
          ],
          [
            "coalesce",
            [
              "get",
              "name_en"
            ],
            [
              "get",
              "name"
            ]
          ]
        ],
        "text-font": [
          "Noto Sans Regular"
        ],
        "text-max-width": 8,
        "text-size": [
          "interpolate",
          [
            "exponential",
            1.2
          ],
          [
            "zoom"
          ],
          7,
          12,
          11,
          14
        ]
      },
      "paint": {
        "text-color": "#81959f",
        "text-halo-blur": 1,
        "text-halo-color": "#151d24",
        "text-halo-width": 1
      }
    },
    {
      "id": "label_state",
      "type": "symbol",
      "source": "openmaptiles",
      "source-layer": "place",
      "minzoom": 5,
      "maxzoom": 8,
      "filter": [
        "==",
        [
          "get",
          "class"
        ],
        "state"
      ],
      "layout": {
        "text-field": [
          "case",
          [
            "has",
            "name:nonlatin"
          ],
          [
            "concat",
            [
              "get",
              "name:latin"
            ],
            "\n",
            [
              "get",
              "name:nonlatin"
            ]
          ],
          [
            "coalesce",
            [
              "get",
              "name_en"
            ],
            [
              "get",
              "name"
            ]
          ]
        ],
        "text-font": [
          "Noto Sans Italic"
        ],
        "text-letter-spacing": 0.2,
        "text-max-width": 9,
        "text-size": [
          "interpolate",
          [
            "linear"
          ],
          [
            "zoom"
          ],
          5,
          10,
          8,
          14
        ],
        "text-transform": "uppercase"
      },
      "paint": {
        "text-color": "#81959f",
        "text-halo-blur": 1,
        "text-halo-color": "#151d24",
        "text-halo-width": 1
      }
    },
    {
      "id": "label_city",
      "type": "symbol",
      "source": "openmaptiles",
      "source-layer": "place",
      "minzoom": 3,
      "filter": [
        "all",
        [
          "==",
          [
            "get",
            "class"
          ],
          "city"
        ],
        [
          "!=",
          [
            "get",
            "capital"
          ],
          2
        ]
      ],
      "layout": {
        "icon-allow-overlap": true,
        "icon-image": [
          "step",
          [
            "zoom"
          ],
          "circle_11_black",
          9,
          ""
        ],
        "icon-optional": false,
        "icon-size": 0.4,
        "text-anchor": "bottom",
        "text-field": [
          "case",
          [
            "has",
            "name:nonlatin"
          ],
          [
            "concat",
            [
              "get",
              "name:latin"
            ],
            "\n",
            [
              "get",
              "name:nonlatin"
            ]
          ],
          [
            "coalesce",
            [
              "get",
              "name_en"
            ],
            [
              "get",
              "name"
            ]
          ]
        ],
        "text-font": [
          "Noto Sans Regular"
        ],
        "text-max-width": 8,
        "text-offset": [
          0,
          -0.1
        ],
        "text-size": [
          "interpolate",
          [
            "exponential",
            1.2
          ],
          [
            "zoom"
          ],
          4,
          11,
          7,
          13,
          11,
          18
        ]
      },
      "paint": {
        "text-color": "#a8b9c0",
        "text-halo-blur": 1,
        "text-halo-color": "#151d24",
        "text-halo-width": 1
      }
    },
    {
      "id": "label_city_capital",
      "type": "symbol",
      "source": "openmaptiles",
      "source-layer": "place",
      "minzoom": 3,
      "filter": [
        "all",
        [
          "==",
          [
            "get",
            "class"
          ],
          "city"
        ],
        [
          "==",
          [
            "get",
            "capital"
          ],
          2
        ]
      ],
      "layout": {
        "icon-allow-overlap": true,
        "icon-image": [
          "step",
          [
            "zoom"
          ],
          "circle_11_black",
          9,
          ""
        ],
        "icon-optional": false,
        "icon-size": 0.5,
        "text-anchor": "bottom",
        "text-field": [
          "case",
          [
            "has",
            "name:nonlatin"
          ],
          [
            "concat",
            [
              "get",
              "name:latin"
            ],
            "\n",
            [
              "get",
              "name:nonlatin"
            ]
          ],
          [
            "coalesce",
            [
              "get",
              "name_en"
            ],
            [
              "get",
              "name"
            ]
          ]
        ],
        "text-font": [
          "Noto Sans Bold"
        ],
        "text-max-width": 8,
        "text-offset": [
          0,
          -0.2
        ],
        "text-size": [
          "interpolate",
          [
            "exponential",
            1.2
          ],
          [
            "zoom"
          ],
          4,
          12,
          7,
          14,
          11,
          20
        ]
      },
      "paint": {
        "text-color": "#a8b9c0",
        "text-halo-blur": 1,
        "text-halo-color": "#151d24",
        "text-halo-width": 1
      }
    },
    {
      "id": "label_country_2",
      "type": "symbol",
      "source": "openmaptiles",
      "source-layer": "place",
      "maxzoom": 9,
      "filter": [
        "all",
        [
          "==",
          [
            "get",
            "class"
          ],
          "country"
        ],
        [
          "==",
          [
            "get",
            "rank"
          ],
          2
        ]
      ],
      "layout": {
        "text-field": [
          "case",
          [
            "has",
            "name:nonlatin"
          ],
          [
            "concat",
            [
              "get",
              "name:latin"
            ],
            "\n",
            [
              "get",
              "name:nonlatin"
            ]
          ],
          [
            "coalesce",
            [
              "get",
              "name_en"
            ],
            [
              "get",
              "name"
            ]
          ]
        ],
        "text-font": [
          "Noto Sans Bold"
        ],
        "text-max-width": 6.25,
        "text-size": [
          "interpolate",
          [
            "linear"
          ],
          [
            "zoom"
          ],
          2,
          9,
          5,
          17
        ]
      },
      "paint": {
        "text-color": "#81959f",
        "text-halo-blur": 1,
        "text-halo-color": "#151d24",
        "text-halo-width": 1
      }
    }
  ]
};
