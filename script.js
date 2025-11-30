// ==========================================
// 1. CONFIGURACIÓN DE FIREBASE
// ==========================================
// Importamos las funciones necesarias desde los servidores de Google
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- AQUÍ PEGA TU CONFIGURACIÓN DE FIREBASE (Del Paso 1) ---
const firebaseConfig = {
  apiKey: "AIzaSyBP-69PjxX9edB0OpBHRieBGF5f5bMPVe8",
  authDomain: "examen-seguridad-legal.firebaseapp.com",
  projectId: "examen-seguridad-legal",
  storageBucket: "examen-seguridad-legal.firebasestorage.app",
  messagingSenderId: "303945589350",
  appId: "1:303945589350:web:1bd50af3d73ad5981803a7"
};
// -----------------------------------------------------------

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


// ==========================================
// 2. DATOS DEL EXAMEN (Tus preguntas)
// ==========================================
const preguntas = [
  { p: "¿Qué es la seguridad legal en TI?", o: ["Instalación de cámaras", "Cumplimiento de leyes y políticas", "Diseño de red"], c: 1 },
  { p: "¿Cuál es la ley principal de datos personales en México?", o: ["LFT", "LFPDPPP", "NOM-035"], c: 1 },
  { p: "Delito al acceder sin permiso a sistemas (Código Penal):", o: ["Acceso ilícito a sistemas", "Abuso de confianza", "Daño en propiedad"], c: 0 },
  { p: "¿Qué documento protege la confidencialidad?", o: ["Contrato de renta", "NDA (Acuerdo de Confidencialidad)", "Manual de bienvenida"], c: 1 },
  { p: "¿Qué es una Política de Uso Aceptable (AUP)?", o: ["Reglas de uso de recursos informáticos", "Un antivirus", "Lista de precios"], c: 0 },
  { p: "¿Dónde se definen las consecuencias de violar normas?", o: ["Política de Sanciones", "Inventario", "Diagrama de Red"], c: 0 },
  { p: "En riesgos legales, ¿qué es 'debida diligencia'?", o: ["Ignorar riesgos", "Medidas razonables para prevenir daños", "Contratar hackers"], c: 1 },
  { p: "Consecuencia legal de usar software pirata:", o: ["Multas por Propiedad Intelectual", "Lentitud de PC", "Ninguna"], c: 0 },
  { p: "¿Qué es una brecha de cumplimiento?", o: ["Corte de luz", "Diferencia entre ley y práctica real", "Virus"], c: 1 },
  { p: "Objetivo de una auditoría legal TI:", o: ["Despedir gente", "Verificar cumplimiento normativo", "Mejorar internet"], c: 1 },
  { p: "¿Quién es el responsable legal de la seguridad?", o: ["Proveedor de internet", "Becario", "La organización y representantes"], c: 2 },
  { p: "Sanciones por incumplir LFPDPPP:", o: ["Amonestación verbal", "Multas millonarias y prisión", "Bloqueo de Facebook"], c: 1 }
];

// ==========================================
// 3. LÓGICA DE LA APLICACIÓN
// ==========================================

const dom = {
  loginSection: document.getElementById("login"),
  examSection: document.getElementById("exam"),
  resultSection: document.getElementById("resultado"),
  loginError: document.getElementById("loginError"),
  nombreInput: document.getElementById("nombre"),
  controlInput: document.getElementById("control"),
  examForm: document.getElementById("examForm"),
  btnLogin: document.getElementById("btnLogin"),
  btnEnviar: document.getElementById("btnEnviar"),
  scoreDisplay: document.getElementById("scoreDisplay"),
  scoreMessage: document.getElementById("scoreMessage"),
  userGreeting: document.getElementById("userGreeting")
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  dom.btnLogin.addEventListener('click', iniciarSesion);
  dom.btnEnviar.addEventListener('click', enviarExamen);
});

