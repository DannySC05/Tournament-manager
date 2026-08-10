# Guia de explicacion del proyecto: Mundial API REST con JWT

Este documento explica como funciona el proyecto, como esta organizado el codigo, como se usa Postman, que son los endpoints y que debe entender una persona que va a exponer el sistema.

## 1. Objetivo del proyecto

El proyecto es un backend para administrar informacion del Mundial de Futbol mediante una API REST.

Permite gestionar:

- Usuarios
- Selecciones
- Partidos
- Resultados
- Tabla de posiciones por grupo

Tambien incluye autenticacion con JWT, roles de usuario, validaciones y reglas de negocio.

## 2. Tecnologia usada

El proyecto esta creado con Node.js nativo, sin framework externo como Express, NestJS o Fastify.

Usa estos modulos principales:

```js
node:http
node:sqlite
node:crypto
```

Cada uno cumple una funcion:

- `node:http`: crea el servidor web y recibe las peticiones HTTP.
- `node:sqlite`: conecta con la base de datos SQLite.
- `node:crypto`: encripta passwords y firma/verifica tokens JWT.

La base de datos usada es SQLite. Se guarda en un archivo:

```text
database/mundial.sqlite
```

## 3. Estructura de carpetas

La carpeta principal del proyecto es:

```text
C:\Users\User\Documents\API_Mundial-Examen
```

Dentro estan los archivos importantes:

```text
src/server.mjs
src/app.mjs
src/db.mjs
src/security.mjs
src/validators.mjs
src/config.mjs
src/mundial2022-data.mjs
database/migrations/001_init.sql
postman/Mundial_API_JWT.postman_collection.json
scripts/verify.mjs
README.md
```

## 4. Funcion de cada archivo principal

### `src/server.mjs`

Es el archivo que inicia el servidor.

Cuando se ejecuta:

```bash
node --no-warnings src/server.mjs
```

el servidor queda activo en:

```text
http://localhost:3000
```

### `src/app.mjs`

Es el archivo mas importante del proyecto.

Aqui estan definidos:

- Los endpoints
- La logica de registro y login
- El CRUD de selecciones
- El CRUD de partidos
- La tabla de posiciones
- La importacion del Mundial 2022
- La autorizacion por roles

Dentro de este archivo se encuentra la funcion:

```js
function makeRoutes() {
```

Esa funcion contiene todas las rutas de la API.

### `src/db.mjs`

Se encarga de abrir la conexion con SQLite.

Tambien ejecuta la migracion:

```text
database/migrations/001_init.sql
```

Eso significa que al iniciar el servidor se crean las tablas si no existen.

### `src/security.mjs`

Contiene la seguridad del sistema:

- Hash de passwords
- Verificacion de passwords
- Creacion de JWT
- Validacion de JWT

El password no se guarda en texto plano. Se guarda encriptado con PBKDF2.

### `src/validators.mjs`

Contiene validaciones como:

- Email valido
- Password minimo de 8 caracteres
- Ranking FIFA numerico
- Goles no negativos
- Fases validas
- Estados validos
- Una seleccion no puede jugar contra si misma

### `src/mundial2022-data.mjs`

Contiene la estructura base del Mundial 2022:

- 32 selecciones oficiales
- Partidos de grupos
- Octavos
- Cuartos
- Una semifinal
- Un placeholder llamado `Pendiente`

El placeholder `Pendiente` se usa cuando todavia no se sabe que seleccion jugara un partido programado.

## 5. Como ejecutar el proyecto

Primero se abre una terminal en la carpeta del proyecto:

```text
C:\Users\User\Documents\API_Mundial-Examen
```

Luego se ejecuta:

```bash
node --no-warnings src/server.mjs
```

Debe aparecer:

```text
Mundial API escuchando en http://localhost:3000
```

Esa terminal debe quedar abierta mientras se usa Postman.

## 6. Que es un endpoint

Un endpoint es una ruta de la API donde se puede realizar una accion.

Por ejemplo:

```http
GET /api/selecciones
```

Ese endpoint sirve para consultar selecciones.

La URL completa seria:

```text
http://localhost:3000/api/selecciones
```

## 7. Metodos HTTP usados

El proyecto usa estos metodos HTTP:

| Metodo | Significado | Ejemplo |
|---|---|---|
| GET | Consultar datos | Listar selecciones |
| POST | Crear datos | Crear usuario o partido |
| PUT | Actualizar datos | Actualizar resultado |
| DELETE | Eliminar datos | Eliminar seleccion |

Ejemplo:

```http
POST /api/partidos
```

crea un partido.

```http
PUT /api/partidos/5/resultado
```

actualiza el resultado del partido con id `5`.

## 8. Autenticacion con JWT

JWT significa JSON Web Token.

El sistema funciona asi:

1. El usuario se registra o inicia sesion.
2. La API devuelve un token.
3. Ese token se envia en las siguientes peticiones.
4. La API verifica si el token es valido.
5. Si el token es valido, permite acceder al endpoint.

