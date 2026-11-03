import { siteConfig } from "./config.js";

const iconPaths = {
  telegram: '<path d="m21 4-3 16-6.1-4.2-3.1 3v-5.2L18 6.8 6.7 12 2 10.5 21 4Z"></path>',
  telegramChannel: '<path d="m21 4-3 16-6.1-4.2-3.1 3v-5.2L18 6.8 6.7 12 2 10.5 21 4Z"></path>',
  youtube: '<path d="M21 8.2a2.7 2.7 0 0 0-1.9-1.9C17.4 5.8 12 5.8 12 5.8s-5.4 0-7.1.5A2.7 2.7 0 0 0 3 8.2 28 28 0 0 0 2.5 12 28 28 0 0 0 3 15.8a2.7 2.7 0 0 0 1.9 1.9c1.7.5 7.1.5 7.1.5s5.4 0 7.1-.5a2.7 2.7 0 0 0 1.9-1.9 28 28 0 0 0 .5-3.8 28 28 0 0 0-.5-3.8Z"></path><path d="m10 9 5 3-5 3V9Z"></path>',
  rutube: '<rect x="3" y="5" width="18" height="14" rx="4"></rect><path d="m10 9 5 3-5 3V9Z"></path>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle cx="17.4" cy="6.6" r=".8" fill="currentColor" stroke="none"></circle>',
  whatsapp: '<path d="M20.5 11.7a8.5 8.5 0 0 1-12.7 7.4L3 20.5l1.4-4.7a8.5 8.5 0 1 1 16.1-4.1Z"></path><path d="M8.1 7.8c.3-.7.6-.7 1-.7h.3l1.2 2.7c.1.3.1.5-.1.8l-.8 1c.8 1.6 1.9 2.6 3.6 3.3l.9-1.1c.2-.3.5-.3.8-.2l2.5 1.2c.3.1.4.4.4.7-.2 1.2-1 2.1-2.2 2.3-2 .3-4.7-.8-6.8-2.8-2.1-2-3.4-4.8-3-6.4.2-.4.4-.7.6-.9"></path>',
  phone: '<path d="M7.3 3H4.8C3.8 3 3 3.8 3 4.8 3 13.7 10.3 21 19.2 21c1 0 1.8-.8 1.8-1.8v-2.5l-4.1-1.1-1.2 2c-4.2-1.8-7.5-5.1-9.3-9.3l2-1.2L7.3 3Z"></path>',
  workEmail: '<rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m4 7 8 6 8-6"></path>',
  businessEmail: '<rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m4 7 8 6 8-6"></path>',
  github: '<path d="M15 22v-4c.1-1-.3-1.8-.8-2.3 2.8-.3 5.8-1.4 5.8-6.2 0-1.4-.5-2.5-1.3-3.4.1-.3.6-1.7-.1-3.4 0 0-1.1-.3-3.5 1.3a12.2 12.2 0 0 0-6.2 0C6.5 2.3 5.4 2.7 5.4 2.7c-.7 1.7-.2 3.1-.1 3.4A4.8 4.8 0 0 0 4 9.5c0 4.8 3 5.9 5.8 6.2-.5.5-.8 1.2-.8 2.3v4"></path><path d="M9 19c-3 .9-3-1.5-4.2-2"></path>'
};

const externalKeys = new Set(["telegram", "telegramChannel", "youtube", "rutube", "instagram", "whatsapp", "github"]);

