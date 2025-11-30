// IMPORTACIONES DE FIREBASE (Mismas versiones)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- PEGA AQUÍ TU MISMA CONFIGURACIÓN DE FIREBASE QUE EN SCRIPT.JS ---
const firebaseConfig = {
    // ... TU CONFIGURACIÓN ...
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Referencias DOM
const ui = {
  loginSection: document.getElementById("adminLogin"),
  dashboardSection: document.getElementById("adminDashboard"),
  nameInput: document.getElementById("adminName"),
  controlInput: document.getElementById("adminControl"),
  btnLogin: document.getElementById("btnAdminLogin"),
  errorMsg: document.getElementById("adminError"),
  tableBody: document.querySelector("#resultsTable tbody"),
  btnPDF: document.getElementById("btnDescargarPDF")
};

// Datos en memoria
let estudiantesData = [];

// Credenciales autorizadas
const ADMIN_NAME = "Miguel Alejandro Valdez Luna";
const ADMIN_CONTROL = "21070413";

document.addEventListener("DOMContentLoaded", () => {
  ui.btnLogin.addEventListener("click", loginAdmin);
  ui.btnPDF.addEventListener("click", generarPDF);
});

function loginAdmin() {
  const name = ui.nameInput.value.trim();
  const control = ui.controlInput.value.trim();

  // Validación estricta
  if (name === ADMIN_NAME && control === ADMIN_CONTROL) {
    ui.loginSection.classList.add("hidden");
    ui.dashboardSection.classList.remove("hidden");
    ui.dashboardSection.classList.add("fade-in");
    cargarResultados();
  } else {
    ui.errorMsg.innerText = "Acceso denegado: Credenciales incorrectas.";
  }
}

async function cargarResultados() {
  ui.tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center">Cargando datos de Firebase...</td></tr>`;
  
  try {
    const querySnapshot = await getDocs(collection(db, "resultados_examen"));
    estudiantesData = [];

    querySnapshot.forEach((doc) => {
      estudiantesData.push(doc.data());
    });

    renderTable();

  } catch (error) {
    console.error(error);
    ui.tableBody.innerHTML = `<tr><td colspan="5" style="color:red">Error al cargar datos.</td></tr>`;
  }
}

function renderTable() {
  if (estudiantesData.length === 0) {
    ui.tableBody.innerHTML = `<tr><td colspan="5">No hay exámenes registrados aún.</td></tr>`;
    return;
  }

  ui.tableBody.innerHTML = "";
  
  estudiantesData.forEach(st => {
    const tr = document.createElement("tr");
    
    // Lógica de trampa
    const trampas = st.trampas || 0;
    let estadoHTML = "";
    
    if (trampas > 0) {
      estadoHTML = `<span class="badge badge-cheat">⚠️ DETECTADA (${trampas} veces)</span>`;
    } else {
      estadoHTML = `<span class="badge badge-clean">✅ Limpio</span>`;
    }

    tr.innerHTML = `
      <td>${st.control}</td>
      <td>${st.nombre}</td>
      <td><strong>${st.calificacion}</strong></td>
      <td>${st.aciertos}/${st.total}</td>
      <td>${estadoHTML}</td>
    `;
    ui.tableBody.appendChild(tr);
  });
}

// Generación de PDF
function generarPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Título
  doc.setFontSize(18);
  doc.text("Reporte de Resultados - Seguridad Legal", 14, 22);
  doc.setFontSize(11);
  doc.text(`Generado por: ${ADMIN_NAME}`, 14, 30);
  doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 36);

  // Preparar datos para la tabla del PDF
  const tableBody = estudiantesData.map(st => {
    const trampas = st.trampas || 0;
    const trampaTexto = trampas > 0 ? `DETECTADO (${trampas})` : "Limpio";
    return [st.control, st.nombre, st.calificacion, trampaTexto];
  });

  doc.autoTable({
    startY: 45,
    head: [['No. Control', 'Nombre', 'Calif.', 'Estado de Integridad']],
    body: tableBody,
    theme: 'grid',
    // Colorear filas de tramposos
    didParseCell: function(data) {
      if (data.section === 'body' && data.column.index === 3) {
        const text = data.cell.raw;
        if (text.includes("DETECTADO")) {
          data.cell.styles.textColor = [200, 0, 0]; // Rojo
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [0, 100, 0]; // Verde
        }
      }
    }
  });

  doc.save("Reporte_Examen_Seguridad.pdf");
}