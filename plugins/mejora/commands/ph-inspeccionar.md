---
description: Inspecciona el área del día (o la indicada) y anexa los hallazgos verificados al backlog. Solo lectura sobre el código.
argument-hint: "[seguridad|seo|codigo|ux|a11y|performance|negocio]"
---

# /ph-inspeccionar — inspección del día

Corrida barata y de solo lectura. No modifica código: solo anexa hallazgos al backlog.

## 1. Contexto

Lee `PHRONESIS.md` en la raíz del proyecto. **Si no existe, detente** y sugiere correr
`/ph-iniciar`. De ahí salen la rotación, las rutas del backlog y de las lecciones, y las
restricciones duras.

## 2. Determina el área

- Si `$ARGUMENTS` trae un área, usa esa.
- Si no, usa la rotación de `PHRONESIS.md` según el día (`date +%u`; 1 = lunes). Si hoy toca
  descanso, dilo y termina.
- Si la sección *Foco de negocio* tiene una ventana vigente, corre **además** el inspector de
  negocio. Si la ventana venció, **dilo en el cierre** aunque no corras nada: el dueño tiene que
  enterarse para decidir si la renueva.

## 3. Invoca al inspector

| Área | Agente |
|---|---|
| seguridad | ph-inspector-seguridad |
| seo | ph-inspector-seo |
| codigo | ph-inspector-codigo |
| ux | ph-inspector-ux |
| a11y | ph-inspector-a11y |
| performance | ph-inspector-performance |
| negocio | ph-inspector-negocio |

Si no puedes lanzar subagentes (por ejemplo, en CI headless), lee el archivo del agente y ejecuta
su remit tú mismo, con las mismas reglas y el mismo formato.

## 4. Anexa los hallazgos

- **Antes de leer el backlog, ponte al día con el remoto:** `git fetch origin` y
  `git merge --ff-only origin/<rama-de-integración>`. El contador de IDs vive en un archivo
  versionado: leerlo de una copia atrasada reparte IDs que otra corrida ya ocupó.
  Ojo con la dirección de la comparación: `git log origin/X..X` sale **vacío justo cuando estás
  atrasado**; la que delata el atraso es `git log X..origin/X`.
- Lee el contador «Próximo ID» del backlog y **contrástalo con el último ID real del archivo**
  (`grep -o '^### BL-[0-9]*' <backlog> | tail -1`). Si no coinciden, manda el ID real.
- Asigna IDs correlativos `BL-NNNN`, anexa al final de la sección *Items* y actualiza el contador.
- Un P0 o P1 de seguridad o legal se referencia también en el registro de deudas.

## 5. Cierre

Área inspeccionada, cuántos items entraron (IDs y prioridades), cuántos se descartaron por
duplicados y cuántos descartó el propio inspector al verificar la premisa. Si no entró nada,
dilo tal cual: cero hallazgos es un resultado válido.
