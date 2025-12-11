document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const correo = document.getElementById("user").value;
  const password = document.getElementById("pass").value;

  const res = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ correo, password })
  });

  const data = await res.json();

  if (data.success) {
    window.location.href = "/admin/dashboard";
  } else {
    document.getElementById("msg").innerText = "Credenciales incorrectas";
  }
});