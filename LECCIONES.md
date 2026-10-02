# Lecciones — el corazón de Phronesis

> Cada una salió de un error real y costoso en un proyecto en producción, no de un manual.
> Están **generalizadas**: se les quitó el stack y el dominio original y quedó el patrón
> transferible. Cuando una lección se aplica sola en tres proyectos, promuévela a `CLAUDE.md`.
>
> Formato: **el error → la regla → cómo detectarlo**.
>
> Las 1 a 15 vienen de la v1. Las 16 a 27 son nuevas en la v2: salieron de los dos meses
> siguientes de operación, y varias ya viven como regla dentro de los agentes.

---

## 1. Verde no es lo mismo que hecho

**El error.** Una rutina publicó contenido durante seis días seguidos reportando "3 publicados ✅"
cada día. Ninguno era visible para el visitante: la portada estaba congelada por generación
estática y un criterio de orden empujaba lo nuevo fuera de la vista. La rutina verificaba **su
propia escritura**, no el efecto que le importaba a un humano.

**La regla.** Una tarea automática está verde cuando produjo su **efecto observable**, no cuando
terminó sin error. Todo proceso automatizado define su efecto verificable *antes* de correr, y lo
comprueba desde afuera: desde donde lo vería el usuario, no desde donde lo escribió el sistema.

**Cómo detectarlo.** Pregúntale a cada automatización: *"si esto fallara a medias, ¿alguien se
enteraría?"*. Si la respuesta es "aparecería en un log que nadie mira", no tienes verificación.

---

## 2. Un despliegue exitoso no significa que tu código esté vivo

**El error.** Una caída del proveedor de CI mató el despliegue justo después de aprobar el
release. Producción quedó sirviendo la versión anterior durante horas. El sitio respondía
perfecto — solo que era el código viejo. El fracaso figuraba en una lista que nadie mira.

**La regla.** Después de desplegar, verifica **qué versión está viva**, no que el pipeline haya
terminado. La forma exacta: expón el identificador del commit en un endpoint de salud y compáralo
con el de tu rama principal. Comparar marcas de tiempo es un proxy frágil que además invita a
errores de huso horario.

**Cómo detectarlo.** Si tu única evidencia de que desplegaste es una marca verde en el CI, estás
confiando en el mensajero. Un despliegue que nadie verificó es un despliegue que no ocurrió.

---

## 3. Distingue la falla tuya de la falla de la plataforma

**El error.** Se perdió tiempo diagnosticando código propio cuando en realidad el proveedor
estaba en incidente y ninguna tarea llegaba a ejecutar una sola línea nuestra.

**La regla.** Ante un fallo de CI, clasifica **antes** de arreglar. Tres señales, en orden de
costo:
1. La página de estado del proveedor (10 segundos, respuesta definitiva).
2. **Dónde** murió: si falló antes de tus pasos (preparación del entorno, descarga de acciones),
   no es tuyo.
3. ¿Fallaron **varias tareas sin relación** en la misma ventana? Eso es plataforma, siempre.

**Cómo detectarlo.** Automatiza el chequeo del estado del proveedor en tu rutina de diagnóstico.
Y cuando sea la plataforma: reintenta con paciencia, no "arregles" lo que no está roto.

---

## 4. Cuando una tarea local no corre, nadie se entera

**El error.** Dos rutinas programadas en un equipo personal no corrieron un martes (máquina
apagada). Se descubrió **dos días después**, por auditoría manual. El registro solo guardaba
"última ejecución", que no distingue *"corrió ayer porque hoy aún no toca"* de *"lleva días sin
correr"*.

**La regla.** Toda tarea programada emite un **latido** al terminar, con su resultado en pocas
palabras, a un lugar consultable. Un chequeo periódico alerta si un latido esperado está vencido.
El latido se emite **incluso cuando el resultado fue malo** — un latido con mala noticia vale
infinitamente más que ningún latido.

**Cómo detectarlo.** Si para saber si tus rutinas corrieron tienes que ir a mirarlas una por una,
no tienes observabilidad: tienes esperanza.

---

## 5. En un cambio de permisos, el código va PRIMERO

**El error.** Se restringieron permisos de columnas en la base **antes** de desplegar el código
que leía por el camino nuevo. Una pantalla quedó vacía en producción hasta que se restauraron a
mano. Nadie lo reportó: el fallo era silencioso, porque el cliente devuelve "sin datos" ante un
error de permisos y la página renderiza vacía en vez de romperse.

