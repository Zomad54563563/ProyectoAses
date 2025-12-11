console.log("Panel cargado correctamente");
// Cargar lista al iniciar
document.addEventListener("DOMContentLoaded", cargarProfesoresPendientes);

async function cargarProfesoresPendientes() {
  const tabla = document.querySelector("#tablaProfesores tbody");
  const mensaje = document.getElementById("mensaje");

  tabla.innerHTML = "<tr><td colspan='4'>Cargando...</td></tr>";

  try {
    const res = await fetch("/api/profesores-pendientes");
    const datos = await res.json();

    if (datos.length === 0) {
      tabla.innerHTML = "<tr><td colspan='4'>No hay profesores pendientes</td></tr>";
      return;
    }

    tabla.innerHTML = "";

    datos.forEach((p) => {
      const fila = document.createElement("tr");

      fila.innerHTML = `
        <td>${p.id}</td>
        <td>${p.nombre}</td>
        <td>${p.correo}</td>
        <td><button onclick="aprobar(${p.id})">Aprobar</button></td>
      `;

      tabla.appendChild(fila);
    });

  } catch (error) {
    tabla.innerHTML = "<tr><td colspan='4'>Error cargando datos</td></tr>";
  }
}

async function aprobar(id) {
  const mensaje = document.getElementById("mensaje");

  const res = await fetch("/api/aprobar-profesor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id })
  });

  const data = await res.json();

  if (data.success) {
    mensaje.innerText = "Profesor aprobado correctamente.";
    cargarProfesoresPendientes();
  } else {
    mensaje.innerText = "Hubo un error al aprobar.";
  }
}
