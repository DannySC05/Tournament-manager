# Mundial API REST con JWT

Backend para gestionar usuarios, selecciones, partidos y tabla de posiciones del Mundial. Cumple autenticacion JWT, roles `ADMIN` y `CONSULTA`, reglas de negocio, validaciones minimas, migracion SQL y coleccion de Postman.

## Requisitos

- Node.js 23 o superior, porque el proyecto usa `node:sqlite`.
- No requiere instalar dependencias externas.

## Ejecucion

```bash
cd C:\Users\User\Documents\API_Mundial-Examen
node --no-warnings src/server.mjs
```

La API queda en:

```text
http://localhost:3000
```

Variables opcionales:

```bash
PORT=3000
DB_PATH=database/mundial.sqlite
JWT_SECRET=cambie-este-secreto
JWT_EXPIRES_SECONDS=28800
```

## Prueba rapida

```bash
node --no-warnings scripts/verify.mjs
```

El script levanta una base temporal y verifica:

- JWT obligatorio en endpoints protegidos.
- Registro/login y `GET /api/auth/me`.
- `ADMIN` con acceso completo.
- `CONSULTA` solo puede hacer `GET`; si intenta modificar recibe HTTP `403`.
- Email unico, password minimo de 8 caracteres y nombre de seleccion unico.
- Seleccion no puede jugar contra si misma.
- Selecciones de un partido deben existir.
- Goles negativos rechazados.
- Al registrar resultado, el partido cambia a `FINALIZADO`.
- Tabla por grupo calcula `PJ`, `PG`, `PE`, `PP`, `GF`, `GC`, `DG`, `PTS` y ordena por puntos, diferencia de goles y goles a favor.
- Importacion masiva del Mundial 2022 protegida para `ADMIN`.

## Primer usuario

La base inicia vacia. Para facilitar la evaluacion, el primer usuario registrado puede solicitar rol `ADMIN`. Los registros posteriores quedan como `CONSULTA`, aunque manden `rol: "ADMIN"`.

Ejemplo:

```http
POST /api/auth/register
Content-Type: application/json

{
  "nombre": "Administrador",
  "email": "admin@mundial.test",
  "password": "Admin1234",
  "rol": "ADMIN"
}
```

Use el `token` devuelto como:

```http
Authorization: Bearer <token>
```

## Endpoints

### Autenticacion

| Metodo | Ruta | Protegido | Descripcion |
|---|---|---:|---|
| POST | `/api/auth/register` | No | Registra usuario. Primer usuario puede ser `ADMIN`; luego `CONSULTA`. |
| POST | `/api/auth/login` | No | Devuelve token JWT. |
| GET | `/api/auth/me` | Si | Devuelve usuario autenticado. |
| POST | `/api/auth/logout` | Si | Respuesta de cierre; el cliente descarta el token. |

### Selecciones

| Metodo | Ruta | Rol |
|---|---|---|
| GET | `/api/selecciones` | ADMIN o CONSULTA |
| GET | `/api/selecciones/{id}` | ADMIN o CONSULTA |
| POST | `/api/selecciones` | ADMIN |
| PUT | `/api/selecciones/{id}` | ADMIN |
| DELETE | `/api/selecciones/{id}` | ADMIN |

### Importacion Mundial 2022

| Metodo | Ruta | Rol | Descripcion |
|---|---|---|---|
| POST | `/api/import/mundial-2022` | ADMIN | Crea 32 selecciones oficiales, un placeholder `Pendiente`, grupos completos, octavos, cuartos y una semifinal del Mundial 2022. |

La importacion base deja reservadas estas pruebas para Postman:

- Crear la otra semifinal `Marruecos vs Francia` en estado `EN_JUEGO`.
- Actualizar esa semifinal con resultado para pasarla a `FINALIZADO`.
- Crear la final `Argentina vs Pendiente` en estado `PROGRAMADO`.
- Actualizar el rival pendiente de la final a `Francia` cuando ya se conoce el ganador de la semifinal.
- Actualizar esa final con resultado para pasarla a `FINALIZADO`.

La respuesta devuelve un mapa de IDs por nombre de seleccion para que Postman pueda guardar variables como `argentina_id`, `francia_id`, `marruecos_id` y `pendiente_id`.

### Partidos

| Metodo | Ruta | Rol |
|---|---|---|
| GET | `/api/partidos` | ADMIN o CONSULTA |
| GET | `/api/partidos/{id}` | ADMIN o CONSULTA |
| GET | `/api/partidos/fase/{fase}` | ADMIN o CONSULTA |
| POST | `/api/partidos` | ADMIN |
| PUT | `/api/partidos/{id}` | ADMIN |
| PUT | `/api/partidos/{id}/resultado` | ADMIN |
| DELETE | `/api/partidos/{id}` | ADMIN |

### Tabla de posiciones

| Metodo | Ruta | Rol |
|---|---|---|
| GET | `/api/grupos/{grupo}/tabla` | ADMIN o CONSULTA |

## Valores validos

- Roles: `ADMIN`, `CONSULTA`
- Estados: `PROGRAMADO`, `EN_JUEGO`, `FINALIZADO`
- Fases: `GRUPOS`, `OCTAVOS`, `CUARTOS`, `SEMIFINAL`, `FINAL`

## Modelo de datos

La migracion esta en `database/migrations/001_init.sql` e incluye:

- `users`: `id`, `nombre`, `email`, `password_hash`, `rol`
- `selecciones`: `id`, `nombre`, `continente`, `grupo`, `ranking_fifa`, `entrenador`
- `partidos`: `id`, `seleccion_local_id`, `seleccion_visitante_id`, `fecha`, `estadio`, `fase`, `goles_local`, `goles_visitante`, `estado`

## Coleccion Postman

Importe:

```text
postman/Mundial_API_JWT.postman_collection.json
```

La coleccion guarda automaticamente `token_admin`, `token_consulta`, `seleccion_local_id`, `seleccion_visitante_id` y `partido_id` durante las pruebas.

Tambien incluye:

- `Import - Mundial 2022 base`
- `Mundial 2022 - crear semifinal en progreso`
- `Mundial 2022 - finalizar semifinal reservada`
- `Mundial 2022 - crear final programada con pendiente`
- `Mundial 2022 - actualizar rival pendiente de la final`
- `Mundial 2022 - finalizar final reservada`

Ese flujo permite recrear el Mundial 2022 con 32 selecciones oficiales, usar `Pendiente` para partidos programados sin rival confirmado y probar estados de partido: primero `EN_JUEGO` y `PROGRAMADO`, luego `FINALIZADO` mediante el endpoint de resultado.
