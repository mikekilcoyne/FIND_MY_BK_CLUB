import { buildTicket, classifyApproval } from "../netlify/functions/lib/club-update-intake.js";

const scenarios = [
  {
    name: "Direct trusted approval",
    payload: {
      from: "Mike Kilcoyne <mike@mikekilcoyne.com>",
      subject: "APPROVE: update Williamsburg to 8:30am at Cafe Collette",
      text: "Club: New York — Williamsburg\nPlease update the venue to Cafe Collette and move start time to 8:30am.",
    },
  },
  {
    name: "Forwarded by trusted approver",
    payload: {
      from: "mk@yellowsatinjacket.com",
      subject: "Fwd: host note for Toronto",
      text: `Forwarded message:

From: host@example.com
Subject: APPROVE: Toronto is now every other Wednesday

Toronto should now run every other Wednesday at 8am.`,
    },
  },
  {
    name: "Untrusted sender stays pending",
    payload: {
      from: "host@example.com",
      subject: "Toronto change",
      text: "Please move Toronto to 8am at Sud Forno.",
    },
  },
  {
    name: "Trusted sender approval in body",
    payload: {
      from: "mike@mikekilcoyne.com",
      subject: "Re: Breakfast Club update request",
      text: "APPROVE\n\nLooks good to me.",
    },
  },
];

for (const scenario of scenarios) {
  const approval = classifyApproval(scenario.payload);
  const ticket = buildTicket(scenario.payload);

  console.log(`\n### ${scenario.name}`);
  console.log(JSON.stringify({ approval, ticket }, null, 2));
}
