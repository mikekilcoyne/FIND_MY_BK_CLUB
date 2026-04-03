const TRUSTED_APPROVERS = [
  "mike@mikekilcoyne.com",
  "mk@yellowsatinjacket.com",
];

const APPROVAL_SUBJECT_PREFIX = "approve:";
const APPROVAL_BODY_TOKEN = "approve";

function normalizeEmail(value = "") {
  const match = String(value).match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  return match ? match[0].toLowerCase() : "";
}

function normalizeSubject(value = "") {
  return String(value).trim().toLowerCase();
}

function hasApprovalPrefix(subject = "") {
  return normalizeSubject(subject).startsWith(APPROVAL_SUBJECT_PREFIX);
}

function hasApprovalBodyToken(value = "") {
  return /\bapprove\b/i.test(String(value || ""));
}

function parseAddressList(value = "") {
  return String(value)
    .split(/[,\n]/)
    .map((item) => normalizeEmail(item))
    .filter(Boolean);
}

function parseForwardedMessage(value = "") {
  const text = String(value || "");
  const forwardedFromMatch = text.match(/^\s*from:\s*(.+)$/im);
  const forwardedSubjectMatch = text.match(/^\s*subject:\s*(.+)$/im);
  const forwardedReplyToMatch = text.match(/^\s*reply-to:\s*(.+)$/im);

  return {
    forwardedFrom: normalizeEmail(forwardedFromMatch ? forwardedFromMatch[1] : ""),
    forwardedReplyTo: normalizeEmail(forwardedReplyToMatch ? forwardedReplyToMatch[1] : ""),
    forwardedSubject: forwardedSubjectMatch ? forwardedSubjectMatch[1].trim() : "",
  };
}

function classifyApproval(payload = {}) {
  const fromEmail = normalizeEmail(payload.from || payload.sender || payload.envelopeFrom || "");
  const replyToEmail = normalizeEmail(payload.replyTo || "");
  const subject = String(payload.subject || "").trim();
  const textBody = String(payload.text || payload.strippedText || payload.htmlText || payload.notes || "");
  const trustedForwarder = TRUSTED_APPROVERS.includes(fromEmail) || TRUSTED_APPROVERS.includes(replyToEmail);
  const forwarded = parseForwardedMessage(textBody);

  const reasons = [];

  if (TRUSTED_APPROVERS.includes(fromEmail) && hasApprovalPrefix(subject)) {
    reasons.push("trusted-from-with-approve-subject");
  }

  if (!reasons.length && TRUSTED_APPROVERS.includes(replyToEmail) && hasApprovalPrefix(subject)) {
    reasons.push("trusted-reply-to-with-approve-subject");
  }

  if (!reasons.length && trustedForwarder && hasApprovalPrefix(subject)) {
    reasons.push("trusted-forward-with-approve-subject");
  }

  if (
    !reasons.length &&
    trustedForwarder &&
    hasApprovalPrefix(forwarded.forwardedSubject || "")
  ) {
    reasons.push("trusted-forward-with-approve-forwarded-subject");
  }

  if (!reasons.length && TRUSTED_APPROVERS.includes(fromEmail) && hasApprovalBodyToken(textBody)) {
    reasons.push("trusted-from-with-approve-body");
  }

  if (!reasons.length && TRUSTED_APPROVERS.includes(replyToEmail) && hasApprovalBodyToken(textBody)) {
    reasons.push("trusted-reply-to-with-approve-body");
  }

  return {
    approved: reasons.length > 0,
    reasons,
    fromEmail,
    replyToEmail,
    forwarded,
    trustedForwarder,
  };
}

function buildTicket(payload = {}) {
  const approval = classifyApproval(payload);
  const submittedAt = String(payload.receivedAt || payload.submittedAt || new Date().toISOString());
  const club = String(payload.club || payload.city || payload.displayCity || payload.subject || "Unknown club").trim();
  const notes = String(
    payload.notes ||
      payload.text ||
      payload.strippedText ||
      payload.htmlText ||
      ""
  ).trim();

  return {
    id: String(payload.id || `club-update-${Date.now()}`),
    source: payload.source || "email_inbox",
    submittedAt,
    club,
    notes,
    email: approval.fromEmail || approval.replyToEmail || "",
    replyTo: approval.replyToEmail || "",
    subject: String(payload.subject || "").trim(),
    status: approval.approved ? "approved" : "pending",
    approvalReasons: approval.reasons,
    forwarded: approval.forwarded,
    raw: {
      from: String(payload.from || ""),
      replyTo: String(payload.replyTo || ""),
      to: String(payload.to || ""),
      subject: String(payload.subject || ""),
    },
  };
}

export {
  APPROVAL_SUBJECT_PREFIX,
  APPROVAL_BODY_TOKEN,
  TRUSTED_APPROVERS,
  buildTicket,
  classifyApproval,
  hasApprovalBodyToken,
  hasApprovalPrefix,
  normalizeEmail,
  parseForwardedMessage,
};
