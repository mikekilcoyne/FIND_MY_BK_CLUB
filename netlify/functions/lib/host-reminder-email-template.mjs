export const HOST_REMINDER_LINKS = {
  sheet: "https://docs.google.com/spreadsheets/d/1_4MoIXgSHjERztj0LPPC-XAa7nzFlfrdcjEQdBeSqto/edit",
  drive: "https://drive.google.com/drive/folders/1RghGzP25aW2chs1aPGxAzE9fZgFHucRe",
  latestHappenings: "https://breakfastclubbing.com/what-we-talked-about",
};

export const HOST_REMINDER_COPY = {
  greeting: "Hey hosts,",
  correctionIntro: "Kilcoyne's working out some kinks. Sends his apologies for the annoying email spam yesterday.",
  correctionLeadIn: "What I meant to send below:",
  introParagraphs: [
    "BC just hit 100 newsletters.",
    "All I have to say to celebrate is this: From the beginning it's always been about creating maximum value with minimum effort. Show up at the same restaurant, same day, same hour, and commune with whoever walks in.",
    "No RSVPs means nobody to keep track of; no theme means the shape is dynamic; no cost of entry means nobody has to worry about ticket sales; and no pitches means no complaining after the fact.",
    "Thank you to all of you amazing hosts for turning this into a real, global community.",
  ],
  closing: "If everything's good, you're good.",
  signoff: "— Ben Dietz",
  questionsEmail: "ben@breakfastclubbing.com",
  postscript:
    "p.s. — Any cool ideas for the site? Email mike@breakfastclubbing.com and he'll make it happen. Big thanks to Kilcoyne for making this happen.",
  footerLines: [
    "Breakfast Club HQ · New York, NY",
    "You're receiving this because you host a Breakfast Club location.",
    'To stop receiving these emails, reply with "unsubscribe" and we\'ll remove you.',
  ],
  correctionSubject: "Sorry!",
  multiClubSubject: "BC reminder - update your club listings",
};

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function sanitizeCityForFlyer(city = "") {
  return String(city).replace(/[^a-zA-Z]/g, "") || "City";
}

export function buildTopNotice(mode) {
  if (mode !== "correction") {
    return { text: "", html: "" };
  }

  return {
    text: `${HOST_REMINDER_COPY.correctionIntro}

${HOST_REMINDER_COPY.correctionLeadIn}
`,
    html: `
  <p style="font-size: 15px; line-height: 1.6;">
    ${escapeHtml(HOST_REMINDER_COPY.correctionIntro)}
  </p>
  <p style="font-size: 15px; line-height: 1.6; font-weight: 600;">
    ${escapeHtml(HOST_REMINDER_COPY.correctionLeadIn)}
  </p>`,
  };
}

export function buildUpdateBlock(
  cities,
  targetSunday,
  { sheetLink = HOST_REMINDER_LINKS.sheet, driveLink = HOST_REMINDER_LINKS.drive } = {},
) {
  const cycleDate = targetSunday.toISOString().split("T")[0];
  const flyerExamples = cities.map((city) => `${city}: ${sanitizeCityForFlyer(city)}_${cycleDate}.jpg`);

  if (cities.length <= 1) {
    const city = cities[0] || "your club";
    const example = `${sanitizeCityForFlyer(city)}_${cycleDate}.jpg`;
    return {
      text: `For ${city}, here's where to update:

→ Master Sheet (update your listing): ${sheetLink}
→ Flyer Folder (upload this week's flyer): ${driveLink}

Flyer naming: City_YYYY-MM-DD.jpg (e.g. ${example})`,
      html: `
  <p style="font-size: 15px; line-height: 1.6;">
    For <strong>${escapeHtml(city)}</strong>, here's where to update:
  </p>
  <p style="font-size: 15px; line-height: 1.8;">
    → <a href="${escapeHtml(sheetLink)}" style="color: #b07d3a;">Master Sheet</a> (update your listing)<br>
    → <a href="${escapeHtml(driveLink)}" style="color: #b07d3a;">Flyer Folder</a> (upload this week's flyer)
  </p>
  <p style="font-size: 13px; line-height: 1.6; color: #666;">
    Flyer naming: City_YYYY-MM-DD.jpg (e.g. <code>${escapeHtml(example)}</code>)
  </p>`,
    };
  }

  return {
    text: `For your clubs, here's where to update:

Clubs on your list: ${cities.join(", ")}

→ Master Sheet (update your listings): ${sheetLink}
→ Flyer Folder (upload this week's flyers): ${driveLink}

Flyer naming: City_YYYY-MM-DD.jpg
${flyerExamples.map((example) => `- ${example}`).join("\n")}`,
    html: `
  <p style="font-size: 15px; line-height: 1.6;">
    For your clubs, here's where to update:
  </p>
  <p style="font-size: 15px; line-height: 1.6;">
    <strong>Clubs on your list:</strong> ${escapeHtml(cities.join(", "))}
  </p>
  <p style="font-size: 15px; line-height: 1.8;">
    → <a href="${escapeHtml(sheetLink)}" style="color: #b07d3a;">Master Sheet</a> (update your listings)<br>
    → <a href="${escapeHtml(driveLink)}" style="color: #b07d3a;">Flyer Folder</a> (upload this week's flyers)
  </p>
  <p style="font-size: 13px; line-height: 1.6; color: #666;">
    Flyer naming: City_YYYY-MM-DD.jpg<br>
    ${flyerExamples.map((example) => `<span style="display: block;">- <code>${escapeHtml(example)}</code></span>`).join("")}
  </p>`,
  };
}