// Función ASÍNCRONA para verificar en la nube
async function iniciarSesion() {
  const nombre = dom.nombreInput.value.trim();
  const control = dom.controlInput.value.trim();

  // Validaciones locales
  if (!nombre) return mostrarError("Ingresa tu nombre completo.");
  if (!/^\d{8}$/.test(control)) return mostrarError("El número de control debe ser de 8 dígitos.");

  // Feedback visual de "Cargando..."
  const btnTextoOriginal = dom.btnLogin.innerText;
  dom.btnLogin.innerText = "Verificando en la nube...";
  dom.btnLogin.disabled = true;

  try {
    // 1. Consultar a Firebase si existe el documento con ID = numero de control
    const docRef = doc(db, "resultados_examen", control);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      // Si existe, ya presentó el examen
      const datos = docSnap.data();
      mostrarError(`El usuario ${control} ya presentó el examen el ${datos.fecha}.`);
      dom.btnLogin.innerText = btnTextoOriginal;
      dom.btnLogin.disabled = false;
      return;
    }

    // 2. Si no existe, permitir acceso
    dom.loginError.innerText = "";
    dom.loginSection.classList.add("hidden");
    dom.examSection.classList.remove("hidden");
    dom.examSection.classList.add("fade-in");
    
    cargarPreguntas();

  } catch (error) {
    console.error("Error conectando a Firebase:", error);
    mostrarError("Error de conexión. Intenta de nuevo.");
    dom.btnLogin.innerText = btnTextoOriginal;
    dom.btnLogin.disabled = false;
  }
}

function mostrarError(mensaje) {
  dom.loginError.innerText = mensaje;
}

function cargarPreguntas() {
  dom.examForm.innerHTML = "";
  preguntas.forEach((q, index) => {
    const questionBlock = document.createElement("div");
    questionBlock.className = "question-block";
    
    const title = document.createElement("span");
    title.className = "question-title";
    title.innerText = `${index + 1}. ${q.p}`;
    questionBlock.appendChild(title);

    q.o.forEach((opcion, opIndex) => {
      const label = document.createElement("label");
      label.className = "option-label";
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = `p${index}`;
      radio.value = opIndex;
      label.appendChild(radio);
      label.appendChild(document.createTextNode(opcion));
      questionBlock.appendChild(label);
    });
    dom.examForm.appendChild(questionBlock);
  });
}

// Función ASÍNCRONA para guardar en la nube
async function enviarExamen() {
  let aciertos = 0;
  let respondidas = 0;

  preguntas.forEach((q, i) => {
    const seleccion = document.querySelector(`input[name='p${i}']:checked`);
    if (seleccion) {
      respondidas++;
      if (parseInt(seleccion.value) === q.c) aciertos++;
    }
  });

  if (respondidas < preguntas.length) {
    alert("Por favor responde todas las preguntas.");
    return;
  }

  const control = dom.controlInput.value.trim();
  const nombre = dom.nombreInput.value.trim();
  const calificacion = (aciertos / preguntas.length) * 100;

  // Feedback visual "Guardando..."
  dom.btnEnviar.innerText = "Guardando resultados...";
  dom.btnEnviar.disabled = true;

  try {
    // GUARDAR EN FIREBASE
    // Creamos un documento en la colección "resultados_examen" con el ID del control
    await setDoc(doc(db, "resultados_examen", control), {
      nombre: nombre,
      control: control,
      aciertos: aciertos,
      total: preguntas.length,
      calificacion: calificacion.toFixed(2),
      fecha: new Date().toLocaleString()
    });

    // Mostrar resultados
    dom.examSection.classList.add("hidden");
    dom.resultSection.classList.remove("hidden");
    dom.resultSection.classList.add("fade-in");

    dom.userGreeting.innerText = `Evaluación completada por: ${nombre}`;
    dom.scoreDisplay.innerText = `${aciertos}/${preguntas.length}`;
    
    let mensaje = "";
    if (calificacion === 100) mensaje = "¡Excelente! Dominio total.";
    else if (calificacion >= 70) mensaje = "Aprobado. Buen trabajo.";
    else mensaje = "Reprobado. Se requiere repaso.";
    
    dom.scoreMessage.innerText = mensaje;

  } catch (error) {
    console.error("Error guardando:", error);
    alert("Hubo un error al guardar tu calificación. Por favor avisa al instructor.");
    dom.btnEnviar.innerText = "Reintentar envío";
    dom.btnEnviar.disabled = false;
  }
}