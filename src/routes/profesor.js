const express = require("express");
const router = express.Router();
const db = require("../database");
const bcrypt = require("bcrypt");
const fs = require('fs');
const path = require('path');

// Registrar profesor
router.post("/registro-profesor", async (req, res) => {
  const { nombre, correo, password } = req.body;

  if (!nombre || !correo || !password)
    return res.status(400).json({ error: "Todos los campos son obligatorios" });

  try {
    const hash = await bcrypt.hash(password, 12);
    db.run(
      "INSERT INTO profesores (nombre, correo, password) VALUES (?, ?, ?)",
      [nombre, correo, hash],
      function (err) {
        if (err) return res.status(400).json({ error: "Correo ya registrado" });
        res.json({ success: true });
      }
    );
  } catch (error) {
    res.status(500).json({ error: "Error del servidor" });
  }
});

// Login profesor
router.post("/login-profesor", (req, res) => {
  const { correo, password } = req.body;

  db.get("SELECT * FROM profesores WHERE correo = ?", [correo], async (err, profesor) => {
    if (err) return res.status(500).json({ error: "Error en el servidor" });
    if (!profesor) return res.status(401).json({ error: "Credenciales incorrectas" });

    const valid = await bcrypt.compare(password, profesor.password);
    if (!valid) return res.status(401).json({ error: "Credenciales incorrectas" });

    if (!profesor.aprobado)
      return res.status(403).json({ error: "Tu cuenta no ha sido aprobada" });

    res.json({ success: true, tipo: "profesor", id: profesor.id });
  });
});

// Crear horario
router.post("/horario", (req, res) => {
  const { profesor_id, dia, hora_inicio, hora_fin, asignatura } = req.body;

  db.run(
    "INSERT INTO horarios (profesor_id, dia, hora_inicio, hora_fin, asignatura) VALUES (?, ?, ?, ?, ?)",
    [profesor_id, dia, hora_inicio, hora_fin, asignatura],
    function (err) {
      if (err) return res.status(500).json({ error: "Error al guardar horario" });
      res.json({ success: true });
    }
  );
});

// Ver horarios
router.get("/horarios/:profesor_id", (req, res) => {
  db.all(
    "SELECT * FROM horarios WHERE profesor_id = ?",
    [req.params.profesor_id],
    (err, filas) => {
      if (err) return res.status(500).json({ error: "Error" });
      res.json(filas);
    }
  );
});

// Subir tarea
router.post("/tarea", (req, res) => {
  const { profesor_id, titulo, descripcion, fecha_entrega } = req.body;

  db.run(
    "INSERT INTO tareas (profesor_id, titulo, descripcion, fecha_entrega) VALUES (?, ?, ?, ?)",
    [profesor_id, titulo, descripcion, fecha_entrega],
    function (err) {
      if (err) return res.status(500).json({ error: "Error" });
      res.json({ success: true });
    }
  );
});

// Eliminar tarea subida por el profesor (borra archivo y registro)
router.post('/tarea/eliminar', (req, res) => {
  const { id, profesor_id } = req.body;
  if (!id || !profesor_id) return res.status(400).json({ error: 'id y profesor_id requeridos' });

  db.get('SELECT ruta_archivo, profesor_id FROM tareas WHERE id = ?', [id], (err, tarea) => {
    if (err) return res.status(500).json({ error: 'Error en el servidor' });
    if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada' });
    if (String(tarea.profesor_id) !== String(profesor_id)) return res.status(403).json({ error: 'No autorizado' });

    // Normalize stored ruta_archivo which may start with '/' and make it relative
    const relativePath = (tarea.ruta_archivo || '').replace(/^\/+/, '');
    const filePath = path.join(__dirname, '..', relativePath);
    fs.unlink(filePath, (fsErr) => {
      if (fsErr && fsErr.code !== 'ENOENT') console.error('Error al borrar archivo:', fsErr.message);

      db.run('DELETE FROM tareas WHERE id = ?', [id], function(dbErr) {
        if (dbErr) return res.status(500).json({ error: 'Error al eliminar tarea' });
        res.json({ success: true });
      });
    });
  });
});

// Editar metadata de una tarea (nombre, asignatura) via router
router.post('/tarea/editar', (req, res) => {
  const { id, profesor_id, nombre, asignatura } = req.body;
  if (!id || !profesor_id) return res.status(400).json({ error: 'id y profesor_id requeridos' });

  db.run('UPDATE tareas SET nombre_archivo = ?, asignatura = ? WHERE id = ? AND profesor_id = ?', [nombre || null, asignatura || null, id, profesor_id], function(err) {
    if (err) return res.status(500).json({ error: 'Error al editar tarea' });
    if (this.changes === 0) return res.status(404).json({ error: 'Tarea no encontrada o no pertenece al profesor' });
    res.json({ success: true });
  });
});

// Pasar asistencia
router.post("/asistencia", (req, res) => {
  const { profesor_id, fecha, curso, alumno, presente } = req.body;

  db.run(
    "INSERT INTO asistencia (profesor_id, fecha, curso, alumno, presente) VALUES (?, ?, ?, ?, ?)",
    [profesor_id, fecha, curso, alumno, presente],
    function (err) {
      if (err) return res.status(500).json({ error: "Error" });
      res.json({ success: true });
    }
  );
});

module.exports = router;
