// ==========================================
// 1. CONFIGURACIÓN DE FIREBASE
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  query, 
  orderBy 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- TU CONFIGURACIÓN (NO LA BORRES) ---
const firebaseConfig = {
  apiKey: "AIzaSyBP-69PjxX9edB0OpBHRieBGF5f5bMPVe8",
  authDomain: "examen-seguridad-legal.firebaseapp.com",
  projectId: "examen-seguridad-legal",
  storageBucket: "examen-seguridad-legal.firebasestorage.app",
  messagingSenderId: "303945589350",
  appId: "1:303945589350:web:1bd50af3d73ad5981803a7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==========================================
// 2. DETECTOR DE TRAMPAS (Anti-Cheat)
// ==========================================
let cambiosDeVentana = 0;

// Detectar cuando el usuario cambia de pestaña o minimiza
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    // Si estamos en medio del examen (sección visible), contamos la trampa
    if(!dom.examSection.classList.contains('hidden')){
        cambiosDeVentana++;
        console.log(`Alerta de foco: ${cambiosDeVentana}`);
    }
  }
});

// ==========================================
// 3. DATOS DEL EXAMEN
// ==========================================
// ==========================================
// 3. DATOS DEL EXAMEN (Basado en la Presentación)
// ==========================================
const preguntas = [
  { 
    p: "¿Cuál es el objetivo principal de la Seguridad Legal en TI?", 
    o: ["Instalar antivirus en todos los equipos", "Garantizar el cumplimiento de leyes y proteger la información", "Crear manuales técnicos para ingenieros"], 
    c: 1 
    // Fuente: Diapositiva 2 - "Garantizan que una organización cumpla con la legislación..." [cite: 20]
  },
  { 
    p: "¿Qué ley federal obliga a los particulares (empresas) a proteger los datos personales?", 
    o: ["Ley Federal del Trabajo", "LFPDPPP", "Código Civil"], 
    c: 1 
    // Fuente: Diapositiva 4 - "Ley Federal de Protección de Datos Personales en Posesión de los Particulares" [cite: 42]
  },
  { 
    p: "Según el Código Penal Federal, ¿qué agrava la pena por acceso ilícito a sistemas?", 
    o: ["Que se haga de noche", "Que se roben mucho dinero", "Que el delito lo cometa el administrador o encargado de seguridad"], 
    c: 2 
    // Fuente: Diapositiva 24 del PDF 2 - "Si el delito lo comete el encargado... la pena aumenta" 
  },
  { 
    p: "¿Qué derechos regula la LFPDPPP para el titular de los datos?", 
    o: ["Derechos ARCO (Acceso, Rectificación, Cancelación, Oposición)", "Derechos HUMANOS", "Derechos de Autor"], 
    c: 0 
    // Fuente: Diapositiva 4 - "Regula el ejercicio de los derechos ARCO" [cite: 49]
  },
  { 
    p: "Legalmente, ¿para qué sirven las políticas internas ante un incidente de seguridad?", 
    o: ["Para nada, son solo papel", "Para demostrar 'Debida Diligencia'", "Para cobrar más al cliente"], 
    c: 1 
    // Fuente: Diapositiva 13 - "Su función legal es demostrar la Debida Diligencia" [cite: 192]
  },
  { 
    p: "¿Qué institución sanciona el uso de software pirata (propiedad intelectual) en México?", 
    o: ["IMPI (Instituto Mexicano de la Propiedad Industrial)", "SAT", "Secretaría de Salud"], 
    c: 0 
    // Fuente: Diapositiva 25 del PDF 2 - "El IMPI puede imponer multas enormes" 
  },
  { 
    p: "¿Cuál es la diferencia entre una Política de Seguridad y un Código de Conducta?", 
    o: ["No hay diferencia", "La política es técnica (regla dura) y el código es ético (comportamiento)", "El código es opcional y la política no"], 
    c: 1 
    // Fuente: Diapositiva 5 del PDF 2 - Comparativa Política Técnica vs Conducta Humana [cite: 446-449]
  },
  { 
    p: "¿Qué regula la NOM-151-SCFI-2016?", 
    o: ["La seguridad en los hospitales", "La conservación de mensajes de datos y firmas electrónicas", "El uso de extintores en site"], 
    c: 1 
    // Fuente: Diapositiva 10 - "Regula la conservación de mensajes de datos..." [cite: 145]
  },
  { 
    p: "¿Qué es un 'Gap Analysis' en una auditoría de cumplimiento?", 
    o: ["Comparar las políticas internas vs. la legislación vigente", "Revisar si hay virus en la red", "Analizar el presupuesto anual"], 
    c: 0 
    // Fuente: Diapositiva 12 del PDF 2 - "Auditoría de Políticas vs. Ley (Gap Analysis)" [cite: 555]
  },
  { 
    p: "¿Qué institución impone las multas por incumplir la protección de datos (LFPDPPP)?", 
    o: ["La Policía Federal", "El INAI", "La PROFECO"], 
    c: 1 
    // Fuente: Diapositiva 23 del PDF 2 - "¿Quién multa?: El INAI" 
  },
  { 
    p: "¿Qué significa la 'Cancelación' dentro de los derechos ARCO?", 
    o: ["Borrar el dato inmediatamente sin rastro", "Un 'borrado seguro' tras un periodo de bloqueo legal", "Cancelar la suscripción al servicio"], 
    c: 1 
    // Fuente: Diapositiva 22 del PDF 2 - "Exige un protocolo de borrado seguro... tras periodo de bloqueo" [cite: 682]
  },
  { 
    p: "En gestión de riesgos legales, ¿cuál es una prioridad inmediata?", 
    o: ["Brechas de mejores prácticas", "Impacto Legal Alto (Riesgo de Multa o Sanción)", "Actualizar el color del logo"], 
    c: 1 
    // Fuente: Diapositiva 16 del PDF 2 - "Prioridad inmediata: Impacto Legal Alto" [cite: 606]
  },
  { 
    p: "¿Qué estándar internacional sirve de referencia para gestionar la seguridad (SGSI)?", 
    o: ["ISO 9001", "ISO 27001", "NOM-035"], 
    c: 1 
    // Fuente: Diapositiva 11 - "ISO/IEC 27001 Estándar internacional..." [cite: 160]
  },
  { 
    p: "Según la Ley Federal del Trabajo, el patrón puede sancionar al empleado por:", 
    o: ["Llegar despeinado", "Divulgar secretos industriales o información confidencial", "Usar su propio celular en el descanso"], 
    c: 1 
    // Fuente: Diapositiva 8 - "Sancionar empleados que divulguen secretos industriales" [cite: 116]
  },
  { 
    p: "¿Qué es la 'Integridad' en el Código de Conducta Digital?", 
    o: ["No usar habilidades técnicas o accesos para beneficio personal/dañar", "Que los datos no se borren", "Tener respaldos completos"], 
    c: 0 
    // Fuente: Diapositiva 4 del PDF 2 - "No utilizar habilidades técnicas... para beneficio personal" [cite: 438]
  }
];