El token se envia en el header:

```http
Authorization: Bearer TOKEN_AQUI
```

En Postman esto ya esta automatizado en la coleccion.

## 9. Roles de usuario

Hay dos roles:

```text
ADMIN
CONSULTA
```

### ADMIN

Puede:

- Consultar
- Crear
- Editar
- Eliminar
- Importar estructura del Mundial 2022

### CONSULTA

Solo puede consultar con `GET`.

Si intenta crear, editar o eliminar, la API responde:

```http
403 Forbidden
```

## 10. Primer usuario ADMIN

La base inicia vacia.

Para facilitar la evaluacion, el primer usuario registrado puede ser `ADMIN`.

Ejemplo:

```json
{
  "nombre": "Administrador",
  "email": "admin@mundial.test",
  "password": "Admin1234",
  "rol": "ADMIN"
}
```

Los siguientes usuarios registrados quedan como `CONSULTA`.

## 11. Base de datos

La base de datos tiene 3 tablas principales:

### `users`

Guarda usuarios:

- id
- nombre
- email
- password_hash
- rol

### `selecciones`

Guarda selecciones:

- id
- nombre
- continente
- grupo
- ranking_fifa
- entrenador

### `partidos`

Guarda partidos:

- id
- seleccion_local_id
- seleccion_visitante_id
- fecha
- estadio
- fase
- goles_local
- goles_visitante
- estado

## 12. Estados de partido

Los estados validos son:

```text
PROGRAMADO
EN_JUEGO
FINALIZADO
```

Ejemplo:

- Una final que aun no se juega esta `PROGRAMADO`.
- Una semifinal que se esta jugando esta `EN_JUEGO`.
- Un partido con resultado final esta `FINALIZADO`.

Cuando se usa:

```http
PUT /api/partidos/{id}/resultado
```

la API cambia automaticamente el estado a:

```text
FINALIZADO
```

## 13. Fases validas

Las fases validas son:

```text
GRUPOS
OCTAVOS
CUARTOS
SEMIFINAL
FINAL
```

## 14. Reglas de negocio

El sistema valida estas reglas:

- Una seleccion no puede jugar contra si misma.
- Las selecciones de un partido deben existir.
- Los goles no pueden ser negativos.
- Al registrar resultado, el partido pasa a `FINALIZADO`.
- La tabla de posiciones calcula estadisticas automaticamente.
- El rol `CONSULTA` no puede modificar datos.

## 15. Tabla de posiciones

El endpoint:

```http
GET /api/grupos/{grupo}/tabla
```

calcula la tabla de posiciones de un grupo.

Ejemplo:

```http
GET /api/grupos/A/tabla
```

Calcula:

| Campo | Significado |
|---|---|
| PJ | Partidos jugados |
| PG | Partidos ganados |
| PE | Partidos empatados |
| PP | Partidos perdidos |
| GF | Goles a favor |
| GC | Goles en contra |
| DG | Diferencia de goles |
| PTS | Puntos |

Ordena por:

1. Puntos
2. Diferencia de goles
3. Goles a favor

## 16. Endpoints principales

### Autenticacion

| Metodo | Endpoint | Funcion |
|---|---|---|
| POST | `/api/auth/register` | Registrar usuario |
| POST | `/api/auth/login` | Iniciar sesion |
| GET | `/api/auth/me` | Ver usuario autenticado |
| POST | `/api/auth/logout` | Cerrar sesion en cliente |

### Selecciones

| Metodo | Endpoint | Funcion |
|---|---|---|
| GET | `/api/selecciones` | Listar selecciones |
| GET | `/api/selecciones/{id}` | Ver una seleccion |
| POST | `/api/selecciones` | Crear seleccion |
| PUT | `/api/selecciones/{id}` | Actualizar seleccion |
| DELETE | `/api/selecciones/{id}` | Eliminar seleccion |

### Partidos

| Metodo | Endpoint | Funcion |
|---|---|---|
| GET | `/api/partidos` | Listar partidos |
| GET | `/api/partidos/{id}` | Ver un partido |
| GET | `/api/partidos/fase/{fase}` | Listar partidos por fase |
| POST | `/api/partidos` | Crear partido |
| PUT | `/api/partidos/{id}` | Actualizar partido |
| PUT | `/api/partidos/{id}/resultado` | Registrar resultado |
| DELETE | `/api/partidos/{id}` | Eliminar partido |

### Tabla

| Metodo | Endpoint | Funcion |
|---|---|---|
| GET | `/api/grupos/{grupo}/tabla` | Ver tabla de posiciones |

### Importacion Mundial 2022

| Metodo | Endpoint | Funcion |
|---|---|---|
| POST | `/api/import/mundial-2022` | Crear estructura base del Mundial 2022 |

## 17. Como funciona Postman

Postman sirve para probar la API sin necesidad de una pagina web.

La coleccion esta en:

