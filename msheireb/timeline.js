// One timeline: beats, plate schedule, narration, readings. The picture, the score (mix.py via events.json)
// and the subtitles all read these numbers.
export const BPM = 96, B = 60 / BPM;          // beat 0.625 s, bar 2.5 s
export const b = n => +(n * B).toFixed(4);     // beat -> seconds

export const T = {
  dur: b(90),          // 56.25
  paint0: 0.4, paint1: 1.9,
  lock: b(6),          // 3.75  reticle snaps on the site
  print0: b(9.6), print1: b(11.2),   // 6.0 - 7.0 outline prints behind a scan
  range0: b(12), rangeLand: b(15),   // 7.5 - 9.375 range line along Al Rayyan Road
  suck1: b(29.2),      // 18.25  suck-out before 2013
  dig: b(30),          // 18.75  2013 lands
  push0: b(54),        // 33.75  2019; push-in starts
  suck2: b(63.3),      // 39.56  silence before 2020
  turn: b(64),         // 40.0   2020: colour returns inside the outline
  climb0: b(70),       // 43.75
  climb1: b(84),       // 52.5
};

// each year: when its scan front crosses the frame (t0 -> t1). 2010 is painted in at the opening.
export const YEARS = [
  { y: 2010, t0: T.paint0, t1: T.paint1, sensor: 'LANDSAT 7 ETM+', when: 'FEB–APR 2010' },
  { y: 2011, t0: b(22), t1: b(22) + 1.0, sensor: 'LANDSAT 7 ETM+', when: 'DEC 2010–MAR 2011' },
  { y: 2012, t0: b(26), t1: b(26) + 1.0, sensor: 'LANDSAT 7 ETM+', when: 'JAN–MAR 2012' },
  { y: 2013, t0: b(30) - 0.5, t1: b(30) + 0.35, sensor: 'LANDSAT 8 OLI', when: '28 NOV 2013' },
  { y: 2014, t0: b(38), t1: b(38) + 0.9, sensor: 'LANDSAT 8 OLI', when: '16 FEB 2014' },
  { y: 2015, t0: b(42), t1: b(42) + 0.9, sensor: 'LANDSAT 8 OLI', when: '19 FEB 2015' },
  { y: 2016, t0: b(47), t1: b(47) + 0.7, sensor: 'LANDSAT 8 OLI', when: '22 FEB 2016' },
  { y: 2017, t0: b(50), t1: b(50) + 0.55, sensor: 'LANDSAT 8 OLI', when: '24 FEB 2017' },
  { y: 2018, t0: b(52), t1: b(52) + 0.5, sensor: 'LANDSAT 8 OLI', when: '26 JAN 2018' },
  { y: 2019, t0: b(54), t1: b(54) + 0.5, sensor: 'LANDSAT 8 OLI', when: '14 FEB 2019' },
  { y: 2020, t0: T.turn - 0.45, t1: T.turn + 0.55, sensor: 'LANDSAT 8 OLI', when: '17 FEB 2020' },
];

// narration: start times; durations come from voice/out/dur.json
export const VO = [
  { id: 'v1', t: 1.2 },
  { id: 'v2', t: 7.9 },
  { id: 'v3', t: 11.6 },
  { id: 'v4', t: 19.4 },
  { id: 'v5', t: 23.2 },
  { id: 'v6', t: 26.6 },
  { id: 'v7', t: 34.1 },
  { id: 'v9', t: 41.0 },
  { id: 'v10', t: 47.6 },
];

// readings: one per screen, right third
export const READ = [
  { id: 'r-area', t0: 8.1, t1: 13.6, y: 420, label: 'SITE AREA', value: '31', unit: 'ha', note: 'published figure · traced outline 32.2 ha' },
  { id: 'r-dig', t0: b(30) + 0.5, t1: 25.4, label: 'ONE EXCAVATION ACROSS THE SITE', value: 'NOV 2013', note: 'Landsat 8 · 28 Nov 2013 · seen' },
  { id: 'r-mus', t0: 26.8, t1: 32.4, label: 'FOUR HERITAGE HOUSES OPEN AS MUSEUMS', value: 'OCT 2015', note: 'Msheireb Museums · public record' },
  { id: 'r-metro', t0: 34.3, t1: 39.45, label: 'MSHEIREB METRO STATION OPENS', value: '8 MAY 2019', note: 'Doha Metro Red Line · largest station' },
  { id: 'r-ten', t0: 41.2, t1: 47.2, label: 'THE SAME 31 HECTARES', value: '2010 → 2020', note: 'Landsat 7 → Landsat 8 · 15 m' },
];

// places (lon, lat)
export const G = {
  site: [51.5268, 25.2863],
  souq: [51.5331, 25.2876],
  rayyan: [51.5196, 25.2894],
  rangeA: [51.5234, 25.2891], rangeB: [51.5296, 25.2889],   // the outline's north edge (measured 625 m)
};
