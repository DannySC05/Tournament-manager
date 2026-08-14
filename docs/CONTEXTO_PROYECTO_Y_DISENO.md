# Contexto del Proyecto: Plataforma de Torneos

Este documento esta pensado para pegarse como contexto en un chat conversacional de diseno, producto o desarrollo.

## Objetivo del producto

Se esta construyendo una aplicacion web para administrar torneos deportivos. La primera version se enfoca en futbol, pero el modelo permite administrar otros deportes.

La plataforma debe permitir a un administrador crear un torneo, registrar equipos, programar partidos, actualizar resultados y consultar el avance del torneo. La aplicacion debe sentirse como una herramienta real de gestion deportiva, no como una pagina promocional.

## Problema que resuelve

Organizar un torneo de forma manual suele dispersar equipos, fechas, resultados y estados de partidos entre hojas de calculo, chats y notas. La plataforma centraliza esa informacion y aplica reglas para evitar errores, como registrar a un equipo dos veces, programar un equipo contra si mismo o modificar datos sin permisos.

## Usuarios y permisos

- `ADMIN`: gestiona torneos, equipos, partidos y resultados.
- `CONSULTA`: puede revisar la informacion, pero no modificarla.

El primer usuario registrado en una base de datos vacia puede ser `ADMIN`. Los usuarios creados posteriormente reciben el rol `CONSULTA`.

## Funcionalidad ya implementada

- Registro e inicio de sesion con JWT.
- Proteccion de rutas de API mediante token `Bearer`.
- Control de autorizacion por roles `ADMIN` y `CONSULTA`.
- Creacion, consulta, edicion y eliminacion de torneos.
- Registro, edicion y eliminacion de equipos dentro de un torneo.
- Programacion, edicion y eliminacion de partidos.
- Registro de resultados y finalizacion automatica de un partido.
- Validaciones de campos, fechas, marcadores y reglas de negocio.
- Base de datos SQLite persistente.
- Coleccion de Postman para pruebas de la API.

## Reglas de negocio importantes

- Un equipo pertenece a un solo torneo.
- Un partido enfrenta equipos del mismo torneo.
- Un equipo no puede jugar contra si mismo.
- Los marcadores no pueden ser negativos.
- Al registrar un resultado valido, el partido cambia a estado `FINALIZADO`.
- Los estados de partido son `PROGRAMADO`, `EN_JUEGO` y `FINALIZADO`.
- Los estados de torneo son `BORRADOR`, `EN_CURSO` y `FINALIZADO`.
- Los formatos de torneo disponibles son `LIGA`, `ELIMINACION` y `MIXTO`.
- Las operaciones de modificacion requieren rol `ADMIN`.

## Estado actual de la interfaz

Solo esta terminada la pantalla de autenticacion:

- Ruta de inicio de sesion: `/acceso`.
- Ruta de registro: `/registro`.
- La pantalla no muestra barra de navegacion.
- Usa un estadio de futbol como fondo, un jugador recortado a la izquierda y un panel de autenticacion de vidrio esmerilado a la derecha.
- El estilo usa verde deportivo, blanco, gris oscuro, bordes redondeados y transparencia ligera.
- La interfaz es responsive: el jugador se reduce en tablet y se oculta en movil para priorizar titulo y formulario.

La pagina principal de administracion todavia no esta construida. Es el siguiente modulo a disenar.

## Direccion de diseno para la pagina principal

La pagina principal debe ser una aplicacion de trabajo para administradores y usuarios de consulta, no una landing page de marketing.

Principios visuales:

- Estetica moderna, deportiva y profesional.
- Paleta principal: verde, blanco, gris oscuro y grises neutros.
- Informacion densa pero ordenada y facil de escanear.
- Jerarquia clara entre torneo activo, proximos partidos, resultados y equipos.
- Espaciado generoso, pero sin tarjetas decorativas excesivas.
- Bordes discretos, radios de entre 8 px y 12 px para superficies de trabajo.
- Iconos claros para acciones de crear, editar, eliminar, filtrar y navegar.
- Evitar composiciones tipo marketing, heroes grandes o fondos recargados dentro del panel administrativo.

Posibles modulos de la pagina principal:

