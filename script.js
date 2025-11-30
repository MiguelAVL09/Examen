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
const preguntas = [
  { p: "¿Qué es la seguridad legal en TI?", o: ["Instalación de cámaras", "Cumplimiento de leyes y políticas", "Diseño de red"], c: 1 },
  { p: "¿Cuál es la ley principal de datos personales en México?", o: ["LFT", "LFPDPPP", "NOM-035"], c: 1 },
  { p: "Delito al acceder sin permiso a sistemas (Código Penal):", o: ["Acceso ilícito a sistemas", "Abuso de confianza", "Daño en propiedad"], c: 0 },
  { p: "¿Qué documento protege la confidencialidad?", o: ["Contrato de renta", "NDA (Acuerdo de Confidencialidad)", "Manual de bienvenida"], c: 1 },
  { p: "¿Qué es una Política de Uso Aceptable (AUP)?", o: ["Reglas de uso", "Un antivirus", "Lista de precios"], c: 0 },
  { p: "¿Dónde se definen las consecuencias de violar normas?", o: ["Política de Sanciones", "Inventario", "Diagrama de Red"], c: 0 },
  { p: "En riesgos legales, ¿qué es 'debida diligencia'?", o: ["Ignorar riesgos", "Medidas razonables para prevenir daños", "Contratar hackers"], c: 1 },
  { p: "Consecuencia legal de usar software pirata:", o: ["Multas por Propiedad Intelectual", "Lentitud de PC", "Ninguna"], c: 0 },
  { p: "¿Qué es una brecha de cumplimiento?", o: ["Corte de luz", "Diferencia entre ley y práctica", "Virus"], c: 1 },
  { p: "Objetivo de una auditoría legal TI:", o: ["Despedir gente", "Verificar cumplimiento", "Mejorar internet"], c: 1 },
  { p: "¿Quién es el responsable legal de la seguridad?", o: ["Proveedor", "Becario", "Organización y representantes"], c: 2 },
  { p: "Sanciones por incumplir LFPDPPP:", o: ["Amonestación", "Multas y prisión", "Bloqueo de red"], c: 1 }
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