**La regla.** Secuencia obligatoria para cualquier restricción de permisos sobre datos con
lecturas en vivo:
1. Desplegar el código que ya funciona con el permiso restringido.
2. **Recién ahí** aplicar la restricción.
3. Volver a correr la prueba adversarial.

**Corolario.** Antes de restringir por columna, busca los `select *`: se expanden a todas las
columnas y la consulta falla entera.

---

## 6. Un vacío puede ser un error disfrazado

**El error.** Dos pantallas distintas — una de ellas la de mayor tráfico — decidían entre "no hay
nada" y "hay datos" mirando solo el resultado, sin mirar el error. Un fallo real de base de datos
se veía idéntico a un estado vacío legítimo.

**La regla.** Toda pantalla con estado vacío distingue tres casos: **cargando**, **vacío de
verdad** y **falló la consulta**. Nunca dos.

**Cómo detectarlo.** Grep por consultas que capturan el dato sin capturar el error, junto a un
componente de estado vacío. Es de los hallazgos más rentables de una auditoría.

---

## 7. El código no es lo único que promete cosas

**El error.** Una plantilla que se le entrega al usuario le recomendaba pegar un enlace de carpeta
compartida; el importador solo sabía descargar imágenes directas. El enlace fallaba siempre. Se
arregló el mensaje de error… y **seis días después reapareció el mismo hallazgo**, porque nadie
tocó la plantilla que originaba la promesa.

**La regla.** Al auditar un flujo, revisa también **qué le dices al usuario que puede hacer**:
plantillas, textos de ayuda, correos, comentarios en migraciones. Y cuando un fix solo mitiga el
síntoma, deja escrito explícitamente **qué fuente quedó sin tocar** — si no, el hallazgo vuelve
disfrazado de nuevo.

---

## 8. Una promesa en un comentario no es una funcionalidad

**El error.** Una migración creaba un permiso "para mostrar el progreso en el panel". Ninguna
pantalla lo leía. El usuario nunca vio esa información.

**La regla.** Cuando una migración o un comentario justifica algo por una UI, **verifica que esa
UI exista**. Si la tabla nueva solo aparece en escrituras y nunca en una lectura de interfaz, es
una promesa incumplida — y un excelente hallazgo.

---

## 9. Simetría: si existe la acción, busca su inversa

**El error.** Existía "publicar todos" en lote; pausar seguía siendo un clic por elemento. Nadie
lo notó hasta que un usuario tuvo una cartera grande.

**La regla.** Heurístico barato y muy rentable para auditar "gestión a escala": lista las acciones
en lote que ya existen y pregunta qué **transición inversa** quedó sin equivalente.

---

## 10. Un ambiente compartido no es un ensayo

**El error.** El ambiente de pruebas compartía base de datos y almacenamiento con producción. Un
cambio "seguro en staging" tocaba datos reales.

**La regla.** Si tu ambiente de pruebas comparte estado con producción, **no es un ensayo**: es
producción con otro nombre. O lo separas, o dejas escrito en letra grande qué operaciones NO
puedes ensayar ahí.

---

## 11. Las instrucciones no bastan: pon guardas mecánicas

**El error.** El proceso decía "trabaja siempre en la rama de integración". Igual se commiteó en
la rama principal, **dos veces**, y el trabajo del día quedó huérfano sin pasar por revisión.

**La regla.** Cuando un error de proceso se repite, deja de escribir instrucciones más enfáticas y
pon una **guarda mecánica** (un hook que bloquee, una validación que falle). Una regla que depende
de que alguien la recuerde a las 3 AM no es una regla: es un deseo.

---

## 12. Verifica el ambiente antes de creer en tu prueba

**El error.** Un servidor zombie de tres semanas antes seguía escuchando en el puerto. La prueba
de humo dio verde contra **el build viejo**.

**La regla.** Antes de una prueba local, verifica que el puerto esté libre y de qué fecha es el
proceso que responde. Un falso verde es peor que un rojo: te hace desplegar con confianza.

---

## 13. Un trabajo preparado y no ejecutado necesita quien lo rescate

**El error.** Un proceso preparaba trabajo para "hoy" y otro lo ejecutaba más tarde. La noche que
el segundo no corrió, ese trabajo quedó en un callejón sin salida: **ninguna corrida futura volvía
a mirarlo**, porque todas buscaban únicamente el archivo del día.

**La regla.** Si separas preparación y ejecución, la preparación debe **barrer lo pendiente de
días anteriores** antes de generar lo nuevo. Todo trabajo encolado necesita un mecanismo que lo
recupere, o la cola es una papelera con buena presentación.

