# PHRONESIS.md — contexto del proyecto

> Copia este archivo a la **raíz de tu proyecto** como `PHRONESIS.md` y complétalo. Es la única
> pieza específica de tu proyecto: todos los agentes de Phronesis v2 lo leen antes de trabajar, así
> que ellos se mantienen genéricos y tú no tienes que tocar ninguno.
>
> Si un campo no aplica, déjalo vacío o escribe «no aplica». Un agente que no encuentra un dato
> **pregunta o se abstiene**; nunca lo inventa.

---

## 1. El proyecto

- **Nombre:**
- **Qué es, en una frase:**
- **Para quién:** (público, país, idioma)
- **Etapa:** (prototipo · lanzado sin usuarios · con usuarios reales · en crecimiento)

## 2. Stack

- **Frontend:**
- **Backend / datos:**
- **Hosting / despliegue:**
- **Base de datos y control de acceso:** (ej. Postgres con RLS, Firestore rules, ACL propio)

## 3. Rutas clave

| Qué | Dónde |
|---|---|
| Código de la aplicación | |
| Migraciones de base de datos | |
| Lógica que muta datos (acciones, endpoints) | |
| Componentes de interfaz | |
| Tests | |

## 4. Idioma y convenciones

- **Idioma de la interfaz y de los commits:**
- **Registro / tono:** (ej. español de Chile con tuteo)
- **Léxico canónico:** (términos que siempre se escriben igual — dónde está la tabla, si existe)

## 5. Restricciones duras

> Lo que **ningún agente puede tocar por su cuenta**, aunque parezca un arreglo obvio. Si un
> hallazgo cae acá, se reporta con `Estado: bloqueado-humano` y va a un Issue con la etiqueta
> `necesita-decision`. Esta lista es la que más vale completar bien.

Por defecto Phronesis v2 ya trata como restricción dura:

- Migraciones de base de datos y cambios de esquema.
- Pagos y todo lo que mueva dinero.
- Autenticación, autorización, roles y políticas de acceso a datos.
- Borrado de datos.

Agrega las propias de tu proyecto (temas legales, categorías sensibles, datos de menores, etc.):

-
-

## 6. Validación

> Los comandos que el validador corre antes de dar algo por hecho. Si uno no existe, escríbelo
> como «no existe»: el validador lo va a reportar en vez de saltarlo en silencio.

- **Typecheck:**
- **Build:**
- **Rutas críticas para el humo** (las que deben responder 200 y mostrar contenido):
- **Chequeos propios:** (encoding, seguridad, lint)

## 7. Ramas y despliegue

- **Rama de integración** (donde trabaja el loop): ej. `staging`
- **Rama de producción:** ej. `main`
- **Cómo se despliega a producción:** (merge del PR, workflow, manual)
- **URL del ambiente de integración, si existe:**

## 8. Archivos del loop de mejora

> Puedes dejar las rutas por defecto. Si ya tienes un backlog o un registro de deudas con otro
> nombre, apunta acá.

| Archivo | Ruta por defecto |
|---|---|
| Backlog de hallazgos | `docs/mejora/BACKLOG.md` |
| Lecciones aprendidas | `docs/mejora/LECCIONES.md` |
| Registro de deudas | `docs/DEUDAS.md` |

## 9. Rotación de inspección

> Qué área se inspecciona cada día. Ajústala a lo que más le duele a tu proyecto.

| Día | Área |
|---|---|
| Lunes | seguridad |
| Martes | seo |
| Miércoles | codigo |
| Jueves | ux |
| Viernes | a11y |
| Sábado | performance |
| Domingo | descanso |

## 10. Foco de negocio (opcional)

> Si hay una funcionalidad o una pregunta de negocio que quieres que el loop vigile durante un
> período, decláralo acá con fecha de término. El inspector de negocio agrega un hallazgo por
> corrida sobre ese foco, encima de la rotación.

- **Estado:** inactiva
- **Foco:**
- **Inicio:**
- **Fin:**
- **Serie de métricas:** (ruta de las fotos diarias, ej. `docs/metricas/AAAA-MM-DD.json`, y qué
  script las produce)
- **Contenido que NO cuenta como tracción:** (cómo se distinguen los datos de prueba, el contenido
  sembrado y las cuentas del dueño, ej. `is_seed = true`, el id de tu usuario)

> **Ojo con la fecha de fin.** Cuando una ventana vence, el loop salta el paso y sigue terminando
> en verde. Un no-op deliberado se ve idéntico a estar funcionando: por eso el inspector avisa en
> voz alta cuando la ventana venció, pero alguien tiene que leerlo y renovarla.

## 11. Outreach (opcional — solo si usas el plugin `growth`)

- **Plan de outreach** (fuente de verdad): ej. `docs/ops/outreach/PLAN.md`
- **Lista maestra de prospectos:** ej. `docs/ops/outreach/prospectos.csv`
- **Registro de envíos:** ej. `docs/ops/outreach/envios.jsonl`
- **Rubros activos y fechas de cambio de oferta:**
- **Tope diario de prospectos nuevos:**
- **Voz y firma:** (quién firma, con qué rol, en qué tono)
- **Oferta vigente:** (lo único que el copywriter puede prometer)

## 12. Contenido para redes (opcional — solo si usas el plugin `contenido`)

- **Sistema de plantillas:** ej. `docs/design/plantillas-redes.md`
- **Design system / tokens:**
- **Dónde quedan las tandas:**
- **Redes y formatos:** (feed, historias, reels)

## 13. Operación (opcional — solo si usas el plugin `ops`)

- **Registro de despliegues:** ej. `docs/ops/DEPLOY-LOG.md`
- **Cómo se ve qué versión está viva:** (ej. un endpoint de salud que expone el commit)
- **Cómo se hace rollback:**
- **Inventario de rutinas:** ej. `docs/ops/rutinas.json` (ver `plantillas/rutinas.json`)
- **Configuración de correo:** ej. `docs/ops/correo/<proyecto>.json` (ver `plantillas/correo.json`)
