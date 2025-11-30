// Base de datos de preguntas
const preguntas = [
  { p: "¿Qué es la seguridad legal?", o: ["Control físico de accesos", "Cumplimiento de leyes y políticas", "Diseño de arquitectura de red"], c: 1 },
  { p: "Ley principal de datos personales en México:", o: ["Ley Federal del Trabajo", "LFPDPPP", "Norma ISO 27001"], c: 1 },
  { p: "Documento que regula el uso de la red:", o: ["Política de seguridad informática", "Acta constitutiva", "Inventario de activos"], c: 0 },
  { p: "¿Qué es una brecha de cumplimiento?", o: ["Un ciberataque externo", "Diferencia entre ley y práctica", "Un fallo de hardware"], c: 1 }
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