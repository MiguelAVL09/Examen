# Capacitación Cinépolis

Los colaboradores usan Cinépolis PRO para responder encuestas y evaluaciones. El panel de **Cinépolis Expertos** permite registrar tareas y dar seguimiento a los cursos de Learning Center.

## Abrir el panel

```sh
npm ci
npm run dev
```

Usa Node.js 22.13 o una versión compatible más reciente. Abre la URL que muestra Vite. Para entrar, inicia sesión con tu **ID de empleado** y tu contraseña. Cuando Supabase está configurado, las mismas credenciales funcionan desde distintos navegadores y dispositivos. Pide a Administración que cree tu cuenta o restablezca tu contraseña. Después de entrar, pulsa **Ver encuestas** y **Responder encuesta** en la actividad que te corresponda.

El botón **Menú**, arriba a la derecha, muestra los espacios de tu cuenta. El rol **Cinepolito Experto** puede abrir **Panel de expertos**. Si recargas dentro del panel con una sesión activa, vuelve a abrirse la misma sección. El rol **Administrador** puede abrir **Administración** y **Modo kiosco**.

En **Menú → Administración → Usuarios & Accesos**, un administrador puede usar **Dar de alta usuario** para crear una cuenta con un **ID de empleado único**, un rol y una contraseña inicial. Desde la ficha de cada cuenta puede editar sus datos y rol, restablecer la contraseña, suspenderla o reactivarla. Cada persona puede cambiar su contraseña desde **Menú → Mi perfil → Mis Datos**.

Kahoot y Expertos comparten el directorio por ID de empleado. Los usuarios con cuenta aparecen en **Cinepolitos**. Los registros agregados desde Expertos aparecen en **Usuarios & Accesos** en el navegador donde se guardaron, donde puedes darles de alta una cuenta. Si ya existe un registro con el mismo ID, se conserva su avance.

## Migrar cuentas creadas en un navegador

1. Abre la misma dirección de la aplicación en el navegador y perfil donde diste de alta las cuentas. Entra con tu cuenta central de administrador.
2. Ve a **Administración → Usuarios & Accesos → Migrar cuentas de este navegador**. Selecciona los registros que quieras trasladar. Revisa los IDs duplicados o incompletos y los roles de administrador antes de continuar.
3. Pulsa **Migrar cuentas seleccionadas** y descarga las contraseñas iniciales. Cada persona debe recibir la de su cuenta y puede cambiarla desde **Mi perfil**.

La migración conserva el ID de empleado, el rol, el estado de la cuenta y el avance de encuestas registrado en ese navegador. Las cuentas ya existentes se conservan. Repite el procedimiento en cada navegador que tenga altas locales distintas.

## Registrar y consultar avances

1. En **Cursos**, agrega los cursos de Learning Center que vas a monitorear. Las encuestas de Kahoot aparecen automáticamente en el catálogo.
   Con el rol **Cinepolito Experto**, pulsa **Crear encuesta** para escribir las preguntas y publicar una encuesta de Kahoot desde la web o Android.
2. En **Cinepolitos**, registra el avance de Learning Center. El avance de cada encuesta se actualiza cuando el cinepolito envía sus respuestas con su sesión iniciada. En las encuestas anónimas se registra el estado de cumplimiento por separado de las respuestas.
3. En **Tareas**, registra actividades con responsable, fecha límite y prioridad. Puedes completarlas y reabrirlas desde la lista.
4. En **Reportes**, descarga un PDF con todos los cinepolitos, quienes tienen cursos pendientes, quienes están al corriente, quienes no tienen cursos asignados o las tareas pendientes. Los reportes de capacitación admiten filtros por área y curso.

Para un registro en lote, entra a **Cinepolitos → Importar PDF**. Usa un PDF con texto seleccionable, un ID por renglón o una tabla con la columna **ID de empleado**. Puedes incluir columnas **Nombre** y **Área**. Revisa la vista previa y confirma los registros seleccionados. Los IDs existentes se omiten y los datos faltantes se pueden completar en el directorio. La importación agrega registros de seguimiento. Las cuentas de inicio de sesión se crean desde **Usuarios & Accesos**.

Con Supabase configurado, la web y la app de Android comparten el directorio, el avance de las encuestas, los cursos y las tareas. Para incorporar registros de Expertos creados antes de la sincronización, abre **Panel de expertos → Trasladar registros de este dispositivo** en el navegador original. También puedes hacerlo desde **Administración → Usuarios & Accesos → Migrar cuentas de este navegador**. Sin Supabase, la aplicación funciona en modo local.

## App de Android

La app usa la misma cuenta que la web. Los enlaces de invitación y de resultados abren la app en Android si está instalada y habilitada para esos enlaces. En los demás dispositivos abren la web.

Para compilar en Windows, usa JDK 21, Android SDK Platform 36 y Build-Tools 36.0.0. Ejecuta `pwsh -File scripts/build-android.ps1` con `JAVA_HOME` y `ANDROID_HOME` configurados. El APK firmado se guarda en `dist-android`. Para actualizar instalaciones existentes y conservar la apertura de enlaces, firma con el mismo almacén de claves.

## Verificar la compilación

```sh
npm run build
```
