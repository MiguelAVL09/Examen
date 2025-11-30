// ==========================================
// 1. CONFIGURACIÓN DE FIREBASE
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- PEGA AQUÍ TU CONFIGURACIÓN DE FIREBASE (La misma que ya tienes) ---
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
    // El usuario se fue de la pestaña
    cambiosDeVentana++;
    console.log(`Alerta de foco: ${cambiosDeVentana}`);
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

document.addEventListener('DOMContentLoaded', () => {
  dom.btnLogin.addEventListener('click', iniciarSesion);
  dom.btnEnviar.addEventListener('click', enviarExamen);
});

async function iniciarSesion() {
  const control = dom.controlInput.value.trim();
  const nombre = dom.nombreInput.value.trim();

  if (!nombre) return mostrarError("Ingresa tu nombre completo.");
  if (!/^\d{8}$/.test(control)) return mostrarError("El número de control debe ser de 8 dígitos.");

  dom.btnLogin.innerText = "Verificando...";
  dom.btnLogin.disabled = true;

  try {
    const docRef = doc(db, "resultados_examen", control);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      mostrarError(`Ya presentaste el examen anteriormente.`);
      dom.btnLogin.innerText = "Entrar";
      dom.btnLogin.disabled = false;
      return;
    }

    // Resetear contador de trampas al iniciar
    cambiosDeVentana = 0;

    dom.loginError.innerText = "";
    dom.loginSection.classList.add("hidden");
    dom.examSection.classList.remove("hidden");
    dom.examSection.classList.add("fade-in");
    cargarPreguntas();

  } catch (error) {
    console.error(error);
    mostrarError("Error de conexión.");
    dom.btnLogin.innerText = "Entrar";
    dom.btnLogin.disabled = false;
  }
}

function mostrarError(msg) { dom.loginError.innerText = msg; }

function cargarPreguntas() {
  dom.examForm.innerHTML = "";
  preguntas.forEach((q, i) => {
    // Generación simple de HTML para preguntas
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
    alert("Responde todas las preguntas.");
    return;
  }

  const control = dom.controlInput.value.trim();
  const nombre = dom.nombreInput.value.trim();
  const calif = (aciertos / preguntas.length) * 100;

  dom.btnEnviar.innerText = "Enviando...";
  dom.btnEnviar.disabled = true;

  try {
    // GUARDAR EN FIREBASE CON DATOS DE TRAMPA
    await setDoc(doc(db, "resultados_examen", control), {
      nombre: nombre,
      control: control,
      aciertos: aciertos,
      total: preguntas.length,
      calificacion: calif.toFixed(2),
      fecha: new Date().toLocaleString(),
      trampas: cambiosDeVentana // <--- AQUÍ GUARDAMOS SI SE SALIÓ DE LA PESTAÑA
    });

    dom.examSection.classList.add("hidden");
    dom.resultSection.classList.remove("hidden");
    dom.resultSection.classList.add("fade-in");
    
    dom.userGreeting.innerText = `Alumno: ${nombre}`;
    dom.scoreDisplay.innerText = `${aciertos}/${preguntas.length}`;
    dom.scoreMessage.innerText = "Examen registrado correctamente.";

  } catch (e) {
    alert("Error al guardar.");
    dom.btnEnviar.disabled = false;
  }
}