---

## 14. La revisión adversarial salva más de lo que borra

**El error.** Un inventario automático de "código basura" propuso borrar 51 archivos. Entre ellos
estaba el archivo de permisos que permitía a las tareas programadas correr sin trabarse:
borrarlo habría roto todas las automatizaciones en silencio.

**La regla.** Para cualquier operación destructiva, la segunda capa no busca confirmar: busca
**salvar**. Su éxito se mide en cuántos candidatos rescata, y la duda siempre salva. (En ese caso:
39 de 51 sobrevivieron, y el repo estaba mucho más limpio de lo que el inventario sugería.)

---

## 15. Sé honesto cuando la deuda era falsa

**El error.** Se registró una deuda por "runs de CI atascados esperando aprobación" con un fix
propuesto sobre la configuración del repositorio. Al ir a verificar, la configuración estaba
correcta: los runs colgados eran un artefacto del incidente del proveedor y se destrabaron solos.

**La regla.** Cuando la evidencia contradice una deuda que registraste, **corrígela el mismo día**
y deja escrito el criterio para reabrirla. Un backlog con deudas falsas envenena las decisiones
futuras más que un backlog corto.

---

## 16. Un arreglo cierra un caso; sus hermanos siguen abiertos

**El error.** Siete lecciones distintas, registradas a lo largo de semanas, decían en el fondo lo
mismo: se arregló un bug y su gemelo —en la acción inversa, en la otra copia del mismo texto, en el
otro archivo que usaba el mismo patrón, en el camino de un solo elemento de algo que se arregló
«para todos»— siguió vivo hasta que alguien lo encontró por separado.

**La regla.** Antes de dar un hallazgo por único, búscale los hermanos. Antes de cerrar un arreglo,
búscale los gemelos. Y al buscar, cubre todas las carpetas donde puede vivir el código, no solo la
primera que se te ocurre.

**Cómo detectarlo.** Si el backlog tiene dos items con el mismo título y fechas distintas, alguien
arregló uno y no buscó el otro.

---

## 17. Un hallazgo es una hipótesis, no un hecho

**El error.** Dos hallazgos de rendimiento llegaron con todo el formato correcto: prioridad, tamaño,
`archivo:línea` y criterios de aceptación. Los dos estaban equivocados. El formato impecable los hacía
parecer verificados.

**La regla.** Antes de anotar un hallazgo —propio o de otro agente— abre el archivo citado y comprueba
la premisa. Descartar un hallazgo equivocado y dejar escrito por qué no aplicaba vale más que resolver
un problema inventado.

**Cómo detectarlo.** Pregunta de cada hallazgo: *¿alguien abrió el archivo, o solo se citó?*

---

## 18. La prosa con un número envejece en silencio

**El error.** Un documento citó durante días una cifra seis veces equivocada. Otro dejó escrito «que la
próxima corrida lo confirme» y nadie volvió a leerlo cuando llegó el dato. Una cifra escrita a mano no
tiene seguimiento: nadie la revisa cuando cambia la realidad.

**La regla.** Si un cambio instrumenta la métrica que responde una pregunta ya escrita en prosa, releer
y actualizar **ese** texto es parte del mismo trabajo, no de la próxima vez. Y al escribir, prefiere
reglas que no dependan de un número que va a cambiar.

---

## 19. Vigila el entregable, no el latido

**El error.** Una rutina latía todos los días, puntual, y llevaba días sin producir lo que prometía: el
archivo del día no existía, la publicación no salía. El latido decía «corrí»; nadie preguntaba «¿y qué
dejaste?».

**La regla.** Para cada rutina, define su entregable y vigílalo a él. Distingue tres fallas: **no
arrancó**, **arrancó y no terminó** (murió a la mitad, y desde afuera parece que corrió) y **terminó
sin producir nada**.

**Cómo detectarlo.** Si tu monitor solo tiene una columna «última ejecución», no distingue ninguna de
las tres.

---

## 20. Un no-op deliberado se ve idéntico a funcionar

**El error.** Una ventana de análisis de negocio venció. Desde entonces, cada corrida saltaba el paso
—correctamente, porque la ventana estaba cerrada— y terminaba en verde. Pasaron semanas sin análisis y
sin una sola alerta: el sistema hacía exactamente lo que debía, y eso era lo que lo hacía invisible.

**La regla.** Cuando una automatización decide no hacer nada, lo dice **en voz alta** y con el motivo.
Las ventanas con fecha de término avisan antes de vencer y avisan cuando vencieron.

