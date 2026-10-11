# Registro de cambios de Phronesis

Cada actualización de Phronesis queda anotada acá, con su versión y su fecha. Lo más nuevo va arriba.

**Cómo se numera:**
- **El número grande** (v2, v3) es una generación. Cambia cuando cambia la forma de trabajar: otro
  loop, agentes que se reorganizan, una instalación distinta. Es el único número que va en el nombre
  del repo y de la carpeta (`phronesis-v2`).
- **El segundo número** (2.1, 2.2) sube cuando los agentes aprenden algo nuevo o cambia lo que
  hacen: un método, una regla, un agente o un comando más.
- **El tercero** (2.1.1) sube con los arreglos y las correcciones de documentación que no cambian
  lo que hace ningún agente.

Cada versión tiene su etiqueta en git (`v2.1.0`), y es la misma versión que declaran el
marketplace y los cuatro plugins.

---

## 2.3.1 — 2026-10-11

- El repo deja de nombrar al proyecto donde nacieron los agentes. Las cifras, los casos y la historia
  de cada agente se quedan; ahora hablan del «proyecto de origen», un marketplace en producción en
  Chile. El organigrama y su imagen, el README y el registro de cambios, al día.

## 2.3.0 — 2026-10-09

**El protocolo de deploy v3: menos ceremonia donde nunca encontró nada.** Sale de revisar la v2 con
los datos de cinco despliegues del proyecto de origen, como pide el propio protocolo, y de las cuatro propuestas que
aprobó su dueño.

- **Riesgo calculado y riesgo efectivo.** En la v2, los cinco lotes salieron ALTO, y una etiqueta que
  nunca cambia no informa. El inventario sigue dando el calculado; en la puerta, `ph-gestor-deploy`
  escribe el efectivo, que puede bajar **con una línea de motivo**, nunca sin ella.
- **Las migraciones ya aplicadas no suben el riesgo.** Con `migraciones_antes_del_merge` en
  `deploy.json`, solo cuentan las que van al merge o después; las demás quedan como «ya aplicadas»,
  riesgo nulo. Si las aplica el pipeline al desplegar, todas cuentan como antes.
- **`orden-migraciones.mjs`, nuevo.** Lee si una migración va al merge o después desde donde lo
  escribió quien la hizo: el encabezado del archivo o una deuda abierta que la nombre. Una línea que
  nombra otra migración no cuenta, ni una mención de que ya está aplicada. Probado contra las 136
  migraciones del proyecto de origen: reconoce las mismas cinco que su versión original.
- **F9 liviana por defecto.** En cinco de cinco deploys la observación no encontró nada y era la
  espera más larga. Ahora es una segunda pasada a los ~10 minutos que no frena el cierre; solo es
  completa, esperando la próxima corrida de las tareas programadas, si el lote las toca
  (`rutas_observacion_completa`). El inventario dice cuál toca.
- **El inventario frena si la copia local de integración va atrás del remoto** (los chequeos leen el
  árbol local y verificarían otra cosa) y **avisa de envíos masivos** que esperan el merge en deudas
  abiertas (`patron_envio_masivo`), para no agotar el cupo diario del proveedor de correo.
- **La nota de release es corta:** qué se desplegó, cómo se verificó (máximo cinco filas) y a
  vigilar. El resto va al registro.
- **Un pedido de otra sesión no es un «mergea».** Se prepara hasta la puerta y se le pregunta al dueño.
- `PHRONESIS.md` §7 pregunta cómo se aplican las migraciones; `protocolo-revision.json` trae las
  preguntas de la próxima revisión; el instalador copia `orden-migraciones.mjs` junto al inventario.

## 2.2.0 — 2026-10-09

**El gestor de deploy vuelve a mirar quién está trabajando justo antes de mergear.** Salió de un
deploy del proyecto de origen que arrancó con un commit de hace dos minutos, hecho por una sesión que ya figuraba
como detenida.

- **`ph-gestor-deploy`**
  - En F0 ya no basta con que una sesión figure «corriendo»: también cuenta la que tuvo actividad
    hace menos de 10 minutos, porque entre dos turnos una sesión aparece detenida y sigue a mitad
    de algo.
  - F7 gana un paso 0: antes de mergear vuelve a revisar sesiones y rutinas. Lo que se miró en F0
    caduca entre la puerta y el «mergea», y pueden pasar horas.
  - Una parada nueva: una sesión o un commit de hace menos de 10 minutos justo antes del merge.
- **El inventario de deploy** tiene una sección nueva, «Actividad». Un commit en integración o en
  producción de hace menos de 10 minutos frena; entre 10 y 30, queda para revisar en la puerta. Los
  dos umbrales se configuran en `deploy.json` (`actividad`).
