// Positions on the world, in 1920×1080 stage coordinates — mapped to the new Cairo/Amman art (10 Oct 2026).
// Edit mode exports a replacement for this file.
// side: where the label pill sits next to its point — "l" left, "r" right, "t" top, "b" bottom.
// glow: landmark glow polygon for the point (drawn in Edit mode; empty = no glow).
window.VALU_LAYOUT = {
  version: 2,
  points: [
    { chapter: 1, x: 150,  y: 150, side: "b", glow: [] }, // Valu 1.0 — the pyramids (place line removed)
    { chapter: 2, x: 150,  y: 335, side: "r", glow: [] }, // From Idea to Reality — EFG building
    { chapter: 3, x: 488,  y: 540, side: "b", glow: [] }, // The Ripple Effect — the Nile & Qasr El Nil Bridge
    { chapter: 4, x: 632,  y: 255, side: "r", glow: [] }, // Spark Mode — Cairo Tower
    { chapter: 5, x: 930,  y: 482, side: "t", glow: [] }, // Beyond BNPL — Khan el-Khalili
    { chapter: 6, x: 830,  y: 780, side: "b", glow: [] }, // Valu Café
    { chapter: 7, x: 802,  y: 550, side: "b", glow: [] }, // Going Public — the Egyptian Exchange
    { chapter: 8, x: 1155, y: 558, side: "b", glow: [] }, // Beyond Borders — the long bridge
    { chapter: 9, x: 1800, y: 395, side: "l", glow: [] }  // Official Launch — Abdali, Amman
  ],
  plots: [
    { id: "A",  building: "block1", poly: [[1447,495],[1510,477],[1555,512],[1490,530]] },
    { id: "B",  building: "villa",  poly: [[1535,475],[1600,452],[1660,487],[1590,505]] },
    { id: "C",  building: "house",  poly: [[1485,542],[1562,525],[1607,560],[1535,577]] },
    { id: "C2", building: "shop",   poly: [[1590,517],[1672,500],[1720,537],[1640,555]] },
    { id: "D",  building: "house2", poly: [[1535,592],[1615,572],[1667,610],[1582,632]] },
    { id: "E",  building: "block2", poly: [[1645,565],[1735,550],[1782,590],[1695,610]] }
  ],
  paths: {
    bridge: [[925,570],[1000,566],[1100,560],[1200,556],[1300,551],[1385,548]],
    jordanRoads: [
      [[1428,488],[1465,530],[1510,570],[1545,605],[1582,645],[1640,633],[1700,622],[1760,610],[1840,594]]
    ],
    egyptStreets: [
      [[740,175],[735,260],[722,350],[705,440],[690,520]],
      [[40,520],[150,515],[260,522],[305,532]]
    ],
    water: [
      [[1140,40],[1155,180],[1165,320],[1172,460]],
      [[1080,650],[1120,770],[1160,880],[1200,990],[1230,1070]],
      [[60,1000],[250,960],[450,990],[650,1040]]
    ],
    runway: [[1748,950],[1800,890],[1850,830],[1895,770],[1960,690]],
    nile: [[598,45],[595,100],[575,150],[565,180],[552,225],[505,270],[468,315],[438,360],[423,405],[400,450],[398,495],[400,540],[393,585],[405,630],[430,690],[430,760],[430,840],[430,940]]
  },
  title: [1460, 46],
  headline: [745, 990]
};
