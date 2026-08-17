# Contexto Completo: Mundial de Selecciones

> Referencia para desarrollo, diseno, exposiciones y conversaciones futuras sobre el proyecto.

## Objetivo

**Mundial de Selecciones** es una aplicacion web para administrar uno o varios mundiales de futbol. Centraliza la configuracion de torneos, paises participantes, grupos, partidos, resultados y tablas de clasificacion.

Es una herramienta operativa, no una pagina de noticias o promocional. Debe permitir responder rapidamente:

- Que mundial esta seleccionado y cual es su estado.
- Cuantas selecciones y partidos contiene.
- Que encuentros estan programados, en juego o finalizados.
- Que resultados y clasificaciones existen.
- Que accion administrativa corresponde realizar.

## Estado Actual

El sistema ya funciona de extremo a extremo:

- Registro e inicio de sesion.
- Dashboard del mundial seleccionado.
- Gestion de Mundiales, Selecciones, Calendario, Fases, Resultados y Grupos.
- Catalogo FIFA persistente con ranking, confederacion, codigo y bandera.
- API REST con JWT, roles, validaciones y reglas de negocio.
- PostgreSQL en Supabase y arquitectura preparada para Vercel.

## Arquitectura

```text
API_Mundial-Examen/
|-- frontend/                         # Angular 22
|   |-- src/app/core/                 # Servicios HTTP, auth y modelos
|   |-- src/app/pages/                # Paginas y componentes
|   |-- src/environments/             # URLs por ambiente
|   `-- public/assets/mundial-login/  # Fondo, copa y pedestal del login
|
|-- backend/                          # API REST Node.js con ESM
|   |-- src/app.mjs                   # Rutas y reglas de negocio
|   |-- src/security.mjs              # Hash PBKDF2 y JWT HS256
|   |-- src/validators.mjs            # Validaciones de entrada
|   |-- src/standings.mjs             # Clasificacion por grupos
|   |-- src/fifa-catalog.mjs          # Sincronizacion FIFA
|   |-- database/migrations/          # Esquema PostgreSQL incremental
|   |-- scripts/verify.mjs            # Verificacion automatica
|   `-- postman/                      # Coleccion de pruebas manuales
|
|-- api/entry.js                      # Adaptador serverless de Vercel
|-- vercel.json                       # Build, rewrites y salida
`-- docs/                             # Documentacion
```

| Capa | Tecnologia | Responsabilidad |
|---|---|---|
| Frontend | Angular 22, TypeScript, SCSS, RxJS | Interfaz, formularios, rutas y consumo de API |
| Iconos | Lucide Angular | Iconografia de navegacion y acciones |
| Backend | Node.js, modulos ES, HTTP nativo | API REST y reglas de negocio |
| Seguridad | `node:crypto` | PBKDF2-SHA256 y JWT HS256 |
| Datos | PostgreSQL en Supabase | Persistencia relacional |
| Catalogo | API publica FIFA y FlagCDN | Ranking, confederacion y banderas |
| Hosting | Vercel | Angular estatico y funcion `/api` |

## Frontend

### Rutas

| Ruta | Vista | Uso |
|---|---|---|
| `/acceso` | Autenticacion | Iniciar sesion |
| `/registro` | Autenticacion | Crear cuenta |
| `/panel` | Dashboard | Resumen del mundial seleccionado |
| `/modulos/torneos` | Mundiales | Crear y configurar ediciones |
| `/modulos/equipos` | Selecciones | Elegir participantes FIFA y grupos |
| `/modulos/partidos` | Calendario | Gestionar partidos |
| `/modulos/resultados` | Fases | Consultar y registrar resultados |
| `/modulos/clasificacion` | Grupos | Consultar tablas de posiciones |

Las rutas internas exigen autenticacion. Acceso y Registro usan un guard de invitado para evitar que una sesion activa vuelva al login.

### Estilo visual

- Login a pantalla completa, sin navbar, con estadio oscuro, mapa mundial, copa y pedestal esmeralda.
- Panel de autenticacion de vidrio esmerilado.
- Panel interno con verde esmeralda, verde brillante, dorado, negro verdoso y blanco suave.
- Barra lateral: Inicio, Torneos, Selecciones, Fases, Grupos y Calendario.
- El dashboard resume datos; los CRUD se realizan en modulos separados mediante dialogos.

### Sesion del navegador

`AuthService` guarda solo los datos necesarios en `localStorage`:

- `torneos_token`: JWT.
- `torneos_user`: nombre, email y rol.

El interceptor HTTP adjunta `Authorization: Bearer <token>` a solicitudes protegidas. Al restaurar sesion, se consulta `GET /api/auth/me`; si falla, se descarta el estado local.

| Entorno | `apiBaseUrl` |
|---|---|
| Desarrollo | `http://localhost:3000/api` |
| Produccion | `/api` |

