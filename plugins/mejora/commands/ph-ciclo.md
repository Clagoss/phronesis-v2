---
description: La corrida diaria completa del loop de mejora continua — inspecciona el área del día, resuelve lo resoluble, valida con QA y deja todo listo para que el dueño lo modere en un solo PR.
argument-hint: "[área, opcional]"
---

# /ph-ciclo — corrida diaria

Orquesta el loop completo sobre la **rama de integración**. El dueño modera una sola vez, en el
PR hacia producción. Producción no se toca nunca desde acá.

## 1. Rama y sincronización

- Verifica que estás en la rama de integración.
- **Sincroniza las dos ramas, no solo la de producción:** `git fetch origin`, luego
  `git merge --ff-only origin/<integración>` y **después** `git merge origin/<producción>`.
  En CI el checkout ya parte del remoto, pero una corrida local puede arrancar desde un
  directorio que lleva días parado.
- **Antes de cualquier `git reset --hard`**, mira `git status --porcelain`: si hay cambios ajenos
  sin commitear, avisa en el cierre en vez de arrasarlos.
- **Si hay más de un lugar que puede correr el ciclo** (la nube y un respaldo local, por ejemplo),
  el respaldo verifica que la nube no esté corriendo o no haya terminado ya — **al arrancar y otra
  vez antes de la primera escritura**. Chequear solo al arrancar no alcanza: la cola de los runners
  gratuitos puede atrasar el disparo sin techo, y dos corridas en paralelo reparten los mismos IDs.

## 2. Decisiones pendientes del dueño

Revisa los Issues abiertos con etiqueta `necesita-decision`. Si el dueño ya comentó una decisión,
actualiza el item del backlog (vuelve a `nuevo`, con la decisión anotada), comenta en el Issue que
quedó destrabado y ciérralo. Ese item entra como candidato hoy mismo.

## 3. Inspección

Ejecuta `/ph-inspeccionar` con el área de `$ARGUMENTS` o la de la rotación.

## 4. Resolución y QA

Ejecuta `/ph-resolver`: los items resolubles (tope 4), un commit por item, restricciones duras a
Issue, deuda pagada si no hubo nada, y el veredicto de **ph-validador-qa** al final.

## 5. Cierre

Un resumen que sirva de cuerpo del PR:

- Área inspeccionada y cuántos items entraron.
- Items resueltos (ID + una línea, **con el detalle de qué cambió y dónde**), revertidos por QA,
  derivados a Issue.
- Si no hubo hallazgos, dilo y di **qué deuda se pagó** o por qué ninguna calificaba.
- Si la ventana del foco de negocio venció, dilo.
- Recordatorio: revisar el ambiente de integración y el diff del PR; mergear = publicar.

**Si no hiciste nada, que se note.** Un ciclo que no hace nada y termina en verde es idéntico, desde
afuera, a uno que funciona. El cierre tiene que dejar claro cuál de los dos fue.