// ==========================================
// 4. LÓGICA DE LA INTERFAZ
// ==========================================
const dom = {
  loginSection: document.getElementById("login"),
  examSection: document.getElementById("exam"),
  resultSection: document.getElementById("resultado"),
  adminSection: document.getElementById("adminDashboard"),
  
  loginError: document.getElementById("loginError"),
  nombreInput: document.getElementById("nombre"),
  controlInput: document.getElementById("control"),
  
  examForm: document.getElementById("examForm"),
  btnLogin: document.getElementById("btnLogin"),
  btnEnviar: document.getElementById("btnEnviar"),
  btnPDF: document.getElementById("btnDescargarPDF"),
  
  scoreDisplay: document.getElementById("scoreDisplay"),
  scoreMessage: document.getElementById("scoreMessage"),
  userGreeting: document.getElementById("userGreeting"),
  resultsTableBody: document.querySelector("#resultsTable tbody")
};

document.addEventListener('DOMContentLoaded', () => {
  dom.btnLogin.addEventListener('click', iniciarSesion);
  dom.btnEnviar.addEventListener('click', enviarExamen);
  dom.btnPDF.addEventListener('click', descargarPDF);
});

// --- LOGIN ---
async function iniciarSesion() {
  const control = dom.controlInput.value.trim();
  const nombre = dom.nombreInput.value.trim();

  if (!nombre) return mostrarError("Ingresa tu nombre completo.");
  if (!/^\d{8}$/.test(control)) return mostrarError("El número de control debe ser de 8 dígitos.");

  // MODO ADMINISTRADOR (Backdoor simple)
  if (control === "21070413") {
    cargarPanelAdmin();
    return;
  }

  dom.btnLogin.innerText = "Verificando...";
  dom.btnLogin.disabled = true;

  try {
    const docRef = doc(db, "resultados_examen", control);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      mostrarError(`Ya presentaste el examen anteriormente.`);
      dom.btnLogin.innerText = "Ingresar";
      dom.btnLogin.disabled = false;
      return;
    }

    // Inicio exitoso para alumno
    cambiosDeVentana = 0;
    dom.loginError.innerText = "";
    dom.loginSection.classList.add("hidden");
    dom.examSection.classList.remove("hidden");
    dom.examSection.classList.add("fade-in");
    
    // Poner navegador en pantalla completa (opcional, buena práctica)
    try {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        }
    } catch(e) { console.log("Pantalla completa no permitida por el navegador"); }

    cargarPreguntas();

  } catch (error) {
    console.error(error);
    mostrarError("Error de conexión. Intenta de nuevo.");
    dom.btnLogin.innerText = "Ingresar";
    dom.btnLogin.disabled = false;
  }
}

function mostrarError(msg) { dom.loginError.innerText = msg; }

