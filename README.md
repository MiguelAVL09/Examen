# Capacitación Cinépolis

Los colaboradores usan Cinépolis PRO para responder encuestas y evaluaciones. El panel de **Cinépolis Expertos** permite registrar tareas y dar seguimiento a los cursos de Learning Center.

## Abrir el panel

```sh
npm ci
npm run dev
```

Usa Node.js 22.13 o una versión compatible más reciente. Abre la URL que muestra Vite. Para entrar, inicia sesión con tu **ID de empleado** y tu contraseña, o elige **Crear cuenta** para registrarte con tu ID. Tras iniciar sesión, todas las cuentas llegan a encuestas y evaluaciones. Pulsa **Ver encuestas** y luego **Responder encuesta** en la que te corresponda.

El botón **Menú**, arriba a la derecha, muestra los espacios de tu cuenta. El rol **Cinepolito Experto** puede abrir **Panel de expertos**. Si recargas dentro del panel con una sesión activa, vuelve a abrirse la misma sección. El rol **Administrador** puede abrir **Administración** y **Modo kiosco**.

En **Menú → Administración → Usuarios & Accesos**, un administrador puede usar **Dar de alta usuario** para crear una cuenta con un **ID de empleado único**, un rol y una contraseña inicial. Desde la ficha de cada cuenta puede editar sus datos y rol, asignar el ID a cuentas anteriores que lo tengan pendiente, restablecer la contraseña, suspenderla o reactivarla. El registro por cuenta propia crea cuentas de colaborador.

En el panel de expertos, selecciona **Usar datos reales** para empezar a capturar los registros del equipo. Los cambios en la vista de ejemplo se restablecen al recargar.

## Registrar y consultar avances

1. En **Cursos**, agrega los cursos que vas a monitorear.
2. En **Cinepolitos**, registra a las personas y marca cada curso como pendiente, completado o sin asignar.
3. En **Tareas**, registra actividades con responsable, fecha límite y prioridad. Puedes completarlas y reabrirlas desde la lista.
4. En **Reportes**, descarga un PDF con todos los cinepolitos, quienes tienen cursos pendientes, quienes están al corriente, quienes no tienen cursos asignados o las tareas pendientes. Los reportes de capacitación admiten filtros por área y curso.

Para un registro en lote, entra a **Cinepolitos → Importar PDF**. Usa un PDF con texto seleccionable, un ID por renglón o una tabla con la columna **ID de empleado**. Puedes incluir columnas **Nombre** y **Área**. Revisa la vista previa y confirma los registros seleccionados. Los IDs existentes se omiten y los datos faltantes se pueden completar en el directorio. La importación agrega registros de seguimiento. Las cuentas de inicio de sesión se crean desde **Usuarios & Accesos**.

Las cuentas, los roles y los registros de seguimiento se guardan en el navegador. Usa el mismo perfil del navegador y la misma URL para acceder a esos datos. Los cuestionarios conservan su configuración de almacenamiento y la captura de Learning Center es manual.

## Verificar la compilación

```sh
npm run build
```