```text
postman/Mundial_API_JWT.postman_collection.json
```

Se importa en Postman con:

```text
Import -> seleccionar archivo JSON
```

## 18. Flujo recomendado en Postman

Se recomienda ejecutar las peticiones en este orden:

1. `Auth - registrar primer ADMIN`
2. `Auth - login ADMIN`
3. `Auth - me`
4. `Import - Mundial 2022 base`
5. `Mundial 2022 - crear semifinal en progreso`
6. `Mundial 2022 - finalizar semifinal reservada`
7. `Mundial 2022 - crear final programada con pendiente`
8. `Mundial 2022 - actualizar rival pendiente de la final`
9. `Mundial 2022 - finalizar final reservada`
10. `Tabla - grupo A`
11. `Auth - registrar CONSULTA`
12. `CONSULTA - puede listar`
13. `CONSULTA - modificar devuelve 403`

## 19. Variables de Postman

La coleccion guarda variables automaticamente.

Algunas variables son:

```text
token_admin
token_consulta
argentina_id
francia_id
marruecos_id
pendiente_id
semifinal_reservada_id
final_reservada_id
```

Esto evita escribir manualmente IDs.

Por ejemplo, cuando se importa el Mundial 2022, Postman guarda:

```text
argentina_id
francia_id
marruecos_id
pendiente_id
```

Luego esas variables se usan para crear partidos.

## 20. Flujo de la final con Pendiente

La final se crea primero como:

```text
Argentina vs Pendiente
```

porque aun no se sabe quien sera el rival de Argentina.

Luego se juega la semifinal:

```text
Marruecos vs Francia
```

Cuando Francia gana, se actualiza la final:

```text
Argentina vs Francia
```

Finalmente se registra el resultado de la final.

Este flujo demuestra que el sistema puede manejar partidos programados con rivales por definir.

## 21. Ejemplo de creacion de partido

Endpoint:

```http
POST /api/partidos
```

Cuerpo JSON:

```json
{
  "seleccion_local_id": 1,
  "seleccion_visitante_id": 2,
  "fecha": "2022-12-18T15:00:00Z",
  "estadio": "Lusail",
  "fase": "FINAL",
  "estado": "PROGRAMADO"
}
```

## 22. Ejemplo de actualizar resultado

Endpoint:

```http
PUT /api/partidos/5/resultado
```

Cuerpo JSON:

```json
{
  "goles_local": 3,
  "goles_visitante": 3
}
```

La API actualiza los goles y cambia el estado a:

```text
FINALIZADO
```

## 23. Prueba automatica

El proyecto incluye un script de verificacion:

```bash
node --no-warnings scripts/verify.mjs
```

Ese script prueba automaticamente:

- Registro
- Login
- JWT
- Roles
- CRUD basico
- Validaciones
- Tabla de posiciones
- Importacion Mundial 2022
- Semifinal en progreso
- Final con pendiente
- Actualizacion a finalizado

Si todo esta correcto, muestra:

```text
OK - autenticacion, autorizacion, reglas de negocio, validaciones, tabla, importacion Mundial 2022 y partidos reservados verificados.
```

## 24. Que decir en una exposicion

Una explicacion breve podria ser:

```text
Nuestro proyecto es una API REST para administrar informacion del Mundial.
Fue desarrollado con Node.js nativo y SQLite. Implementa autenticacion con JWT,
roles ADMIN y CONSULTA, validaciones y reglas de negocio.

Los administradores pueden crear y actualizar selecciones y partidos.
Los usuarios de consulta solo pueden ver informacion.

Tambien se implemento una carga inicial del Mundial 2022 con 32 selecciones,
partidos de grupos, octavos, cuartos y una semifinal. Para demostrar el flujo
de negocio, se creo una final primero con rival Pendiente, luego se actualiza
el rival cuando termina la semifinal, y finalmente se registra el resultado.

La tabla de posiciones se calcula automaticamente con partidos finalizados.
```

## 25. Puntos importantes para defender

- No se guarda el password en texto plano.
- Los endpoints protegidos requieren JWT.
- `ADMIN` tiene acceso completo.
- `CONSULTA` solo puede consultar.
- Las validaciones evitan datos incorrectos.
- La base se crea automaticamente con la migracion SQL.
- Postman permite probar todo el flujo sin crear una interfaz visual.
- El placeholder `Pendiente` permite programar partidos con rival aun no definido.

## 26. Resumen final

El sistema funciona asi:

1. Se inicia el servidor.
2. Se registra un usuario ADMIN.
3. El ADMIN recibe un JWT.
4. Con ese JWT se accede a endpoints protegidos.
5. Se importan datos base del Mundial 2022.
6. Se crean y actualizan partidos.
7. Se registran resultados.
8. Se consulta la tabla de posiciones.

El proyecto cumple con autenticacion, autorizacion, reglas de negocio, validaciones minimas, API REST, migracion SQL y pruebas en Postman.