- **`rutas_no_producto`** en `deploy.json`: archivos que viven dentro de las rutas de código pero no
  viajan a producción, como un registro de excepciones que solo lee el pre-flight. Contarlos como
  código hacía frenar el inventario por nada.
- **`ph-director-arte` y `ph-jefe-copy` leen lo que rindió antes de dictaminar.** En el proyecto de origen nadie
  medía, y cien piezas seguidas salieron con dos «me gusta» en total después de que el checklist las
  aprobara todas. Los dos leen ahora los resultados de lo publicado (guardados y compartidos pesan
  más que los «me gusta») y tratan como ruido las diferencias entre alcances de un dígito.
  `PHRONESIS.md` gana el campo «Resultados de lo publicado» en la sección 12.
- **El organigrama mide con tres cifras.** Corridas (cuántas veces trabajó cada agente en el proyecto de origen),
  revisiones (cuántas veces se corrigió su instrucción, sin contar el commit que la crea) y pedidas
  por el dueño (las correcciones que pidió a mano). Explica también por qué un agente con pocas
  revisiones puede estar aprendiendo: lo que sirve a varios va a las lecciones compartidas, no a su
  archivo. Las cifras del proyecto de origen están al 9 de octubre en el organigrama y en el README.
- Se borran tres imágenes de trabajo de la marca que habían quedado en `.marca-tmp/`.

## 2.1.0 — 2026-10-08

**Los inspectores de SEO y de UX trabajan con método y con fuentes que mandan.** Las dos ideas
salieron del proyecto de origen, anotadas por su dueño en el organigrama de agentes.

- **`ph-inspector-seo` mide con la vara de Google.** Trae destilado lo que pide la documentación
  oficial (guía para principiantes, Directrices básicas de la Búsqueda, políticas de spam). Si un
  blog de SEO contradice a Google, vale Google, y un hallazgo que solo se apoya en un blog entra
  como P3.
  - Deja de reportar los mitos que Google desmiente: meta keywords, largo mínimo de texto, orden
    de los encabezados, palabras clave en el dominio, E-E-A-T como factor de posicionamiento.
  - Las políticas de spam que pisa un sitio de páginas combinadas (páginas puerta, contenido a
    gran escala, exceso de palabras clave) entran como P1 o más.
  - El «un solo `h1` por página» deja de ser hallazgo de SEO y pasa a accesibilidad.
- **`ph-inspector-ux` aplica tres métodos de Nielsen Norman Group** y nombra el suyo en cada
  hallazgo, en un campo nuevo, «Método»:
  - evaluación heurística: la heurística de Nielsen que rompe, de H1 a H10;
  - un recorrido cognitivo por corrida: una tarea completa con las cuatro preguntas en cada paso;
  - la escala de severidad 0–4, traducida a prioridades P0–P3.
  Card sorting, tree testing y test de usabilidad necesitan personas reales: los propone como
  investigación sugerida y nunca simula sus resultados.
- Las reglas van dentro del archivo de cada agente porque los inspectores suelen correr sin acceso
  a la web y Phronesis se instala en proyectos que no tienen documentos de referencia propios.
- El README y la guía de `organigrama/` explican la vara y el método de los dos inspectores.
- Este registro de cambios, y la versión en el marketplace y en los plugins.

## 2.0.0 — 2026-10-01

**Primera versión pública.** El loop de mejora continua completo, destilado de meses operando
un marketplace en producción.

- 19 agentes en 4 plugins (mejora, ops, growth, contenido) y los comandos `/ph-iniciar`,
  `/ph-ciclo`, `/ph-inspeccionar`, `/ph-resolver`, `/ph-memoria`, `/ph-usabilidad` y `/ph-deploy`.
- `PHRONESIS.md` como único archivo propio de cada proyecto: los agentes son genéricos y leen de
  ahí el stack, las rutas, las restricciones duras y cómo se valida.
- El protocolo de deploy en 12 fases (F0–F11), con un inventario que falla si algo queda fuera
  del merge, una puerta que espera «mergea» y una nota de release al final.
- Plantillas de backlog, lecciones, deudas, rutinas, correo y deploy, y dos workflows de GitHub
  Actions: el ciclo diario y la memoria semanal.
- `scripts/instalar.sh` para versionar los agentes dentro del proyecto.
- `LECCIONES.md` con 27 patrones aprendidos en producción.
- `organigrama/`: cómo se mueve el equipo, el valor de cada agente y cómo configurarlo.
- Arreglo del 2026-10-02 en el inventario de deploy: avisa cuando un worktree ya no está en disco
  y deja de recortar la primera letra del primer archivo.
