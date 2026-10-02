# DEUDAS — registro de deuda técnica y decisiones pendientes

> Versionado junto al código que la genera. Que la deuda viaje con el commit que la creó.

## Convenciones

- **Tamaño:** XS (< 1 h) · S (1–4 h) · M (½–1 día) · L (1–3 días) · XL (> 3 días).
- **Prioridad:** P0 bloquea producción · P1 alto impacto · P2 razonable · P3 deseable.
- **Estado:** ⏳ pendiente · 🟡 a medias · ✅ resuelta · 🟢 prevención activa · 🔁 recurrente.
- **Origen:** qué sesión, corrida o documento la creó.
- **Política:** máximo ~3 deudas nuevas por sesión. **Un P0 se paga antes de cualquier feature.**
- **La prosa con un número envejece en silencio.** Si una deuda dice «faltan N días» o «afecta al
  X %», alguien tiene que volver a leerla cuando llegue el dato real. Si un cambio instrumenta la
  métrica que responde una pregunta escrita acá, actualizar este texto es parte del mismo trabajo.

## Registro

| ID | Deuda | Tamaño | Prioridad | Origen | Estado |
|---|---|---|---|---|---|
