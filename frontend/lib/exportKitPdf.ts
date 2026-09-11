import type { KitPayload, QuestionCategory } from "@/lib/types";
import { mustHaveCoverage } from "@/lib/kitCoverage";

const CATEGORIES: QuestionCategory[] = [
  "technical",
  "behavioural",
  "system-design",
  "company-fit",
];

function esc(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function questionsByCategory(kit: KitPayload) {
  const map = Object.fromEntries(CATEGORIES.map((c) => [c, [] as typeof kit.questions])) as Record<
    QuestionCategory,
    typeof kit.questions
  >;
  for (const q of kit.questions) map[q.category].push(q);
  return map;
}

function buildHtml(kit: KitPayload) {
  const { covered, total } = mustHaveCoverage(kit);
  const grouped = questionsByCategory(kit);
  const title = kit.role.title || "Interview kit";
  const exported = new Date().toLocaleString();

  const requirements = kit.role.requirements
    .map((req) => {
      const linked = kit.questions
        .filter((q) => q.requirement_ids.includes(req.id))
        .map((q) => q.id)
        .join(", ");
      return `<tr>
        <td>${esc(req.id)}</td>
        <td>${esc(req.text)}</td>
        <td>${esc(req.priority)}</td>
        <td>${linked ? esc(linked) : "—"}</td>
      </tr>`;
    })
    .join("");

  const questions = CATEGORIES
    .flatMap((category) =>
      grouped[category].map(
        (q) => `
        <article class="question">
          <p class="meta">${esc(category)} · ${esc(q.id)}</p>
          <h4>${esc(q.prompt)}</h4>
          <p class="answer">${esc(q.answer_outline || "No outline yet.")}</p>
        </article>`,
      ),
    )
    .join("");

  const flashcards = kit.flashcards
    .map(
      (card) => `
      <article class="card">
        <p class="meta">${esc(card.id)}</p>
        <p><strong>Prompt:</strong> ${esc(card.front)}</p>
        <p><strong>Answer:</strong> ${esc(card.back)}</p>
      </article>`,
    )
    .join("");

  const schedule = kit.schedule.days
    .map((day) => {
      const prompts = day.question_ids
        .map((id) => kit.questions.find((q) => q.id === id))
        .filter(Boolean)
        .map((q) => `<li>${esc(q!.prompt)}</li>`)
        .join("");
      return `
      <article class="day">
        <h4>Day ${day.day} · ${day.minutes} min</h4>
        <p>${esc(day.focus)}</p>
        ${prompts ? `<ul>${prompts}</ul>` : `<p class="muted">No questions scheduled.</p>`}
      </article>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)} — Interview Prep Kit</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Georgia, "Times New Roman", serif; color: #1e3148; margin: 0; padding: 2rem; line-height: 1.5; font-size: 11pt; }
    h1 { font-size: 22pt; margin: 0 0 0.25rem; }
    h2 { font-size: 14pt; margin: 2rem 0 0.75rem; border-bottom: 1px solid #b7c5d0; padding-bottom: 0.25rem; }
    h3 { font-size: 12pt; margin: 1.25rem 0 0.5rem; }
    h4 { font-size: 11pt; margin: 0 0 0.35rem; }
    p { margin: 0 0 0.5rem; }
    .muted { color: #4a6276; font-size: 10pt; }
    .brief { margin-top: 1rem; }
    table { width: 100%; border-collapse: collapse; font-size: 10pt; }
    th, td { border: 1px solid #b7c5d0; padding: 0.35rem 0.5rem; text-align: left; vertical-align: top; }
    th { background: #dce7ee; }
    .question, .card, .day { margin-bottom: 1rem; page-break-inside: avoid; }
    .meta { font-size: 9pt; color: #4a6276; margin-bottom: 0.25rem; }
    .answer { color: #4a6276; }
    ul { margin: 0.35rem 0 0; padding-left: 1.25rem; }
    @media print {
      body { padding: 0.5in; }
      h2 { page-break-after: avoid; }
    }
  </style>
</head>
<body>
  <header>
    <h1>${esc(title)}</h1>
    <p class="muted">${esc(kit.source.company || "")}${kit.source.company ? " · " : ""}Exported ${esc(exported)}</p>
    <p class="muted">Coverage: ${covered} of ${total} must-haves</p>
  </header>

  <h2>Company brief</h2>
  <div class="brief">
    <h3>Summary</h3>
    <p>${esc(kit.company_brief.summary || "—")}</p>
    <h3>What they do</h3>
    <p>${esc(kit.company_brief.what_they_do || "—")}</p>
  </div>

  <h2>Role</h2>
  <p><strong>Title:</strong> ${esc(kit.role.title)}</p>
  ${kit.role.seniority ? `<p><strong>Seniority:</strong> ${esc(kit.role.seniority)}</p>` : ""}
  ${
    kit.role.responsibilities.length
      ? `<h3>Responsibilities</h3><ul>${kit.role.responsibilities.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>`
      : ""
  }

  <h2>Requirements</h2>
  <table>
    <thead><tr><th>Id</th><th>Requirement</th><th>Priority</th><th>Questions</th></tr></thead>
    <tbody>${requirements || `<tr><td colspan="4">None</td></tr>`}</tbody>
  </table>

  <h2>Questions</h2>
  ${questions || `<p class="muted">No questions.</p>`}

  <h2>Flashcards</h2>
  ${flashcards || `<p class="muted">No flashcards.</p>`}

  <h2>Schedule</h2>
  ${schedule || `<p class="muted">No schedule.</p>`}
</body>
</html>`;
}

export function exportKitPdf(kit: KitPayload) {
  const html = buildHtml(kit);
  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) {
    window.alert("Allow pop-ups to export this kit as PDF.");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  const print = () => {
    win.print();
    win.onafterprint = () => win.close();
  };
  if (win.document.readyState === "complete") print();
  else win.onload = print;
}
