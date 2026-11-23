# Acreditaciones por área

El espacio de Cinepolito Experto incluye una vista de acreditaciones por persona y por área. Los estados se guardan en `employee_training_workspace.workspace.accreditations`, con los mismos permisos y control de revisiones del espacio compartido. No requiere cambios de tablas ni permisos.

- Verde: acreditado; cuenta como completado.
- Amarillo: pendiente; se requiere completar la acreditación.
- Gris: no aplica; la persona no pertenece al área y no se incluye en el porcentaje.
- Sin registro: no hay un estado cargado. Los rojos y las celdas en blanco de las imágenes se omiten y no generan pendientes.

El porcentaje es acreditados dividido entre acreditados más pendientes. Las acreditaciones se mantienen independientes de los cursos y las encuestas de Kahoot.

Áreas habilitadas por indicación del responsable: DUL. (Dulcería), L.O. (Limpieza operativa), CDS. (Control de salas), SPY. (Espiral), CRE. (Crepas CT), BAG. (Baggie CT), BEB. (Bebidas CT) y LP. (Limpieza profunda). Las abreviaturas restantes se agregarán cuando el responsable confirme su significado. La lista de acreditaciones de una persona incluye tanto las completadas como las pendientes; el color de cada celda determina su estado.

Los registros se vinculan al identificador estable de la cuenta, para conservarlos cuando cambien el nombre o el número de empleado. Al editar una persona solo se actualizan las áreas modificadas; las demás áreas y el avance de cursos se conservan.

Las listas y los datos personales de las imágenes no se incluyen en los archivos públicos de la aplicación. La carga inicial se realiza en el espacio compartido, comprobando cada número de empleado y omitiendo las filas repetidas entre imágenes.

Verificación de reglas: `node scripts/check-accreditations.mjs`. Comprobación completa: `npm run build` y revisión visual en escritorio y móvil.
