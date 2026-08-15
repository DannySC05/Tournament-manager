import countries from "i18n-iso-countries";

const FIFA_API_BASE_URL = "https://api.fifa.com/api/v3";
const flagOverrides = Object.freeze({
  ENG: "gb-eng", NIR: "gb-nir", SCO: "gb-sct", WAL: "gb-wls", KOS: "xk", TPE: "tw",
  KSA: "sa", TAN: "tz", SRI: "lk", SKN: "kn", GAM: "gm", MTN: "mr", NIG: "ne",
  ESA: "sv", TRI: "tt", GUI: "gn", TOG: "tg", MAD: "mg", LIB: "lr", CHA: "td",
  CTA: "cf", ANG: "ao", EQG: "gq", LES: "ls", SUD: "sd", VGB: "vg", VIR: "vi"
});

function textFromLocalized(value) {
  if (typeof value === "string") return value.trim();
  if (!Array.isArray(value)) return "";
  return value.find((item) => item.Locale === "en-GB")?.Description?.trim()
    ?? value[0]?.Description?.trim()
    ?? "";
}

function flagUrlForFifaCode(code) {
  const iso2 = flagOverrides[code] ?? countries.alpha3ToAlpha2(code)?.toLowerCase();
  return iso2 ? `https://flagcdn.com/w160/${iso2}.png` : null;
}

async function fifaJson(path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${FIFA_API_BASE_URL}${path}`, { signal: controller.signal });
    if (!response.ok) throw new Error(`FIFA respondio con HTTP ${response.status}.`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchCurrentFifaRanking() {
  const schedules = await fifaJson("/rankingschedules/all?type=0&gender=1");
  const latestSchedule = (schedules.Results ?? [])
    .sort((left, right) => new Date(right.VisibilityDate ?? right.OfficialDate) - new Date(left.VisibilityDate ?? left.OfficialDate))[0];
  const scheduleId = latestSchedule?.IdRankingSchedule;
  if (!scheduleId) throw new Error("FIFA no devolvio una publicacion de ranking disponible.");

  const ranking = await fifaJson(`/rankingsbyschedule?rankingScheduleId=${encodeURIComponent(scheduleId)}&language=en`);
  const selections = (ranking.Results ?? []).map((entry) => {
    const codigo_fifa = String(entry.IdCountry ?? "").trim().toUpperCase();
    const nombre = textFromLocalized(entry.TeamName);
    const confederacion = String(entry.ConfederationName ?? "SIN_CONFEDERACION").trim().toUpperCase();
    return {
      codigo_fifa,
      nombre,
      confederacion,
      bandera_url: flagUrlForFifaCode(codigo_fifa),
      ranking_fifa: Number(entry.Rank),
      ranking_puntos: Number(entry.DecimalTotalPoints ?? entry.TotalPoints),
      ranking_actualizado_en: entry.PubDate ?? latestSchedule.VisibilityDate ?? latestSchedule.OfficialDate,
      fifa_team_id: String(entry.IdTeam ?? "") || null
    };
  }).filter((selection) => selection.codigo_fifa.length === 3 && selection.nombre && Number.isInteger(selection.ranking_fifa));

  if (!selections.length) throw new Error("FIFA no devolvio selecciones para el ranking actual.");
  return selections;
}