1. Resumen del torneo activo: nombre, deporte, formato, estado y fechas.
2. Indicadores principales: equipos registrados, partidos programados, partidos en juego y partidos finalizados.
3. Proximos partidos: fecha, ronda, sede, equipos y estado.
4. Resultados recientes: marcador, estado y acceso a detalle.
5. Equipos del torneo: listado compacto con grupo opcional.
6. Acciones para administradores: crear torneo, agregar equipo, programar partido y registrar resultado.
7. Selector de torneo para usuarios que administren o consulten mas de uno.

## Restricciones de UX para idear disenos

- El usuario debe entender rapidamente que torneo esta viendo y en que estado se encuentra.
- Las acciones sensibles deben ser visibles solo para `ADMIN`.
- La informacion de consulta debe seguir siendo util para el rol `CONSULTA`.
- Crear un torneo, agregar un equipo o registrar un resultado debe requerir pocos pasos.
- Los partidos deben mostrar visualmente su estado: programado, en juego o finalizado.
- Los estados no deben depender solo del color; deben incluir texto o iconos.
- La pagina debe funcionar bien en escritorio, tablet y movil.

## Arquitectura tecnica

El proyecto esta organizado como un monorepo simple:

```text
API_Mundial-Examen/
  frontend/                 # Aplicacion Angular
    src/
    public/assets/
  backend/                  # API Node.js
    src/                    # Rutas, seguridad, validaciones y configuracion
    database/               # Migraciones y SQLite
    scripts/                # Verificacion automatica
    postman/                # Coleccion de pruebas
  docs/                     # Documentacion de producto y arquitectura
```

### Frontend

- Framework: Angular.
- Responsabilidad: interfaz, rutas visuales, formularios, estado de sesion y llamadas HTTP a la API.
- La autenticacion almacena el token JWT y el usuario autenticado para proteger vistas internas.

### Backend

- Runtime: Node.js con modulos ES (`.mjs`).
- Base de datos: SQLite.
- Seguridad: JWT, contrasenas con hash criptografico y autorizacion por roles.
- API: REST en `http://localhost:3000`.

### Datos principales

- `users`: nombre, email, hash de contrasena y rol.
- `torneos`: nombre, deporte, formato, fechas y estado.
- `equipos`: nombre, grupo opcional y torneo asociado.
- `partidos`: torneo, equipos local y visitante, fecha, sede, ronda, estado y marcadores.

## Endpoints principales

| Metodo | Ruta | Uso |
|---|---|---|
| POST | `/api/auth/register` | Crear cuenta |
| POST | `/api/auth/login` | Iniciar sesion |
| GET | `/api/auth/me` | Obtener usuario autenticado |
| GET, POST | `/api/torneos` | Consultar o crear torneos |
| GET, PUT, DELETE | `/api/torneos/:id` | Gestionar un torneo |
| GET, POST | `/api/torneos/:id/equipos` | Consultar o agregar equipos |
| PUT, DELETE | `/api/equipos/:id` | Editar o eliminar equipo |
| GET, POST | `/api/torneos/:id/partidos` | Consultar o programar partidos |
| PUT, DELETE | `/api/partidos/:id` | Editar o eliminar partido |
| PUT | `/api/partidos/:id/resultado` | Registrar resultado |

## Ejecucion local

Terminal de backend:

```powershell
cd backend
npm install
npm start
```

Terminal de frontend:

```powershell
cd frontend
npm install
npm start
```

- Frontend: `http://localhost:4200`.
- Backend: `http://localhost:3000`.

## Instruccion sugerida para un chat de ideacion

> Estoy construyendo una plataforma web para administrar torneos deportivos. Ya tengo una pantalla de autenticacion deportiva, moderna y premium en verde, blanco y gris. El backend usa Node.js, JWT, roles ADMIN y CONSULTA, SQLite, y permite gestionar torneos, equipos, partidos y resultados. Ahora necesito disenar la pagina principal de administracion. Debe ser una herramienta de trabajo, no una landing page: clara, deportiva, profesional, con informacion de torneos, proximos partidos, resultados, equipos y acciones administrativas. Propone una estructura visual responsive, con navegacion, jerarquia de datos y componentes adecuados para un administrador de torneos.
