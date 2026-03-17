// Master override map shared across list + calendar views.
// Keep this as the single source of truth for curated club data fixes.
window.CLUB_OVERRIDES = {
  austin: {
    displayCity: "Austin",
    cadence: "Pop-Up",
    time: "Sunday, 8:30am CDT",
    venue: "Nate's Baked Goods & Coffee, 401 W 18th St",
    hostDisplay: "Eric Korsh (@erickorsh)",
    specificDates: ["2026-03-15"],
    locationNote: "SXSW Pop-Up",
    flyerURL: "assets/SXSW_2026-3-15.png",
    featured: true,
  },
  "austin, tx": {
    displayCity: "Austin",
    cadence: "Pop-Up",
    time: "Sunday, 8:30am CDT",
    venue: "Nate's Baked Goods & Coffee, 401 W 18th St",
    hostDisplay: "Eric Korsh (@erickorsh)",
    specificDates: ["2026-03-15"],
    locationNote: "SXSW Pop-Up",
    flyerURL: "assets/SXSW_2026-3-15.png",
    featured: true,
  },

  // ── Europe ────────────────────────────────────────────────────────────────
  "amsterdam, nl": {
    displayCity: "Amsterdam, NL",
    cadence: "Monthly",
    time: "Second Friday, 8:30am",
    venue: "Skina, Bilderdijkstraat 113",
    specificDates: ["2026-03-13"],
  },
  "barcelona, spain":    { displayCity: "Barcelona, ES" },
  "bassano del grappa, italy": { displayCity: "Bassano del Grappa, IT" },
  "berlin":              { displayCity: "Berlin, DE" },
  "biarritz, fr":        { displayCity: "Biarritz, FR" },
  "copenhagen":          { displayCity: "Copenhagen, DK" },
  "ibiza, spain":        { displayCity: "Ibiza, ES" },
  "lugano, switzerland": { displayCity: "Lugano, CH" },
  "paris, france":       { displayCity: "Paris, FR" },
  "milano": {
    displayCity: "Milano, IT",
    cadence: "Monthly",
    time: "Fourth Tuesday, 6:00pm - 9:00pm",
    venue: "The Urban Society, Via Pietrasanta 14",
    specificDates: ["2026-03-24"],
    isNight: true,
  },
  vienna: {
    displayCity: "Vienna, AT",
    cadence: "Monthly",
    time: "Second Thursday, 9:00am",
    venue: "Cafe Francais",
    specificDates: ["2026-03-12"],
  },

  // ── UK ────────────────────────────────────────────────────────────────────
  "brighton, uk":  { displayCity: "Brighton, UK" },
  "london, uk":    { displayCity: "London, UK" },
  "norwich, uk":   { displayCity: "Norwich, UK" },

  // ── Northeast US ──────────────────────────────────────────────────────────
  "boston":          { displayCity: "Boston, MA" },
  "burlington, vermont": { displayCity: "Burlington, VT" },
  "cambridge, ma":   { displayCity: "Cambridge, MA" },
  "new york - downtown brooklyn": {
    displayCity: "New York — Downtown Brooklyn, NY",
    cadence: "Weekly",
    time: "Thursdays, 8:30am",
    venue: "Ace Hotel Downtown Brooklyn (Lobby)",
  },
  "new york - hamptons": {
    displayCity: "New York — Hamptons, NY",
    cadence: "Weekly",
    time: "Wednesdays, 8:30am",
    venue: "Tutto Cafe",
    extraSocials: [
      {
        type: "instagram",
        url: "https://www.instagram.com/themichaelkilcoyne/",
        title: "Host Instagram",
      },
      {
        type: "linkedin",
        url: "https://www.linkedin.com/in/mikekilcoyne/",
        title: "Host LinkedIn",
      },
      {
        type: "instagram",
        url: "https://www.instagram.com/adamh929/",
        title: "Co-host Instagram",
      },
    ],
    hostDisplay: "@themichaelkilcoyne | @adamh929",
  },
  "new york - hudson":   { displayCity: "New York — Hudson, NY" },
  "new york - kingston": { displayCity: "New York — Kingston, NY" },
  "new york - les": {
    displayCity: "New York — LES, NY",
    cadence: "Weekly",
    time: "Thursdays, 9:00am",
    venue: "Rule 257, 234 Eldridge",
  },
  "new york - williamsburg": {
    displayCity: "New York — Williamsburg, NY",
    cadence: "Weekly",
    time: "Wednesdays, 8:30am",
    venue: "Le Crocodile",
    linkedinURL: "https://www.linkedin.com/in/dietznutz",
    hostDisplay: "Ben Dietz (@bendietz)",
  },
  "philadelphia, pa": { displayCity: "Philadelphia, PA" },
  "portland, maine":  { displayCity: "Portland, ME", hideInstagram: true, linkedinURL: "https://www.linkedin.com/groups/13161347" },
  "soma, nj, usa": {
    displayCity: "Maplewood, NJ",
    cadence: "Weekly",
    time: "Fridays, 9:15am",
    venue: "Arties",
  },
  "washington dc": {
    displayCity: "Washington, DC",
    cadence: "Bi-Weekly",
    time: "Thursdays, 8:30am",
    venue: "Line Hotel, Adams Morgan",
  },

  // ── Southeast US ──────────────────────────────────────────────────────────
  "atlanta, ga": { displayCity: "Atlanta, GA" },
  miami: {
    displayCity: "Miami, FL",
    cadence: "Weekly",
    time: "Wednesdays, 9:00am",
    venue: "Novela Cafe Social",
  },

  // ── West Coast ────────────────────────────────────────────────────────────
  "los angeles": { displayCity: "Los Angeles, CA" },
  "portland, or": {
    displayCity: "Portland, OR",
    cadence: "Weekly",
    time: "Tuesdays, 9:00am",
    venue: "It's Just a Feeling",
  },
  "san francisco, ca": {
    displayCity: "San Francisco, CA",
    cadence: "Weekly",
    time: "Wednesdays, 9:00am PT",
    venue: "Terrene at 1 Hotel, 8 Mission St",
  },
  "seattle, washington": {
    displayCity: "Seattle, WA",
    cadence: "Monthly",
    time: "Second Thursday, 8:00am",
    venue: "Mr. West Downtown Seattle",
    specificDates: ["2026-03-12"],
  },

  // ── Other ─────────────────────────────────────────────────────────────────
  "boulder, co":          { displayCity: "Boulder, CO" },
  "chicago, usa":         { displayCity: "Chicago, IL" },
  "denver":               { displayCity: "Denver, CO" },
  "manila, philippines":  { displayCity: "Manila, PH" },
  "mexico city": {
    displayCity: "Mexico City, MX",
    cadence: "Weekly",
    time: "Wednesdays, 8:30am",
    venue: "Mendl",
  },
  "panama city": { displayCity: "Panama City, Panama" },
  toronto: {
    displayCity: "Toronto, ON",
    cadence: "Weekly",
    time: "Wednesdays, 8:30am",
    venue: "Boxcar Social Laneway",
  },
  vegas: { displayCity: "Las Vegas, NV" },

  // ── Australia ─────────────────────────────────────────────────────────────
  "melbourne - fitzroy":  { displayCity: "Melbourne — Fitzroy, AU" },
  "melbourne - richmond": { displayCity: "Melbourne — Richmond, AU" },
  "perth":                { displayCity: "Perth, AU" },
  "surf coast - torquay": {
    displayCity: "Torquay, AU",
    cadence: "Monthly",
    time: "Second Friday, 8:00am - 9:30am",
    venue: "Bomboras",
    specificDates: ["2026-03-13"],
  },
  "sydney, au": { displayCity: "Sydney, AU" },
};

// Pop-up and one-off clubs not in the main sheet — merged directly into calendar + list views.
window.STATIC_CLUBS = [
  {
    city: "Austin",
    displayCity: "Austin",
    cadence: "Pop-Up",
    time: "Sunday, 8:30am CDT",
    venue: "Nate's Baked Goods & Coffee, 401 W 18th St",
    hostName: "Eric Korsh",
    instagramHandles: ["@erickorsh"],
    specificDates: ["2026-03-15"],
    locationNote: "SXSW Pop-Up",
    flyerURL: "assets/SXSW_2026-3-15.png",
    isNight: false,
  },
];
