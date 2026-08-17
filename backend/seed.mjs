import { getDb } from "./src/db.mjs";

async function seed() {
  const db = await getDb();
  try {
    // Limpiar si ya existe para poder re-importar
    await db.query("DELETE FROM torneos WHERE nombre = 'Mundial Qatar 2022 (Completo)'");

    console.log("Creando torneo...");
    const { rows: tRows } = await db.query(`
      INSERT INTO torneos (nombre, deporte, formato, participantes_count, cantidad_grupos, fecha_inicio, fecha_fin, estado)
      VALUES ('Mundial Qatar 2022 (Completo)', 'Futbol', 'MIXTO', 32, 8, '2022-11-20', '2022-12-18', 'EN_CURSO')
      RETURNING id
    `);
    const torneoId = tRows[0].id;

    // 32 Teams in 8 groups
    const groups = {
      'A': ['Países Bajos', 'Senegal', 'Ecuador', 'Qatar'],
      'B': ['Inglaterra', 'EEUU', 'Irán', 'Gales'],
      'C': ['Argentina', 'Polonia', 'México', 'Arabia Saudita'],
      'D': ['Francia', 'Australia', 'Túnez', 'Dinamarca'],
      'E': ['Japón', 'España', 'Alemania', 'Costa Rica'],
      'F': ['Marruecos', 'Croacia', 'Bélgica', 'Canadá'],
      'G': ['Brasil', 'Suiza', 'Camerún', 'Serbia'],
      'H': ['Portugal', 'Corea del Sur', 'Uruguay', 'Ghana']
    };

    const teamIds = {};
    console.log("Creando 32 selecciones...");
    for (const [grupo, teams] of Object.entries(groups)) {
      for (const nombre of teams) {
        const { rows: catRows } = await db.query("SELECT id FROM selecciones_catalogo WHERE nombre ILIKE $1 LIMIT 1", [nombre]);
        const catId = catRows[0]?.id || null;
        
        const { rows } = await db.query(`
          INSERT INTO equipos (torneo_id, nombre, grupo, seleccion_catalogo_id) 
          VALUES ($1, $2, $3, $4) RETURNING id
        `, [torneoId, nombre, grupo, catId]);
        
        teamIds[nombre] = rows[0].id;
      }
    }

    const insertMatch = async (local, visit, fecha, ronda, ml, mv, estado) => {
      await db.query(`
        INSERT INTO partidos (torneo_id, equipo_local_id, equipo_visitante_id, fecha, sede, ronda, marcador_local, marcador_visitante, estado)
        VALUES ($1, $2, $3, $4, 'Estadio Mundialista', $5, $6, $7, $8)
      `, [torneoId, local ? teamIds[local] : null, visit ? teamIds[visit] : null, fecha, ronda, ml, mv, estado]);
    };

    console.log("Programando Fase de Grupos (48 partidos)...");
    let matchDate = new Date('2022-11-20T16:00:00Z');
    for (const [grupo, teams] of Object.entries(groups)) {
      // Round Robin (3 matchdays)
      const matchups = [
        [0, 1], [2, 3], // Matchday 1
        [0, 2], [1, 3], // Matchday 2
        [0, 3], [1, 2]  // Matchday 3
      ];
      for (const [i, j] of matchups) {
        // Random score to simulate the group stage
        const ml = Math.floor(Math.random() * 3);
        const mv = Math.floor(Math.random() * 3);
        await insertMatch(teams[i], teams[j], matchDate.toISOString(), 'GRUPOS', ml, mv, 'FINALIZADO');
        matchDate.setHours(matchDate.getHours() + 4); // Next match 4 hours later
      }
    }

    console.log("Programando Octavos de Final (8 partidos)...");
    const octavos = [
      ['Países Bajos', 'EEUU'],
      ['Argentina', 'Australia'],
      ['Japón', 'Croacia'],
      ['Brasil', 'Corea del Sur'],
      ['Inglaterra', 'Senegal'],
      ['Francia', 'Polonia'],
      ['Marruecos', 'España'],
      ['Portugal', 'Suiza']
    ];
    for (const [local, visit] of octavos) {
      await insertMatch(local, visit, matchDate.toISOString(), 'OCTAVOS', 2, 1, 'FINALIZADO');
      matchDate.setDate(matchDate.getDate() + 1);
    }

    console.log("Programando Cuartos de Final (4 partidos)...");
    const cuartos = [
      ['Croacia', 'Brasil', 1, 1], // Penales Croacia
      ['Países Bajos', 'Argentina', 2, 2], // Penales Arg
      ['Marruecos', 'Portugal', 1, 0],
      ['Inglaterra', 'Francia', 1, 2]
    ];
    for (const [local, visit, ml, mv] of cuartos) {
      await insertMatch(local, visit, matchDate.toISOString(), 'CUARTOS', ml, mv, 'FINALIZADO');
      matchDate.setHours(matchDate.getHours() + 4);
    }

    console.log("Programando Semifinales y Final...");
    // Semis
    await insertMatch('Argentina', 'Croacia', '2022-12-13T19:00:00Z', 'SEMIFINAL', null, null, 'PROGRAMADO');
    await insertMatch('Francia', 'Marruecos', '2022-12-14T19:00:00Z', 'SEMIFINAL', null, null, 'PROGRAMADO');

    // Final
    await insertMatch(null, null, '2022-12-18T15:00:00Z', 'FINAL', null, null, 'PROGRAMADO');

    console.log("¡Mundial 32 equipos importado con éxito! Torneo ID:", torneoId);
  } catch (e) {
    console.error("Error:", e);
  } finally {
    process.exit(0);
  }
}
seed();