function escapeVCard(value = "") {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function currentPublicUrl() {
  if (siteConfig.publicUrl) return siteConfig.publicUrl;
  return `${window.location.origin}${window.location.pathname}`;
}

function renderPerson() {
  const { person, featuredProject, cv } = siteConfig;
  document.querySelector("#headline").textContent = person.headline;
  document.querySelector("#bio").textContent = person.shortBio;
  document.querySelector("#organization-name").textContent = featuredProject.name;
  document.querySelector("#organization-role").textContent = featuredProject.description;
  document.querySelector("#organization-badge").textContent = featuredProject.badge;
  document.querySelector("#organization-icon").src = featuredProject.icon;
  const organization = document.querySelector("#organization");
  organization.href = featuredProject.url;
  organization.setAttribute(
    "aria-label",
    `${featuredProject.name}: ${featuredProject.description}. ${featuredProject.badge} (откроется в новой вкладке)`
  );
  const portrait = document.querySelector("#portrait");
  portrait.src = person.photo;
  portrait.alt = "";
  const cvLink = document.querySelector("#download-cv");
  if (cv?.url) {
    cvLink.href = cv.url;
    cvLink.download = cv.fileName || "Dmitry-Vasilyev-CV.pdf";
    cvLink.querySelector("span").textContent = cv.label || "Скачать CV";
    document.querySelector("#resume-description").textContent = cv.description || "";
  } else {
    document.querySelector(".resume-section").hidden = true;
  }
  document.querySelector("#year").textContent = new Date().getFullYear();
}

function renderContacts() {
  const grid = document.querySelector("#contact-grid");
  const fragment = document.createDocumentFragment();

  Object.entries(siteConfig.contacts).forEach(([key, contact]) => {
    if (!contact?.url || !contact?.label) return;
    const link = document.createElement("a");
    link.className = externalKeys.has(key) ? "contact-card contact-card--social" : "contact-card";
    link.href = contact.url;
    const opensNewTab = externalKeys.has(key) && contact.url.startsWith("https://");
    if (opensNewTab) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
    link.setAttribute(
      "aria-label",
      `${contact.label}: ${contact.value || contact.hint}${opensNewTab ? " (откроется в новой вкладке)" : ""}`
    );

    const icon = iconPaths[key] || iconPaths.workEmail;
    link.innerHTML = `
      <span class="contact-card__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">${icon}</svg>
      </span>
      <span>
        <strong>${contact.label}</strong>
        <small>${contact.value || contact.hint || ""}</small>
      </span>
      <svg class="contact-card__arrow" aria-hidden="true" viewBox="0 0 24 24">
        <path d="m9 18 6-6-6-6"></path>
      </svg>`;
    fragment.append(link);
  });

  grid.replaceChildren(fragment);
}

function createVCard() {
  const { person, contacts } = siteConfig;
  const emails = [contacts.workEmail, contacts.businessEmail].filter(Boolean);
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    "PRODID:-//BitWow//NFC Business Card//RU",
    `N;CHARSET=UTF-8:${escapeVCard(person.lastName)};${escapeVCard(person.firstName)};;;`,
    `FN;CHARSET=UTF-8:${escapeVCard(person.displayName)}`,
    `ORG;CHARSET=UTF-8:${escapeVCard(person.organization)}`,
    `TITLE;CHARSET=UTF-8:${escapeVCard(person.headline)}`,
    `NOTE;CHARSET=UTF-8:${escapeVCard(person.shortBio)}`,
    contacts.phone?.url ? `TEL;TYPE=CELL;TYPE=VOICE:${contacts.phone.url.replace(/^tel:/, "")}` : "",
    ...emails.map((item, index) => `EMAIL;TYPE=${index === 0 ? "WORK" : "INTERNET"};TYPE=INTERNET:${escapeVCard(item.value)}`),
    `URL;TYPE=HOME:${escapeVCard(currentPublicUrl())}`,
    contacts.telegram?.url ? `X-SOCIALPROFILE;TYPE=telegram:${contacts.telegram.url}` : "",
    contacts.rutube?.url ? `X-SOCIALPROFILE;TYPE=rutube:${contacts.rutube.url}` : "",
    contacts.instagram?.url ? `X-SOCIALPROFILE;TYPE=instagram:${contacts.instagram.url}` : "",
    "END:VCARD"
  ].filter(Boolean);

  return `${lines.join("\r\n")}\r\n`;
}

function downloadVCard() {
  const blob = new Blob([createVCard()], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "dmitry-vasilyev.vcf";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast("Файл контакта готов");
}

let toastTimer;
function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

async function copyLink() {
  const url = currentPublicUrl();
  try {
    await navigator.clipboard.writeText(url);
    showToast("Ссылка скопирована");
  } catch {
    const input = document.createElement("textarea");
    input.value = url;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.append(input);
    input.select();
    const copied = document.execCommand("copy");
    input.remove();
    showToast(copied ? "Ссылка скопирована" : "Не удалось скопировать ссылку");
  }
}

function renderQrCode() {
  const container = document.querySelector("#qr-code");
  if (typeof window.qrcode !== "function") {
    container.textContent = "QR-код временно недоступен";
    return;
  }
  const qr = window.qrcode(0, "M");
  qr.addData(currentPublicUrl(), "Byte");
  qr.make();
  container.innerHTML = qr.createSvgTag(5, 0);
  const svg = container.querySelector("svg");
  if (svg) {
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.setAttribute("shape-rendering", "crispEdges");
    svg.querySelector("rect")?.setAttribute("fill", "#ffffff");
    svg.querySelectorAll("path").forEach((path) => {
      path.setAttribute("fill", "#000000");
      path.setAttribute("stroke", "transparent");
    });
  }
}

renderPerson();
renderContacts();
renderQrCode();
document.querySelector("#save-contact").addEventListener("click", downloadVCard);
document.querySelector("#copy-link").addEventListener("click", copyLink);