## Backend y Seguridad

El backend es una API HTTP propia de Node.js. No usa Express: el manejador central esta en `backend/src/app.mjs`.

### Autenticacion

1. El usuario se registra o inicia sesion.
2. La contrasena se guarda con PBKDF2-SHA256, 120 000 iteraciones y salt aleatorio.
3. La API firma un JWT HS256 con `JWT_SECRET`.
4. El frontend lo envia como token Bearer.
5. La API verifica firma, expiracion y que el usuario siga existiendo.

El tiempo de sesion se controla mediante `JWT_EXPIRES_SECONDS`; por defecto son ocho horas.

### Roles

| Rol | Acceso |
|---|---|
| `ADMIN` | Crear, modificar y eliminar; sincronizar FIFA |
| `CONSULTA` | Solo consultar recursos con GET |

El primer usuario de una base vacia es `ADMIN`. Los siguientes son `CONSULTA` aunque el cliente intente solicitar otro rol.

### Errores HTTP

| Codigo | Significado |
|---|---|
| `200` | Consulta o actualizacion correcta |
| `201` | Recurso creado |
| `400` | Validacion o regla de negocio incumplida |
| `401` | Token ausente, invalido o expirado |
| `403` | El rol no puede modificar |
| `404` | Ruta o recurso inexistente |
| `409` | Conflicto o dato duplicado |

## Base de Datos

Las migraciones se aplican en orden desde `backend/database/migrations`.

| Tabla | Contenido |
|---|---|
| `users` | Cuentas, hash de contrasena y rol |
| `torneos` | Mundial, formato, cupo, grupos, fechas, estado y ganador |
| `selecciones_catalogo` | Pais, codigo FIFA, confederacion, bandera/escudo y ranking |
| `equipos` | Seleccion inscrita en un torneo y su grupo |
| `partidos` | Encuentro, fecha, sede, ronda, estado y marcadores |

Relaciones importantes:

- Un torneo tiene muchas selecciones y partidos.
- Una seleccion del catalogo puede participar en varios torneos, pero una vez por torneo.
- Los dos equipos de un partido pertenecen al mismo torneo.
- El ganador debe ser una seleccion de ese torneo.

## Reglas de Negocio

### Mundiales

- Formatos: `LIGA`, `ELIMINACION`, `MIXTO`.
- Participantes permitidos: `2`, `4`, `8`, `10`, `12`, `16`, `24`, `32`, `48`.
- Liga y Mixto requieren grupos que dividan exactamente a los participantes y dejen minimo dos paises por grupo.
- Eliminatoria no usa grupos.
- Estados: `BORRADOR`, `EN_CURSO`, `FINALIZADO`.
- Un mundial solo finaliza al elegir una seleccion ganadora registrada.
- No se puede reducir el cupo por debajo de las selecciones ya inscritas.

### Selecciones y grupos

- Las selecciones vienen del catalogo FIFA, no de texto libre.
- Una seleccion no puede repetirse dentro de un mundial.
- No se puede exceder el cupo configurado.
- Para mundiales con grupos, el selector muestra letras de `A` hasta el limite configurado. Ejemplo: 12 grupos habilita `A` a `L`.
- La API rechaza valores de grupo fuera de esa configuracion.
- Un torneo eliminatorio no asigna grupos.

### Partidos y resultados

- Ninguna seleccion puede jugar contra si misma.
- Los marcadores son enteros no negativos.
- Estados: `PROGRAMADO`, `EN_JUEGO`, `FINALIZADO`.
- Registrar un resultado valido finaliza el partido.
- No se puede eliminar la seleccion campeona de un torneo finalizado.

### Clasificacion

La tabla se calcula solo desde partidos `FINALIZADO`, agrupados por grupo. Incluye partidos jugados, victorias, empates, derrotas, goles a favor, goles en contra, diferencia y puntos.

## Catalogo FIFA

El catalogo se persiste en PostgreSQL y no consulta la API externa cada vez que un usuario abre la pagina.

1. Un `ADMIN` pulsa **Actualizar FIFA** en Selecciones.
2. El backend consulta el ranking masculino vigente de FIFA.
3. Inserta o actualiza el catalogo local.
4. La interfaz muestra nombre, codigo FIFA, confederacion, ranking y bandera.

El modelo admite `escudo_url` para futuras fuentes de escudos oficiales. Mientras tanto, la interfaz utiliza banderas de FlagCDN como respaldo visual.

