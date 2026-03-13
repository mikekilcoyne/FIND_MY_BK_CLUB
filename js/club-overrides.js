// Master override map shared across list + calendar views.
// Keep this as the single source of truth for curated club data fixes.
window.CLUB_OVERRIDES = {
  austin: {
    displayCity: "Austin",
    cadence: "Pop-Up",
    time: "Sunday, 8:30am CDT",
    venue: "Nate's Baked Goods & Coffee, 401 W 18th St",
    hostDisplay: "Eric Korsh",
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
    hostDisplay: "Eric Korsh",
    specificDates: ["2026-03-15"],
    locationNote: "SXSW Pop-Up",
    flyerURL: "assets/SXSW_2026-3-15.png",
    featured: true,
  },
  "amsterdam, nl": {
    displayCity: "Amsterdam",
    cadence: "Monthly",
    time: "Second Friday, 8:30am",
    venue: "Skina, Bilderdijkstraat 113",
    specificDates: ["2026-03-13"],
  },
  "portland, or": {
    cadence: "Weekly",
    time: "Tuesdays, 9:00am",
    venue: "It's Just a Feeling",
  },
  toronto: {
    cadence: "Weekly",
    time: "Wednesdays, 8:30am",
    venue: "Boxcar Social Laneway",
  },
  "mexico city": {
    cadence: "Weekly",
    time: "Wednesdays, 8:30am",
    venue: "Mendl",
  },
  miami: {
    cadence: "Weekly",
    time: "Wednesdays, 9:00am",
    venue: "Novela Cafe Social",
  },
  "san francisco, ca": {
    displayCity: "SF",
    cadence: "Weekly",
    time: "Wednesdays, 9:00am PT",
    venue: "Terrene at 1 Hotel, 8 Mission St",
  },
  "new york - williamsburg": {
    cadence: "Weekly",
    time: "Wednesdays, 8:30am",
    venue: "Le Crocodile",
    linkedinURL: "https://www.linkedin.com/in/dietznutz",
    hostDisplay: "Ben Dietz (@bendietz)",
  },
  "new york - hamptons": {
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
    hostDisplay: "@themichaelkilcoyne + @adamh929",
  },
  "new york - downtown brooklyn": {
    cadence: "Weekly",
    time: "Thursdays, 8:30am",
    venue: "Ace Hotel Downtown Brooklyn (Lobby)",
  },
  "new york - les": {
    cadence: "Weekly",
    time: "Thursdays, 9:00am",
    venue: "Rule 257, 234 Eldridge",
  },
  "washington dc": {
    cadence: "Bi-Weekly",
    time: "Thursdays, 8:30am",
    venue: "Line Hotel, Adams Morgan",
  },
  "seattle, washington": {
    displayCity: "Seattle",
    cadence: "Monthly",
    time: "Second Thursday, 8:00am",
    venue: "Mr. West Downtown Seattle",
    specificDates: ["2026-03-12"],
  },
  "soma, nj, usa": {
    cadence: "Weekly",
    time: "Fridays, 9:15am",
    venue: "Arties",
  },
  "surf coast - torquay": {
    displayCity: "Torquay",
    cadence: "Monthly",
    time: "Second Friday, 8:00am - 9:30am",
    venue: "Bomboras",
    specificDates: ["2026-03-13"],
  },
  vienna: {
    displayCity: "Vienna",
    cadence: "Monthly",
    time: "Second Thursday, 9:00am",
    venue: "Cafe Francais",
    specificDates: ["2026-03-12"],
  },
  milan: {
    displayCity: "Milano",
    cadence: "Monthly",
    time: "Fourth Tuesday, 6:00pm - 9:00pm",
    venue: "The Urban Society, Via Pietrasanta 14",
    specificDates: ["2026-03-24"],
    isNight: true,
  },
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
    instagramHandles: ["@kor.sh"],
    specificDates: ["2026-03-15"],
    locationNote: "SXSW Pop-Up",
    flyerURL: "assets/SXSW_2026-3-15.png",
    isNight: false,
  },
];
