---
description: Resuelve los items resolubles del backlog en la rama de integración, un commit por item, y cierra con el validador QA. El único comando del loop que modifica código.
argument-hint: "[tope de items, por defecto 4]"
---

# /ph-resolver — ejecutar mejoras

El único comando del loop que modifica código. Todo ocurre en la **rama de integración** que
declara `PHRONESIS.md`; el dueño modera una sola vez, en el PR hacia producción, mirando el
producto funcionando. **Producción no se toca nunca desde acá.**

## 0. Rama correcta

Verifica con `git branch --show-current` que estás en la rama de integración. **Vuelve a
verificarlo justo antes de cada `git commit`**, no solo al inicio: si otra rutina comparte el
mismo directorio de trabajo, la rama puede cambiar a mitad de corrida. Si al ir a commitear
estás en otra rama, no commitees: cámbiate (con `git stash` si hace falta) y recién ahí.

## 1. Contexto

Lee `PHRONESIS.md`, luego las lecciones (respétalas todas) y el backlog (los items en `nuevo`
son los candidatos).

## 2. Selección

- Candidatos: todos los items `nuevo` que no caigan en restricciones duras.
- Orden: P0 → P3; a igual prioridad, tamaño menor primero.
- **Tope: 4 items por corrida** (1 si es L o XL), o el que traiga `$ARGUMENTS`. El tope existe
  para que el validador revise lotes chicos y para cuidar el presupuesto; lo que sobra queda
  para mañana.

## 3. Si no hay nada resoluble, paga una deuda

Una corrida sin hallazgos no queda en cero: paga **una** deuda del registro de deudas, la de
mayor prioridad que puedas cerrar sola (a igual prioridad, la más chica). Descártala y pasa a la
siguiente si necesita al dueño: cae en restricciones duras, espera una decisión, necesita una
credencial o un clic en un panel externo, es una decisión de producto grande, o es L/XL.

Si revisas 5 candidatas y ninguna califica, ciérralo diciéndolo. **No bajes el estándar ni
inventes trabajo** para tener algo que mostrar.

Una deuda pagada entra al backlog como item normal (con `Origen: deuda D-NNN`), pasa por el
mismo commit y el mismo QA, y **al cerrarse se actualiza también su fila en el registro de
deudas**. Una deuda pagada que sigue figurando como pendiente es peor que no haberla tocado.

## 4. Restricciones duras → Issue, no código

Si un item cae en las restricciones duras de `PHRONESIS.md`, **no lo implementes**: márcalo
`bloqueado-humano`, abre un Issue (`gh issue create`, etiqueta `necesita-decision`) con el item
completo y la **decisión concreta** que se necesita, y anota el enlace en el item.

Las decisiones de producto grandes también van a Issue. Las chicas (un microcopy, un estado vacío,
un estilo de foco) sí se resuelven: el dueño las ve funcionando y las rechaza en el PR si no le
gustan. Ese es el control.

## 5. Ejecución por item

1. `Estado: en-progreso`.
2. El **cambio mínimo** que cumple los criterios de aceptación, respetando la arquitectura, el
   idioma y las convenciones de `PHRONESIS.md`.
3. **Busca los hermanos antes de cerrar.** Un arreglo cierra un caso; los gemelos siguen abiertos
   hasta que alguien los busque: la acción inversa, la otra copia del mismo literal, el otro
   archivo con el mismo patrón.
4. **Un commit por item** — el validador revierte por commit si algo rompe. Mensaje con el ID y
   el porqué.
5. `Estado: hecho` y *Resolución* con qué cambió y dónde (`archivo:línea`).

## 6. QA

Al terminar, invoca a **ph-validador-qa** y acata su veredicto. Si revirtió un item, queda
`necesita-info`: no insistas en esta corrida.

## 7. Cierre

Items resueltos (ID + una línea), revertidos por QA, derivados a Issue, deuda pagada si la hubo,
y qué quedó para mañana. En CI no pushees ni despliegues: lo hace el workflow.
