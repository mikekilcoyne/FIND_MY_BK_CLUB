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
    'Been thinking a lot lately about the value of "bridging" social capital, and really how finding the right communities can not only change our perspective, but maybe even the world around us, too.',
    "Let's continue building out this amazing, open, everyone's-invited kind of community.",
  ],
  introLinkedParagraph:
    'Watch this interview with Robert Putnam, creator of "Bowling Alone," to hear his perspective on the importance of communities (shared around 5:30).',
  introLinkURL: "https://www.youtube.com/watch?v=FOP_G2eiLo0",
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

function buildIntroText(copy) {
  const parts = [...(copy.introParagraphs || [])];
  if (copy.introLinkedParagraph && copy.introLinkURL) {
    parts.splice(1, 0, `${copy.introLinkedParagraph} ${copy.introLinkURL}`);
  }
  return parts;
}

export function sanitizeCityForFlyer(city = "") {
  return String(city).replace(/[^a-zA-Z]/g, "") || "City";
}

export function buildTopNotice(mode, copy) {
  const C = copy || HOST_REMINDER_COPY;
  if (mode !== "correction") {
    return { text: "", html: "" };
  }

  return {
    text: `${C.correctionIntro}

${C.correctionLeadIn}
`,
    html: `
  <p style="font-size: 15px; line-height: 1.6;">
    ${escapeHtml(C.correctionIntro)}
  </p>
  <p style="font-size: 15px; line-height: 1.6; font-weight: 600;">
    ${escapeHtml(C.correctionLeadIn)}
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
  { mode = "scheduled", links = HOST_REMINDER_LINKS, copy: copyOverride = {} } = {},
) {
  const copy = { ...HOST_REMINDER_COPY, ...copyOverride };
  const activeLinks = { ...HOST_REMINDER_LINKS, ...links };
  const { text: updateBlock } = buildUpdateBlock(cities, targetSunday, activeLinks);
  const { text: topNotice } = buildTopNotice(mode, copy);
  const cityLead = cities.length <= 1
    ? `For ${cities[0] || "your club"}, here's where to update:`
    : "For your clubs, here's where to update:";

  return [
    copy.greeting,
    topNotice.trim(),
    buildIntroText(copy).join("\n\n"),
    `On that same note: ${cityLead}`,
    "──────────────────────────",
    updateBlock,
    copy.closing,
    copy.signoff,
    `Questions? ${copy.questionsEmail}`,
    copy.postscript,
    "---",
    (copy.footerLines || HOST_REMINDER_COPY.footerLines).join("\n"),
  ].filter(Boolean).join("\n\n");
}

export function buildEmailHTML(
  cities,
  targetSunday,
  { mode = "scheduled", links = HOST_REMINDER_LINKS, copy: copyOverride = {} } = {},
) {
  const copy = { ...HOST_REMINDER_COPY, ...copyOverride };
  const activeLinks = { ...HOST_REMINDER_LINKS, ...links };
  const { html: updateBlock } = buildUpdateBlock(cities, targetSunday, activeLinks);
  const { html: topNotice } = buildTopNotice(mode, copy);
  const cityLead = cities.length <= 1
    ? `For <strong>${escapeHtml(cities[0] || "your club")}</strong>, here's where to update:`
    : "For your clubs, here's where to update:";

  return `
<div style="font-family: Georgia, serif; max-width: 540px; margin: 0 auto; color: #1a1a1a; padding: 32px 24px;">
  <p style="font-size: 15px; line-height: 1.6;">${escapeHtml(copy.greeting)}</p>
  ${topNotice}
  <p style="font-size: 15px; line-height: 1.6;">${escapeHtml(copy.introParagraphs[0] || "")}</p>
  <p style="font-size: 15px; line-height: 1.6;">
    <a href="${escapeHtml(copy.introLinkURL)}" style="color: #b07d3a;">${escapeHtml(copy.introLinkedParagraph)}</a>
  </p>
  <p style="font-size: 15px; line-height: 1.6;">${escapeHtml(copy.introParagraphs[1] || "")}</p>
  <p style="font-size: 15px; line-height: 1.6;">On that same note: ${cityLead}</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
  ${updateBlock}
  <p style="font-size: 15px; line-height: 1.6;">${escapeHtml(copy.closing)}</p>
  <p style="font-size: 15px; line-height: 1.6;">${escapeHtml(copy.signoff)}</p>
  <p style="font-size: 14px; line-height: 1.8; color: #666; margin-top: 32px;">
    Questions? <a href="mailto:${escapeHtml(copy.questionsEmail)}" style="color: #b07d3a;">${escapeHtml(copy.questionsEmail)}</a>
  </p>
  <p style="font-size: 14px; line-height: 1.6; color: #666;">
    ${escapeHtml(copy.postscript)}
  </p>
  <p style="font-size: 12px; line-height: 1.6; color: #999; margin-top: 24px; border-top: 1px solid #eee; padding-top: 16px;">
    ${(copy.footerLines || HOST_REMINDER_COPY.footerLines).map(escapeHtml).join("<br>\n    ")}
  </p>
</div>`;
}

export function buildSubject(
  cities,
  {
    mode = "scheduled",
    singleClubSubject,
    multiClubSubject,
    copy: copyOverride = {},
  } = {},
) {
  const copy = { ...HOST_REMINDER_COPY, ...copyOverride };
  if (mode === "correction") {
    return copy.correctionSubject;
  }

  if (cities.length <= 1) {
    return singleClubSubject || `BC reminder - update your ${cities[0] || "club"} listing`;
  }

  return multiClubSubject || copy.multiClubSubject;
}
