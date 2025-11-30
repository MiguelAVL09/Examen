// Base de datos de preguntas
// Base de datos de preguntas ampliada (Seguridad Legal y Normativa)
const preguntas = [
  // --- Conceptos Básicos ---
  { 
    p: "¿Qué es la seguridad legal en TI?", 
    o: ["Instalación de cámaras de vigilancia", "Cumplimiento de leyes, normas y políticas", "Diseño de topologías de red"], 
    c: 1 
  },
  
  // --- Leyes y Normativas en México ---
  { 
    p: "¿Cuál es la ley principal que protege los datos personales en posesión de empresas en México?", 
    o: ["Ley Federal del Trabajo (LFT)", "LFPDPPP", "Norma Oficial Mexicana 035"], 
    c: 1 
  },
  { 
    p: "Según el Código Penal Federal, ¿qué delito comete quien accede sin autorización a sistemas informáticos?", 
    o: ["Acceso ilícito a sistemas y equipos", "Abuso de confianza administrativo", "Daño en propiedad ajena"], 
    c: 0 
  },
  { 
    p: "¿Qué documento legal deben firmar los empleados para proteger la información confidencial de la empresa?", 
    o: ["Contrato de arrendamiento", "Acuerdo de Confidencialidad (NDA)", "Manual de bienvenida"], 
    c: 1 
  },

  // --- Políticas Internas ---
  { 
    p: "¿Qué es una Política de Uso Aceptable (AUP)?", 
    o: ["Un documento que define cómo se deben usar los recursos informáticos", "Un software antivirus", "La lista de precios de la empresa"], 
    c: 0 
  },
  { 
    p: "¿Qué documento interno define las consecuencias de violar las normas de seguridad?", 
    o: ["Política de Sanciones", "Inventario de Hardware", "Diagrama de Red"], 
    c: 0 
  },

  // --- Gestión de Riesgos Legales ---
  { 
    p: "En gestión de riesgos legales, ¿qué es la 'debida diligencia' (due diligence)?", 
    o: ["Ignorar los riesgos hasta que ocurra un problema", "Tomar medidas razonables para prevenir daños y cumplir leyes", "Contratar hackers para atacar a la competencia"], 
    c: 1 
  },
  { 
    p: "¿Qué consecuencia legal puede tener el uso de software pirata en una organización?", 
    o: ["Multas por violación de derechos de autor (Propiedad Intelectual)", "Solo que la computadora sea lenta", "No tiene consecuencias legales"], 
    c: 0 
  },

  // --- Brechas de Cumplimiento y Auditorías ---
  { 
    p: "¿Qué es una brecha de cumplimiento?", 
    o: ["Un corte de energía eléctrica", "La diferencia entre lo que exige la ley y lo que realmente hace la empresa", "Un virus informático"], 
    c: 1 
  },
  { 
    p: "¿Cuál es el objetivo principal de una auditoría legal de TI?", 
    o: ["Buscar culpables para despedirlos", "Verificar que los controles y procesos cumplan con la normativa vigente", "Aumentar la velocidad del internet"], 
    c: 1 
  },

  // --- Sanciones y Responsabilidades ---
  { 
    p: "¿Quién es el responsable final de la seguridad de la información ante la ley?", 
    o: ["El proveedor de internet", "El becario de sistemas", "La organización y sus representantes legales"], 
    c: 2 
  },
  { 
    p: "Las sanciones por incumplir la LFPDPPP pueden incluir:", 
    o: ["Solo una amonestación verbal", "Multas económicas significativas y penas de prisión en casos graves", "Suspensión de la cuenta de Facebook"], 
    c: 1 
  }
];

// Referencias al DOM
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

function iniciarSesion() {
  const nombre = dom.nombreInput.value.trim();
  const control = dom.controlInput.value.trim();

  // Validaciones
  if (!nombre) {
    mostrarError("Por favor, ingresa tu nombre completo.");
    return;
  }
  
  // Validación estricta: 8 dígitos numéricos
  if (!/^\d{8}$/.test(control)) {
    mostrarError("El número de control debe tener exactamente 8 dígitos.");
    return;
  }

  // Verificar si ya presentó el examen
  if (localStorage.getItem("examen_" + control)) {
    mostrarError(`El usuario con control ${control} ya ha presentado el examen.`);
    return;
  }

  // Transición a la siguiente pantalla
  dom.loginError.innerText = ""; // Limpiar errores
  dom.loginSection.classList.add("hidden");
  dom.examSection.classList.remove("hidden");
  dom.examSection.classList.add("fade-in");

  cargarPreguntas();
}

function mostrarError(mensaje) {
  dom.loginError.innerText = mensaje;
  // Pequeña animación de "sacudida" visual si se quisiera agregar en CSS
}

function cargarPreguntas() {
  dom.examForm.innerHTML = "";

  preguntas.forEach((q, index) => {
    const questionBlock = document.createElement("div");
    questionBlock.className = "question-block";

    // Título de la pregunta
    const title = document.createElement("span");
    title.className = "question-title";
    title.innerText = `${index + 1}. ${q.p}`;
    questionBlock.appendChild(title);

    // Opciones
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

function enviarExamen() {
  let aciertos = 0;
  let respondidas = 0;

  preguntas.forEach((q, i) => {
    const seleccion = document.querySelector(`input[name='p${i}']:checked`);
    if (seleccion) {
      respondidas++;
      if (parseInt(seleccion.value) === q.c) aciertos++;
    }
  });

  // Validación opcional: Obligar a responder todas
  if (respondidas < preguntas.length) {
    alert("Por favor, responde todas las preguntas antes de enviar.");
    return;
  }

  const control = dom.controlInput.value.trim();
  const nombre = dom.nombreInput.value.trim();

  // Guardar en LocalStorage
  localStorage.setItem("examen_" + control, true);

  // Mostrar Resultados
  dom.examSection.classList.add("hidden");
  dom.resultSection.classList.remove("hidden");
  dom.resultSection.classList.add("fade-in");

  dom.userGreeting.innerText = `Evaluación completada por: ${nombre}`;
  dom.scoreDisplay.innerText = `${aciertos}/${preguntas.length}`;
  
  // Mensaje de retroalimentación
  const porcentaje = (aciertos / preguntas.length) * 100;
  let mensaje = "";
  if (porcentaje === 100) mensaje = "¡Excelente! Dominio total del tema.";
  else if (porcentaje >= 70) mensaje = "Buen trabajo. Cumplimiento aceptable.";
  else mensaje = "Se recomienda repasar los protocolos de seguridad.";
  
  dom.scoreMessage.innerText = mensaje;
}