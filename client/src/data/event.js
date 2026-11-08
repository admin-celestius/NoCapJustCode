// client/src/data/event.js
// Single source of truth for the LARPER OR CODER event.
// All confirmed copy, pricing, schedule, and event details.

export const CLUB_NAME = "Celestius";
export const EVENT_YEAR = 2026;
export const SHOW_UNCONFIRMED = false;
export const PAIR_SIZE = 2;

export const QUOTE = "The more u larp, the less u larp.";
export const QUOTE_ATTRIBUTION = "Definitely not Albert Einstein";
export const QUOTE_ATTRIBUTION_ALTERNATIVES = [
  "The Thinker, still stuck on the same bug",
  "Anonymous senior dev, 4 AM",
  "A rubber duck, after hearing your code",
];

export const LINK_TARGET = "_blank";

export const PRICING = {
  perHead: 149,
  pair: 149 * 2, // 298 with Hommiee
};

export const PAYMENT_NOTE = "Payment instructions will be shared by the organizers.";

export const eventData = {
  name: "LARPER OR CODER",
  edition: null,
  presentedBy: CLUB_NAME,
  tagline: "no larping. only coding.",
  description:
    "A battleground where resume buzzwords don't save you. Only pure logic and locked-in problem solving.",

  date: "13 November 2026",
  venue: "Informed through message",
  ticketUrl: "https://makemypass.com/larper-or-coder",

  pricingSummary: {
    pair: `₹${PRICING.pair} with Hommiee`,
    split: `₹${PRICING.perHead} × 2 coders · covers both events`,
    splitShort: `₹${PRICING.perHead} × 2 coders`,
  },

  connect: {
    website: "https://www.celestius.in/",
    websiteLabel: "celestius.in",
    instagram: "https://www.instagram.com/celestius_cit/",
    instagramLabel: "@celestius_cit",
  },

  fees: {
    perHead: `₹${PRICING.perHead}`,
    pair: `₹${PRICING.pair}`,
    note: "Includes The Training Arc and TLE",
  },

  stats: [
    { label: "tracks", value: "2" },
    { label: "day", value: "1" },
    { label: "presented by", value: CLUB_NAME },
  ],

  schedule: [
    {
      id: "inauguration",
      time: "10:00 AM - 10:15 AM",
      startHour: "10:00 AM",
      title: "Inauguration",
      type: "Ceremony",
      description: "Formal inauguration.",
      highlight: false,
    },
    {
      id: "workshop",
      time: "10:15 AM - 11:15 AM",
      startHour: "10:15 AM",
      title: "The Training Arc",
      type: "Workshop",
      description:
        "A hands-on workshop on competitive coding and problem-solving, conducted by a top coder of CIT, a 3rd year senior.",
      highlight: true,
      eventId: "training-arc",
    },
    {
      id: "lunch",
      time: "11:15 AM - 12:00 PM",
      startHour: "11:15 AM",
      title: "Lunch Break",
      type: "Break",
      description: "Refuel and strategize before the battle.",
      highlight: false,
    },
    {
      id: "competition",
      time: "12:00 PM - 2:30 PM",
      startHour: "12:00 PM",
      title: "TLE: Think, Lock In, Execute",
      type: "Competition",
      description:
        "DEADLOCK Coding Competition with two rounds: Tug of Aura and Who's the GOAT?",
      highlight: true,
      eventId: "tle",
    },
    {
      id: "results",
      time: "2:30 PM - 3:00 PM",
      startHour: "2:30 PM",
      title: "Results & Prize Distribution",
      type: "Closing",
      description:
        "Winners announced, prizes handed out, concluding the day.",
      highlight: false,
    },
  ],

  events: [
    {
      id: "training-arc",
      numeral: "01",
      eyebrow: "WORKSHOP 01",
      tagLabel: "WORKSHOP",
      title: "The Training Arc",
      badge: "Workshop",
      time: "10:15 AM to 11:15 AM",
      accentColor: "#F26B3A",
      registrationType: "pair",
      blurb:
        "A hands-on workshop on competitive coding and problem-solving, conducted by a top coder of CIT, a 3rd year senior.",
      about:
        "A hands-on workshop on competitive coding and problem-solving, conducted by a top coder of CIT, a 3rd year senior.",
      metaChips: [
        { label: "13 Nov 2026", type: "date" },

        { label: "With Hommiee", type: "entry" },
      ],
      instructor: {
        name: "a top coder of CIT",
        role: "3rd year senior",
        initials: "NA",
      },
      atAGlance: [
        { label: "Time", value: "10:15 AM to 11:15 AM" },
        { label: "Date", value: "13 November 2026" },
        { label: "Venue", value: "Informed through message" },
        { label: "Entry", value: "One registration with Hommiee covers both events" },
      ],
      photoCaption: "From our past workshops",
    },
    {
      id: "tle",
      numeral: "02",
      eyebrow: "COMPETITION 02",
      tagLabel: "COMPETITION",
      title: "TLE: Think, Lock In, Execute",
      badge: "DEADLOCK Competition",
      time: "12:00 PM to 2:30 PM",
      accentColor: "#FAA012",
      registrationType: "pair",
      teamSize: PAIR_SIZE,
      blurb:
        "DEADLOCK Coding Competition with two rounds: Tug of Aura and Who's the GOAT?",
      metaChips: [
        { label: "13 Nov 2026", type: "date" },

        { label: "With Hommiee", type: "entry" },
      ],
      overview: {
        about:
          "DEADLOCK Coding Competition with two rounds: Tug of Aura and Who's the GOAT?",
        format:
          "Participate in pairs. One registration covers The Training Arc and TLE.",
        atAGlance: [
          { label: "Time", value: "12:00 PM to 2:30 PM" },
          { label: "Date", value: "13 November 2026" },
          { label: "Venue", value: "Informed through message" },
          { label: "Results and prizes", value: "2:30 PM to 3:00 PM" },
        ],
      },
      round1: {
        name: "Tug of Aura",
        tag: "Digital Tug-of-War",
        description:
          "Teams Alpha and Omega compete in a live digital tug-of-war; every coding challenge solved pulls the rope toward their side, so speed, accuracy and teamwork decide control of the system's Kinetic Force.",
      },
      round2: {
        name: "Who's the GOAT?",
        tag: "Crack the Code",
        description:
          "Terminal-style environment, only input and output test cases, no problem statement; teams reverse-engineer the logic and write the correct algorithm within a strict time limit.",
        sampleRows: [
          { input: "[12, 5, 8, 19, 3]", output: "39" },
          { input: "[4, 4, 4, 4]", output: "16" },
          { input: "[100, 25, -10]", output: "115" },
        ],
        rawIoNotice: "Only Raw Input & Output Provided · No Complexity Clues · No Problem Statement",
      },
      stepper: [
        {
          time: "12:00 PM to 2:30 PM",
          title: "DEADLOCK",
          subItems: ["Round 1: Tug of Aura", "Round 2: Who's the GOAT?"],
        },
        {
          time: "2:30 PM to 3:00 PM",
          title: "Results & Prize Distribution",
        },
      ],
      noteCard: "With Hommiee. One registration covers both events.",
    },
  ],
};