// --- EXAMEN ---
function cargarPreguntas() {
  dom.examForm.innerHTML = "";
  preguntas.forEach((q, i) => {
    const div = document.createElement("div");
    div.className = "question-block";
    div.innerHTML = `<span class="question-title">${i+1}. ${q.p}</span>`;
    q.o.forEach((op, j) => {
      div.innerHTML += `<label class="option-label"><input type="radio" name="p${i}" value="${j}"> ${op}</label>`;
    });
    dom.examForm.appendChild(div);
  });
}

async function enviarExamen() {
  let aciertos = 0;
  let respondidas = 0;
  
  preguntas.forEach((q, i) => {
    const r = document.querySelector(`input[name='p${i}']:checked`);
    if (r) {
      respondidas++;
      if (parseInt(r.value) === q.c) aciertos++;
    }
  });

  if (respondidas < preguntas.length) {
    alert("Por favor responde todas las preguntas antes de enviar.");
    return;
  }

  const control = dom.controlInput.value.trim();
  const nombre = dom.nombreInput.value.trim();
  const calif = (aciertos / preguntas.length) * 100;

  dom.btnEnviar.innerText = "Enviando resultados...";
  dom.btnEnviar.disabled = true;

  try {
    await setDoc(doc(db, "resultados_examen", control), {
      nombre: nombre,
      control: control,
      aciertos: aciertos,
      total: preguntas.length,
      calificacion: parseFloat(calif.toFixed(2)), // Guardar como número
      fecha: new Date().toISOString(), // Formato estandar para ordenar
      fechaString: new Date().toLocaleString(), // Formato legible
      trampas: cambiosDeVentana
    });

    // Salir de pantalla completa si estaba activa
    if (document.exitFullscreen) document.exitFullscreen().catch(() => {});

    dom.examSection.classList.add("hidden");
    dom.resultSection.classList.remove("hidden");
    dom.resultSection.classList.add("fade-in");
    
    dom.userGreeting.innerText = `Alumno: ${nombre}`;
    dom.scoreDisplay.innerText = `${aciertos}/${preguntas.length}`;
    
    let mensajeFinal = "Examen registrado correctamente.";
    if(cambiosDeVentana > 0) mensajeFinal += " (Se detectaron salidas de pantalla)";
    dom.scoreMessage.innerText = mensajeFinal;

  } catch (e) {
    console.error(e);
    alert("Error al guardar los resultados. Revisa tu conexión.");
    dom.btnEnviar.disabled = false;
    dom.btnEnviar.innerText = "Reintentar Envío";
  }
}

// ==========================================
// 5. LÓGICA DE ADMINISTRADOR
// ==========================================

async function cargarPanelAdmin() {
  dom.loginSection.classList.add("hidden");
  dom.adminSection.classList.remove("hidden");
  dom.adminSection.classList.add("fade-in");

  dom.resultsTableBody.innerHTML = "<tr><td colspan='5'>Cargando datos...</td></tr>";

  try {
    // Obtener todos los documentos ordenados por fecha (más reciente primero)
    // Nota: Firebase requiere índice para ordenar. Si falla, quitar el orderBy temporalmente.
    const q = query(collection(db, "resultados_examen"), orderBy("fecha", "desc"));
    const querySnapshot = await getDocs(q);

    dom.resultsTableBody.innerHTML = ""; // Limpiar tabla

    if (querySnapshot.empty) {
      dom.resultsTableBody.innerHTML = "<tr><td colspan='5'>No hay exámenes registrados.</td></tr>";
      return;
    }

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const tr = document.createElement("tr");
      
      // Estilo para integridad (Trampas)
      let integridadBadge = `<span class="badge badge-clean">Limpio</span>`;
      if (data.trampas > 0) {
        integridadBadge = `<span class="badge badge-cheat">⚠️ ${data.trampas} alertas</span>`;
      }

      tr.innerHTML = `
        <td>${data.control}</td>
        <td>${data.nombre}</td>
        <td><strong>${data.calificacion}</strong></td>
        <td>${data.aciertos}/${data.total}</td>
        <td>${integridadBadge}</td>
      `;
      dom.resultsTableBody.appendChild(tr);
    });

  } catch (error) {
    console.error("Error admin:", error);
    // Fallback por si falta el índice de ordenamiento en Firebase
    if(error.code === 'failed-precondition'){
        alert("Falta crear el índice en Firebase. Revisa la consola.");
    }
    dom.resultsTableBody.innerHTML = "<tr><td colspan='5' style='color:red'>Error cargando datos. Ver consola.</td></tr>";
  }
}

// Función para descargar PDF usando jsPDF y AutoTable
function descargarPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.text("Reporte de Resultados - Seguridad Legal TI", 14, 20);
  doc.setFontSize(10);
  doc.text(`Fecha de reporte: ${new Date().toLocaleString()}`, 14, 28);

  doc.autoTable({
    html: '#resultsTable',
    startY: 35,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42] }, // Azul oscuro del tema
    styles: { fontSize: 8 },
  });

  doc.save('Resultados_Examen.pdf');
}