export function buildEmailBody(
  cities,
  targetSunday,
  { mode = "scheduled", links = HOST_REMINDER_LINKS } = {},
) {
  const { text: updateBlock } = buildUpdateBlock(cities, targetSunday, links);
  const { text: topNotice } = buildTopNotice(mode);
  const cityLead = cities.length <= 1
    ? `For ${cities[0] || "your club"}, here's where to update:`
    : "For your clubs, here's where to update:";

  return [
    HOST_REMINDER_COPY.greeting,
    topNotice.trim(),
    HOST_REMINDER_COPY.introParagraphs.join("\n\n"),
    `On that same note: ${cityLead}`,
    "──────────────────────────",
    updateBlock,
    HOST_REMINDER_COPY.closing,
    HOST_REMINDER_COPY.signoff,
    `Questions? ${HOST_REMINDER_COPY.questionsEmail}`,
    HOST_REMINDER_COPY.postscript,
    "---",
    HOST_REMINDER_COPY.footerLines.join("\n"),
  ].filter(Boolean).join("\n\n");
}

export function buildEmailHTML(
  cities,
  targetSunday,
  { mode = "scheduled", links = HOST_REMINDER_LINKS } = {},
) {
  const { html: updateBlock } = buildUpdateBlock(cities, targetSunday, links);
  const { html: topNotice } = buildTopNotice(mode);
  const cityLead = cities.length <= 1
    ? `For <strong>${escapeHtml(cities[0] || "your club")}</strong>, here's where to update:`
    : "For your clubs, here's where to update:";

  return `
<div style="font-family: Georgia, serif; max-width: 540px; margin: 0 auto; color: #1a1a1a; padding: 32px 24px;">
  <p style="font-size: 15px; line-height: 1.6;">${escapeHtml(HOST_REMINDER_COPY.greeting)}</p>
  ${topNotice}
  ${HOST_REMINDER_COPY.introParagraphs.map((paragraph) => `<p style="font-size: 15px; line-height: 1.6;">${escapeHtml(paragraph)}</p>`).join("\n  ")}
  <p style="font-size: 15px; line-height: 1.6;">On that same note: ${cityLead}</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
  ${updateBlock}
  <p style="font-size: 15px; line-height: 1.6;">${escapeHtml(HOST_REMINDER_COPY.closing)}</p>
  <p style="font-size: 15px; line-height: 1.6;">${escapeHtml(HOST_REMINDER_COPY.signoff)}</p>
  <p style="font-size: 14px; line-height: 1.8; color: #666; margin-top: 32px;">
    Questions? <a href="mailto:${escapeHtml(HOST_REMINDER_COPY.questionsEmail)}" style="color: #b07d3a;">${escapeHtml(HOST_REMINDER_COPY.questionsEmail)}</a>
  </p>
  <p style="font-size: 14px; line-height: 1.6; color: #666;">
    p.s. — Any cool ideas for the site? Email <a href="mailto:mike@breakfastclubbing.com" style="color: #b07d3a;">mike@breakfastclubbing.com</a> and he'll make it happen. Big thanks to Kilcoyne for making this happen.
  </p>
  <p style="font-size: 12px; line-height: 1.6; color: #999; margin-top: 24px; border-top: 1px solid #eee; padding-top: 16px;">
    ${HOST_REMINDER_COPY.footerLines.map(escapeHtml).join("<br>\n    ")}
  </p>
</div>`;
}

export function buildSubject(
  cities,
  {
    mode = "scheduled",
    singleClubSubject,
    multiClubSubject = HOST_REMINDER_COPY.multiClubSubject,
  } = {},
) {
  if (mode === "correction") {
    return HOST_REMINDER_COPY.correctionSubject;
  }

  if (cities.length <= 1) {
    return singleClubSubject || `BC reminder - update your ${cities[0] || "club"} listing`;
  }

  return multiClubSubject;
}