## Endpoints

Todas las rutas protegidas requieren `Authorization: Bearer <token>`.

| Metodo | Ruta | Acceso | Funcion |
|---|---|---|---|
| POST | `/api/auth/register` | Publico | Crear cuenta |
| POST | `/api/auth/login` | Publico | Iniciar sesion |
| GET | `/api/auth/me` | Protegido | Usuario actual |
| GET | `/api/catalogo-selecciones` | Protegido | Listar catalogo FIFA |
| POST | `/api/catalogo-selecciones` | ADMIN | Alta manual de catalogo |
| POST | `/api/catalogo-selecciones/sincronizar-ranking` | ADMIN | Sincronizar FIFA |
| GET, POST | `/api/torneos` | GET protegido, POST ADMIN | Listar o crear mundiales |
| GET, PUT, DELETE | `/api/torneos/:id` | GET protegido, escritura ADMIN | Gestionar mundial |
| GET, POST | `/api/torneos/:id/equipos` | GET protegido, POST ADMIN | Consultar o inscribir selecciones |
| GET | `/api/torneos/:id/clasificacion` | Protegido | Tabla de posiciones |
| PUT, DELETE | `/api/equipos/:id` | ADMIN | Cambiar grupo o eliminar seleccion |
| GET, POST | `/api/torneos/:id/partidos` | GET protegido, POST ADMIN | Consultar o crear partidos |
| GET, PUT, DELETE | `/api/partidos/:id` | GET protegido, escritura ADMIN | Gestionar partido |
| PUT | `/api/partidos/:id/resultado` | ADMIN | Registrar resultado |

## Ejecucion Local

Usa dos terminales desde la raiz.

### Backend

```powershell
cd backend
npm install
Copy-Item .env.example .env
# Configura DATABASE_URL y JWT_SECRET.
npm run db:migrate
npm start
```

API: `http://localhost:3000`

### Frontend

```powershell
cd frontend
npm install
npm start
```

Interfaz: `http://localhost:4200`

Si el puerto 3000 esta ocupado, otra instancia de la API ya esta activa. Se puede usar esa instancia o detener su proceso antes de iniciar una nueva.

### Verificacion

```powershell
cd backend
npm run verify

cd ..\frontend
npx ng build --configuration production
```

`verify` utiliza una base temporal en memoria y comprueba autenticacion, autorizacion, torneos, selecciones, grupos, partidos, resultados y clasificacion sin alterar Supabase.

## Vercel y Supabase

- Supabase mantiene PostgreSQL y debe tener aplicadas las migraciones `001`, `002` y `003`.
- Vercel instala ambos paquetes, compila Angular y publica `frontend/dist/frontend/browser`.
- `api/entry.js` reutiliza el mismo backend local como funcion serverless.
- `vercel.json` envia `/api/*` a la funcion y las rutas restantes a Angular.
- En Vercel se definen `DATABASE_URL`, `PG_POOL_MAX=1`, `JWT_SECRET` y `JWT_EXPIRES_SECONDS` en Production y Preview.
- Los cambios llegan al despliegue cuando se realiza `git push` a la rama configurada en Vercel.

Consulta [DESPLIEGUE_VERCEL_SUPABASE.md](DESPLIEGUE_VERCEL_SUPABASE.md) para el proceso detallado.

## Flujo Recomendado

1. Registrar el primer usuario administrador.
2. Sincronizar FIFA una vez.
3. Crear el mundial con formato, cupo, grupos y fechas.
4. Abrir Selecciones e inscribir paises en el mundial seleccionado.
5. Asignar grupos permitidos cuando corresponda.
6. Programar encuentros en Calendario.
7. Registrar resultados desde Fases o Resultados.
8. Consultar tablas en Grupos.
9. Elegir ganador y finalizar el mundial al concluir.

## Contexto Breve para Otro Chat

> Estoy desarrollando **Mundial de Selecciones**, una aplicacion Angular 22 con backend Node.js REST y PostgreSQL en Supabase. Gestiona varios mundiales con autenticacion JWT y roles ADMIN/CONSULTA. Permite crear torneos de Liga, Eliminatoria o Mixto, definir participantes y grupos, escoger selecciones desde un catalogo FIFA persistente, programar partidos, registrar resultados y calcular tablas. El login tiene una estetica premium de estadio oscuro con copa y pedestal esmeralda; el panel interno usa verde esmeralda, dorado y negro verdoso. La interfaz debe sentirse como una herramienta operativa deportiva, no una landing page. Mantener la separacion `frontend/` Angular y `backend/` Node, las reglas de negocio y la API REST existente.
