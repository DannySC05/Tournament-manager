function createRow(team) {
  return {
    equipo_id: team.id,
    equipo_nombre: team.nombre,
    grupo: team.grupo ?? null,
    posicion: 0,
    partidos_jugados: 0,
    partidos_ganados: 0,
    partidos_empatados: 0,
    partidos_perdidos: 0,
    goles_favor: 0,
    goles_contra: 0,
    diferencia_goles: 0,
    puntos: 0
  };
}

function registerResult(local, visitante, marcadorLocal, marcadorVisitante) {
  local.partidos_jugados += 1;
  visitante.partidos_jugados += 1;
  local.goles_favor += marcadorLocal;
  local.goles_contra += marcadorVisitante;
  visitante.goles_favor += marcadorVisitante;
  visitante.goles_contra += marcadorLocal;

  if (marcadorLocal > marcadorVisitante) {
    local.partidos_ganados += 1;
    local.puntos += 3;
    visitante.partidos_perdidos += 1;
  } else if (marcadorLocal < marcadorVisitante) {
    visitante.partidos_ganados += 1;
    visitante.puntos += 3;
    local.partidos_perdidos += 1;
  } else {
    local.partidos_empatados += 1;
    visitante.partidos_empatados += 1;
    local.puntos += 1;
    visitante.puntos += 1;
  }
}

function compareRows(left, right) {
  return right.puntos - left.puntos
    || right.diferencia_goles - left.diferencia_goles
    || right.goles_favor - left.goles_favor
    || left.equipo_nombre.localeCompare(right.equipo_nombre, "es");
}

export function buildStandings(teams, matches) {
  const rowsByTeamId = new Map(teams.map((team) => [team.id, createRow(team)]));

  for (const match of matches) {
    if (match.estado !== "FINALIZADO" || match.marcador_local === null || match.marcador_visitante === null) continue;
    const local = rowsByTeamId.get(match.equipo_local_id);
    const visitante = rowsByTeamId.get(match.equipo_visitante_id);
    if (!local || !visitante) continue;
    registerResult(local, visitante, Number(match.marcador_local), Number(match.marcador_visitante));
  }

  const usesGroups = teams.some((team) => team.grupo);
  const rowsByGroup = new Map();
  for (const row of rowsByTeamId.values()) {
    row.diferencia_goles = row.goles_favor - row.goles_contra;
    const group = usesGroups ? (row.grupo || "Sin grupo") : "Tabla general";
    const rows = rowsByGroup.get(group) ?? [];
    rows.push(row);
    rowsByGroup.set(group, rows);
  }

  return Array.from(rowsByGroup.entries())
    .sort(([left], [right]) => left.localeCompare(right, "es"))
    .map(([grupo, rows]) => ({
      grupo,
      clasificacion: rows.sort(compareRows).map((row, index) => ({ ...row, posicion: index + 1 }))
    }));
}