---

## 21. Una alarma que suena siempre deja de oírse

**El error.** Tres casos de la misma forma. Un umbral de rebote medido sobre el acumulado histórico
habría disparado «pausar envíos» en todas las corridas, para siempre, por una tanda vieja que ya se
había limpiado. Un monitor de 14 horas para una rutina que pasó a correr una vez al día daba falsa
alarma diaria. Y pausar una rutina a propósito la hacía aparecer como caída en el monitor.

**La regla.** Mide los umbrales sobre una **ventana móvil**, no sobre el acumulado. Ajusta cada umbral a
la frecuencia real de lo que vigila. Y dale al monitor un estado **pausada**, distinto de caída.

**Cómo detectarlo.** Si hay una alerta que todo el equipo sabe ignorar, ya no tienes esa alerta — y
estás entrenando a todos a ignorar las demás.

---

## 22. No borrar le gana a borrar con cuidado

**El error.** Una tarea programada borraba conversaciones antiguas para «mantener la base limpia». Un
día se descubrió que el contador de conversaciones estaba en cero: el historial completo de las primeras
consultas reales del producto —las más valiosas para entenderlo— ya no existía.

**La regla.** Ante datos que alguna vez fueron de una persona, prefiere **bloquear o archivar** a borrar.
El borrado automático, si existe, necesita una razón legal o de costo escrita, y el borrado de verdad lo
hace un humano. Por eso el borrado de datos es una restricción dura por defecto en Phronesis.

---

## 23. «Saltar la bandeja» + «marcar como leído» hace desaparecer un correo

**El error.** Correos importantes llegaban y nunca aparecían. Al buscarlos, estaban archivados y leídos
desde el segundo en que entraron. Un filtro antiguo combinaba las dos acciones sobre un criterio
demasiado amplio.

**La regla.** Un filtro puede archivar **o** marcar como leído, nunca las dos cosas sobre algo que podría
ser importante. Archivar sin marcar deja rastro (no leído); las dos juntas lo borran de la vista.

**Cómo detectarlo.** Busca correos leídos que nadie abrió. Si existen, hay un filtro que los lee por ti.

---

## 24. Contar no es comparar

**El error.** Un chequeo verificaba que el repositorio y la base de datos tuvieran las mismas
migraciones contando ambos lados. Dio 99 y 99, verde. Había cuatro diferencias que se cancelaban: dos
archivos sin registro y dos registros sin archivo, estos últimos de otro proyecto que alguien había
creado en la misma base.

**La regla.** Compara **listas**, no cantidades. Un chequeo que puede dar verde teniendo diferencias de
los dos lados no comprueba la premisa: comprueba una coincidencia aritmética.

---

## 25. Un umbral escrito como meta no dispara nada

**El error.** Un agente estratega tenía escrito «rebote menor a 3 %» y «ver qué rubros responden». El
rebote llegó a más del doble, dos rubros acumularon decenas de contactos sin una respuesta, y el agente
dejó un hallazgo en dos meses. Lo que tenía eran aspiraciones; y lo poco que encontraba lo decía en un
resumen que se borraba al terminar la corrida.

**La regla.** Escribe los umbrales como **condiciones que disparan una acción**, no como metas. Y todo
hallazgo se escribe donde queda —el backlog—, no en el resumen de la corrida.

**Corolario.** Sin cuota de hallazgos: pedir «tres oportunidades por día» empuja a inventarlas.

---

## 26. Con pocos datos, mira casos, no porcentajes

**El error.** La tentación de reportar «50 % de conversión» con dos usuarios de cuatro. Es ruido con
forma de dato, y quema la credibilidad de todo lo demás que dice el informe.

**La regla.** Nada de porcentajes sobre cohortes de menos de 30. Con pocos usuarios, mira qué hizo cada
uno: informa más que cualquier promedio, y deja de ser posible cuando sean cientos. Y nunca cuentes como
tracción el contenido propio: los datos de prueba, lo sembrado, las cuentas del dueño.

---

## 27. El pre-flight caduca

**El error.** El chequeo previo al despliegue dijo «sin migraciones». Para cuando se compiló, otra
sesión había metido una. Salió barato de pura suerte.

**La regla.** Cuando hay automatizaciones escribiendo en paralelo, fija el commit exacto que vas a
desplegar y repite los chequeos críticos contra **ese** commit, justo antes. En el registro anota el
commit desplegado, no «la punta de la rama»: la punta se mueve.
