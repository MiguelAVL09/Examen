# 🎮 Kahoot! Pro Quiz - Plataforma Interactiva de Cuestionarios

Una plataforma web moderna, interactiva y profesional inspirada en **Kahoot!**, desarrollada con **React 19**, **TypeScript**, **Tailwind CSS**, **Framer Motion**, **Web Audio API** y preparada para conectarse con **Supabase** como base de datos en la nube y desplegarse en **GitHub**.

---

## ✨ Características Principales

- **🎨 Estética y Personalidad Idéntica a Kahoot!**:
  - Los 4 botones icónicos con sus formas geométricas características:
    - 🔴 **Triángulo Rojo (▲)**
    - 🔷 **Diamante Azul (◆)**
    - 🟡 **Círculo Amarillo (●)**
    - 🟩 **Cuadrado Verde (■)**
  - Efectos 3D táctiles al pulsar botones, fondo dinámico y tipografía *Montserrat*.

- **⏱ Cronómetro Estilo Kahoot con Tensión Progresiva**:
  - Indicador circular animado que cambia de color dinámicamente (**Verde** ➔ **Amarillo** ➔ **Rojo pulsante**).
  - Efectos de sonido analógicos sintetizados (*ticking* que se acelera y sube de tono cuando quedan menos de 5 segundos).

- **🏆 Sistema de Ranking Privado para Administradores**:
  - **Cumplimiento estricto del requerimiento**: Los participantes solo ven su puntaje, aciertos, precisión y racha individual al terminar.
  - La tabla de ranking general, analíticas globales y exportación de notas están protegidas en el **Panel de Admin** (PIN por defecto: `admin123`).
  - Exportación de rankings a **CSV / Excel** con un solo clic.

- **🔥 Multiplicadores de Velocidad y Rachas**:
  - Fórmula oficial de puntaje por velocidad (entre más rápido respondas, más puntos obtienes).
  - Bonificaciones por racha consecutiva con animación de fuego 🔥.

- **➕ Soporte Completo para Nuevos Cuestionarios**:
  - Creador y editor visual de cuestionarios integrado.
  - Configuración de tiempo por pregunta (10s, 15s, 20s, 30s, 60s), puntos dobles (2x) o normales (1x).
  - Compatible con preguntas de Selección Múltiple (4 opciones) o Verdadero / Falso (2 opciones).

- **🔊 Motor de Audio Nativo (Web Audio API)**:
  - Generación de sonidos sin dependencias de archivos externos: tic-tac de tensión, campanada de acierto, timbre de error, alarma de tiempo agotado y fanfarria de podio.
  - Botón de silencio/activación en la barra superior.

- **☁️ Preparado para Supabase & GitHub**:
  - Incluye script SQL completo (`supabase/schema.sql`) para tablas, índices, políticas RLS y Realtime.
  - Modo híbrido: Funciona inmediatamente en modo local/demo (LocalStorage) y se conecta automáticamente a Supabase en cuanto añades tus credenciales en `.env`.

---

## 🚀 Inicio Rápido (Local)

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Iniciar servidor de desarrollo:**
   ```bash
   npm run dev
   ```
   Abre [http://localhost:5173](http://localhost:5173) en tu navegador.

3. **Construir para producción:**
   ```bash
   npm run build
   ```

---

## 🔐 Acceso al Panel de Administrador

- Haz clic en el botón superior **ADMIN & RANKINGS**.
- **PIN por defecto**: `admin123`
- Desde allí podrás ver las posiciones de todos los participantes, crear nuevos exámenes y sincronizar con Supabase.

---

## 🗄️ Conexión con Supabase

1. Crea un proyecto en [Supabase.com](https://supabase.com).
2. Ve al **SQL Editor** en tu panel de Supabase y pega todo el contenido de [`supabase/schema.sql`](./supabase/schema.sql).
3. Haz clic en **Run** para crear las tablas (`quizzes`, `questions`, `question_options`, `participants`, etc.).
4. Copia tu URL y anon key de Supabase en tu archivo `.env`:
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-clave-anonima-publica
   ```
5. En el Panel de Admin, haz clic en **Base de Datos** ➔ **Sincronizar Cuestionarios** para subir los cuestionarios iniciales a tu nube.

---

## 🐙 Pasos para Subirlo a GitHub

Para publicar tu código en tu repositorio de GitHub:

```bash
git init
git add .
git commit -m "feat: Kahoot Clone Quiz Platform con React, Supabase y Rankings"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/TU-REPOSITORIO.git
git push -u origin main
```

Para alojarlo gratis en la web (Vercel o Netlify):
- Conecta tu repositorio de GitHub en **Vercel** o **Netlify**.
- Agrega las variables de entorno `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en la sección *Environment Variables*.
- ¡Tu web quedará accesible desde cualquier dispositivo o celular del mundo!
