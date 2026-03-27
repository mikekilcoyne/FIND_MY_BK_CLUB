// Word cloud topic data — organized by region
// Format: [phrase, weight (1–12)]
// Higher weight = larger / more prominent in the cloud

const WC_TOPICS = {
  "All": [
    ["side projects", 9], ["career pivots", 7], ["early risers", 8],
    ["new friends", 10], ["coffee", 12], ["ambition", 6], ["remote work", 8],
    ["what's next", 7], ["dream jobs", 6], ["local gems", 5],
    ["building things", 7], ["morning routines", 5], ["weekend plans", 5],
    ["book recs", 6], ["travel stories", 7], ["the algorithm", 5],
    ["AI hype", 8], ["late nights", 5], ["accountability", 6],
    ["morning runs", 5], ["creative blocks", 4], ["the news", 5],
    ["real estate", 5], ["freelancing", 6], ["community", 8],
    ["good eggs", 3], ["croissants", 4], ["oat milk", 3],
    ["idea validation", 6], ["co-founders", 7], ["the pivot", 5],
    ["serendipity", 4], ["regulars", 6], ["first timers", 5],
  ],

  "Northeast US": [
    ["NYC grind", 10], ["Brooklyn vibes", 8], ["subway delays", 7],
    ["rent prices", 9], ["startup scene", 8], ["finance talk", 5],
    ["Hudson Valley", 4], ["Hamptons summer", 4], ["Boston hustle", 6],
    ["college reunions", 5], ["bodega cats", 6], ["rooftop season", 5],
    ["equity packages", 7], ["bagels", 9], ["cold brew", 7],
    ["Williamsburg", 7], ["the commute", 6], ["gallery openings", 4],
    ["co-working spots", 6], ["media industry", 5],
  ],

  "Southeast US": [
    ["Atlanta rising", 7], ["Miami energy", 8], ["southern hospitality", 6],
    ["tech migration", 6], ["beach mornings", 7], ["warm winters", 5],
    ["Nashville growth", 6], ["slow sundays", 5], ["BBQ debates", 5],
    ["sweet tea", 5], ["porch culture", 4], ["music scenes", 5],
    ["Black founders", 6], ["HBCU networks", 5], ["post-covid cities", 5],
  ],

  "West Coast": [
    ["SF housing", 9], ["LA hustle", 8], ["venture capital", 9],
    ["surf before work", 5], ["tech layoffs", 7], ["climate tech", 7],
    ["CDMX weekends", 5], ["startup pivots", 8], ["yoga before 8am", 5],
    ["avocado toast", 6], ["wildfire season", 4], ["outdoor culture", 6],
    ["angel rounds", 7], ["Figma files", 5], ["product thinking", 7],
    ["Silver Lake", 4], ["the mission", 4], ["taco trucks", 5],
  ],

  "UK": [
    ["London calling", 8], ["the tube", 7], ["pub culture", 8],
    ["fintech", 9], ["proper breakfast", 10], ["flat whites", 7],
    ["tea debate", 7], ["Shoreditch scene", 6], ["Soho stories", 5],
    ["creative agencies", 6], ["grey skies", 5], ["bank holidays", 4],
    ["university networks", 5], ["the housing crisis", 6], ["media jobs", 5],
    ["Edinburgh fringe", 3], ["Deliveroo debates", 4], ["Brexit aftermath", 4],
  ],

  "Europe": [
    ["Amsterdam canals", 6], ["Berlin nights", 7], ["Paris mornings", 6],
    ["digital nomads", 9], ["remote first", 8], ["Copenhagen design", 5],
    ["Barcelona sun", 6], ["startup ecosystems", 7], ["EU funding", 5],
    ["work-life balance", 8], ["expat life", 7], ["weekend rail", 5],
    ["flat whites", 5], ["proper coffee", 6], ["language learning", 4],
    ["cultural exchange", 5], ["Schengen stories", 4], ["co-living", 5],
    ["Mediterranean diet", 4], ["founders visas", 5], ["slow mornings", 6],
  ],

  "Australia": [
    ["Sydney harbour", 7], ["Melbourne coffee", 10], ["startup culture", 6],
    ["timezone struggles", 6], ["beach before work", 7], ["flat whites", 9],
    ["Bondi vibes", 5], ["the bush", 4], ["cricket debates", 4],
    ["career FOMO", 5], ["visa conversations", 6], ["arvo adventures", 5],
    ["Sunday sessions", 6], ["outdoor bbq", 5], ["housing market", 7],
    ["global pivot", 5], ["Byron Bay", 4], ["early risers", 8],
  ],

  "Other": [
    ["global citizens", 7], ["time zones", 6], ["pioneer clubs", 5],
    ["founding members", 6], ["new cities", 7], ["expat networks", 6],
    ["cultural exchange", 5], ["building community", 7],
    ["first breakfast", 6], ["unexpected friends", 5],
  ],
};

// Spotlights: used for the floating "What we talked about at BK Club X" phrase
// Topics array is used to illuminate matching words in the background cloud
const WC_SPOTLIGHTS = [
  { displayName: "New York", region: "Northeast US", topics: [] },
  { displayName: "London", region: "UK", topics: [] },
  { displayName: "Amsterdam", region: "Europe", topics: [] },
  { displayName: "Los Angeles", region: "West Coast", topics: [] },
  { displayName: "Melbourne", region: "Australia", topics: [] },
  { displayName: "Copenhagen", region: "Europe", topics: [] },
  { displayName: "San Francisco", region: "West Coast", topics: [] },
  { displayName: "Berlin", region: "Europe", topics: [], photoTreatment: "polaroid-frame" },
  { displayName: "Miami", region: "Southeast US", topics: [] },
  { displayName: "Sydney", region: "Australia", topics: [] },
  { displayName: "Paris", region: "Europe", topics: [] },
  {
    displayName: "SOMa",
    region: "Northeast US",
    photo: "./assets/ken_stanek_watercolor_BK_Club_NJ.jpeg",
    attribution: "Artwork by Ken Stanek",
    topics: []
  },
  {
    displayName: "Hamptons",
    region: "Northeast US",
    photos: [
      "./assets/photos/Polaroid.png",
      "./assets/photos/Polaroid 2.png",
      "./assets/photos/Polaroid 3.png",
      "./assets/photos/Polaroid 4.png",
      "./assets/photos/Polaroid 5.png",
      "./assets/photos/Polaroid 6.png",
    ],
    topics: []
  }
];
