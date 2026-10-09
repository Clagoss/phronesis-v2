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

## 2.1.0 — 2026-10-08

**Los inspectores de SEO y de UX trabajan con método y con fuentes que mandan.** Las dos ideas
salieron de Avisia, anotadas por su dueño en el organigrama de agentes.

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
[Avisia](https://avisia.cl) en producción.

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
