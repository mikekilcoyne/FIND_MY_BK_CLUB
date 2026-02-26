const COPY_KEY = "bkClubSiteCopy";
const DEFAULT_COPY = {
  siteTitle: "Breakfast Club",
  mainHeadline: "Find My Breakfast Club",
  hostCta: "become a host",
  searchPlaceholder: "search clubs"
};

const form = document.querySelector("#copy-form");
const resetBtn = document.querySelector("#reset-copy");
const status = document.querySelector("#save-status");

function getSavedCopy() {
  try {
    const raw = localStorage.getItem(COPY_KEY);
    if (!raw) return { ...DEFAULT_COPY };
    return { ...DEFAULT_COPY, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_COPY };
  }
}

function setFormValues(values) {
  Object.entries(values).forEach(([key, value]) => {
    if (form.elements[key]) {
      form.elements[key].value = value;
    }
  });
}

function saveCopy(values) {
  localStorage.setItem(COPY_KEY, JSON.stringify(values));
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const values = {
    siteTitle: (data.get("siteTitle") || "").toString().trim() || DEFAULT_COPY.siteTitle,
    mainHeadline: (data.get("mainHeadline") || "").toString().trim() || DEFAULT_COPY.mainHeadline,
    hostCta: (data.get("hostCta") || "").toString().trim() || DEFAULT_COPY.hostCta,
    searchPlaceholder:
      (data.get("searchPlaceholder") || "").toString().trim() || DEFAULT_COPY.searchPlaceholder
  };

  saveCopy(values);
  status.textContent = "Saved. Refresh the main site tab.";
});

resetBtn.addEventListener("click", () => {
  localStorage.removeItem(COPY_KEY);
  setFormValues(DEFAULT_COPY);
  status.textContent = "Reset to defaults.";
});

setFormValues(getSavedCopy());
