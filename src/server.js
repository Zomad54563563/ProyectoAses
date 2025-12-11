const express = require("express");
const path = require("path");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const sqlite3 = require("sqlite3").verbose();
const { open } = require("sqlite");
const profesorRouter = require("./routes/profesor");
const PROFESOR_ID = 1; // cambiar por el profesor que esté logueado
const multer = require("multer");
const fs = require("fs");

const carpetaTareas = path.join(__dirname, "tareas");
fs.mkdirSync(carpetaTareas, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, carpetaTareas);
  },
  filename: function (req, file, cb) {
    const safeName = file.originalname.replace(/\s+/g, "_");
    cb(null, Date.now() + "-" + safeName);
  },
});

const upload = multer({ storage });

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));






// ---------------- CONEXIÓN CON SQLITE ----------------
const db = new sqlite3.Database(path.join(__dirname, "database.db"), (err) => {
  if (err) {
    console.error("❌ Error al conectar con la base de datos:", err.message);
  } else {
    console.log("✅ Base de datos conectada:", path.join(__dirname, "database.db"));

    db.run(`
      CREATE TABLE IF NOT EXISTS alumnos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT,
        correo TEXT UNIQUE,
        password TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS profesores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT,
        correo TEXT UNIQUE,
        password TEXT,
        aprobado INTEGER DEFAULT 0
      )
    `);
    // Ensure 'materias' column exists (text, comma-separated list)
    db.run("ALTER TABLE profesores ADD COLUMN materias TEXT", (err) => {
      if (err && !/duplicate column name/i.test(err.message)) {
        console.error('Error al agregar columna materias:', err.message);
      }
    });
    db.run(`
      CREATE TABLE IF NOT EXISTS malla (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        profesor_id INTEGER,
        curso TEXT,
        asignatura TEXT,
        descripcion TEXT
     )
  `);
    db.run(`
      CREATE TABLE IF NOT EXISTS tareas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        profesor_id INTEGER,
        nombre_archivo TEXT,
        ruta_archivo TEXT,
        fecha_subida TEXT
    )
  `);
    // Ensure 'asignatura' column exists for tareas
    db.run("ALTER TABLE tareas ADD COLUMN asignatura TEXT", (err) => {
      if (err && !/duplicate column name/i.test(err.message)) {
        console.error('Error al agregar columna asignatura en tareas:', err.message);
      }
    });

    db.run(`
      CREATE TABLE IF NOT EXISTS horarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        profesor_id INTEGER,
        curso TEXT,
        hora TEXT,
        asignatura TEXT,
        sala TEXT,
        dia TEXT
    )
  `);
    db.run(`
      CREATE TABLE IF NOT EXISTS admin (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        correo TEXT UNIQUE,
        password TEXT
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS asistencia (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alumno_id INTEGER,
      profesor_id INTEGER,
      fecha TEXT,
      estado TEXT,   -- 'asistio' o 'falto'
      sesion TEXT,
      asignatura TEXT,
      FOREIGN KEY(alumno_id) REFERENCES alumnos(id),
      FOREIGN KEY(profesor_id) REFERENCES profesores(id)
    )
  `);
    // Ensure 'asignatura' column exists in asistencia for older DBs
    db.run("ALTER TABLE asistencia ADD COLUMN asignatura TEXT", (err) => {
      if (err && !/duplicate column name/i.test(err.message)) {
        console.error('Error al agregar columna asignatura en asistencia:', err.message);
      }
    });
    // Tabla de chat entre alumno y profesor
    db.run(`
      CREATE TABLE IF NOT EXISTS chat (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        alumno_id INTEGER,
        profesor_id INTEGER,
        sender TEXT,
        mensaje TEXT,
        fecha TEXT
      )
    `);
  }
});

//admin codigo ignacio barrido
const adminEmail = "admin@admin.com";
const adminPass = "1234";
bcrypt.hash(adminPass, 12, (err, hash) => {
  if (err) return console.log("Error creando admin:", err);

  db.run(
    "INSERT OR IGNORE INTO admin (correo, password) VALUES (?, ?)",
    [adminEmail, hash],
    () => console.log("👑 Administrador listo: " + adminEmail)
  );
});

// Rutas de API específicas PRIMERO (antes del router genérico)
app.get("/api/profesor/alumnos", (req, res) => {
  db.all("SELECT id, nombre, correo FROM alumnos", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Error al obtener alumnos" });
    res.json({ alumnos: rows });
  });
});

// Router de profesor DESPUÉS (maneja /profesor/*)
app.use("/profesor", profesorRouter);
// LOGIN DEL ADMIN
// LOGIN REAL DEL ADMIN (usando SQLite) (no se si cause broblemas)
app.post("/api/admin/login", (req, res) => {
  const { correo, password } = req.body;

  db.get("SELECT * FROM admin WHERE correo = ?", [correo], async (err, admin) => {
    if (err) return res.status(500).json({ error: "Error en el servidor" });
    if (!admin) return res.status(401).json({ error: "Correo o contraseña incorrectos" });

    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) return res.status(401).json({ error: "Correo o contraseña incorrectos" });

    return res.json({ success: true });
  });
});

// MOSTRAR LOGIN DEL ADMIN
app.get("/admin/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public/admin/login.html"));
});

// MOSTRAR PANEL DEL ADMIN
app.get("/admin/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public/admin/dashboard.html"));
});

// ----------- RUTAS DE ALUMNOS -------------
app.post("/api/registro-alumno", async (req, res) => {
  const { nombre, correo, password } = req.body;

  if (!nombre || !correo || !password)
    return res.status(400).json({ error: "Todos los campos son obligatorios" });

  if (!/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/.test(password))
    return res.status(400).json({
      error:
        "La contraseña debe tener mínimo 8 caracteres, una mayúscula, un número y un símbolo",
    });

  try {
    const hash = await bcrypt.hash(password, 12);
    db.run(
      "INSERT INTO alumnos (nombre, correo, password) VALUES (?, ?, ?)",
      [nombre, correo, hash],
      function (err) {
        if (err) {
          return res.status(400).json({ error: "Correo ya registrado" });
        }
        res.json({ success: true });
      }
    );
  } catch (error) {
    res.status(500).json({ error: "Error del servidor" });
  }
});

app.post("/api/login-alumno", async (req, res) => {
  const { correo, password } = req.body;

  db.get("SELECT * FROM alumnos WHERE correo = ?", [correo], async (err, alumno) => {
    if (err) return res.status(500).json({ error: "Error en el servidor" });
    if (!alumno) return res.status(401).json({ error: "Credenciales incorrectas" });

    const valid = await bcrypt.compare(password, alumno.password);
    if (!valid) return res.status(401).json({ error: "Credenciales incorrectas" });

    res.json({ success: true, tipo: "alumno", id: alumno.id });
  });
});

// ----------- RUTAS DE PROFESORES -------------
app.post("/api/registro-profesor", async (req, res) => {
  const { nombre, correo, password, materias } = req.body;

  if (!nombre || !correo || !password)
    return res.status(400).json({ error: "Todos los campos son obligatorios" });

  if (!/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/.test(password))
    return res.status(400).json({
      error:
        "La contraseña debe tener mínimo 8 caracteres, una mayúscula, un número y un símbolo",
    });

  try {
    const hash = await bcrypt.hash(password, 12);
    // store materias as comma-separated string if provided
    const materiasStr = Array.isArray(materias) ? materias.join(',') : (materias || null);
    const sql = materiasStr
      ? "INSERT INTO profesores (nombre, correo, password, materias) VALUES (?, ?, ?, ?)"
      : "INSERT INTO profesores (nombre, correo, password) VALUES (?, ?, ?)";
    const params = materiasStr ? [nombre, correo, hash, materiasStr] : [nombre, correo, hash];
    db.run(sql, params,
      function (err) {
        if (err) {
          return res.status(400).json({ error: "Correo ya registrado" });
        }
        res.json({ success: true });  
      }
    );
  } catch (error) {
    res.status(500).json({ error: "Error del servidor" });
  }
});

app.post("/api/login-profesor", (req, res) => {
  const { correo, password } = req.body;

  db.get("SELECT * FROM profesores WHERE correo = ?", [correo], async (err, profesor) => {
    if (err) return res.status(500).json({ error: "Error en el servidor" });
    if (!profesor) return res.status(401).json({ error: "Credenciales incorrectas" });
    if (!profesor.aprobado)
      return res.status(403).json({ error: "Tu cuenta aún no ha sido aprobada" });

    const valid = await bcrypt.compare(password, profesor.password);
    if (!valid) return res.status(401).json({ error: "Credenciales incorrectas" });

    // return materias so frontend can populate subject selector
    res.json({ success: true, tipo: "profesor", id: profesor.id, materias: profesor.materias || null });
  });
});

// ----------- RUTAS DE ADMIN -------------
app.get("/api/profesores-pendientes", (req, res) => {
  db.all("SELECT id, nombre, correo FROM profesores WHERE aprobado = 0", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Error en el servidor" });
    res.json(rows);
  });
});

app.post("/api/aprobar-profesor", (req, res) => {
  const { id } = req.body;
  db.run("UPDATE profesores SET aprobado = 1 WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: "Error al aprobar profesor" });
    res.json({ success: true });
  });
});

app.get("/api/profesores", (req, res) => {
  db.all("SELECT id, nombre, correo, aprobado FROM profesores", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Error en el servidor" });
    res.json(rows);
  });
});

app.post("/api/eliminar-profesor", (req, res) => {
  const { id } = req.body;

  if (!id) return res.status(400).json({ error: "ID requerido" });

  db.run("DELETE FROM profesores WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: "Error al eliminar profesor" });
    res.json({ success: true });
  });
});

app.post("/api/editar-profesor", (req, res) => {
  const { id, nombre, correo } = req.body;

  if (!id || !nombre || !correo)
    return res.status(400).json({ error: "Todos los campos son obligatorios" });

  db.run(
    "UPDATE profesores SET nombre = ?, correo = ? WHERE id = ?",
    [nombre, correo, id],
    function (err) {
      if (err) return res.status(500).json({ error: "Error al editar profesor" });
      res.json({ success: true });
    }
  );
});

app.get("/api/profesor/:id", (req, res) => {
  const { id } = req.params;

  db.get("SELECT * FROM profesores WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ error: "Error en el servidor" });
    if (!row) return res.status(404).json({ error: "Profesor no encontrado" });

    res.json(row);
  });
});

// ---------------- Ruta de horario ----------------

app.post("/api/malla/agregar", (req, res) => {
  const { profesor_id, curso, asignatura, descripcion } = req.body;

  db.run(
    "INSERT INTO malla (profesor_id, curso, asignatura, descripcion) VALUES (?, ?, ?, ?)",
    [profesor_id, curso, asignatura, descripcion],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: this.lastID });
    }
  );
});

// Obtener el horario de un profesor específico

app.get("/horario/:profesor_id", (req, res) => {
  const profesor_id = req.params.profesor_id;

  db.all(
    "SELECT * FROM horarios WHERE profesor_id = ? ORDER BY id DESC",
    [profesor_id],
    (err, rows) => {
      if (err) {
        console.log("ERROR EN GET HORARIO:", err);
        return res.status(500).json({ error: "Error al obtener horarios" });
      }

      console.log("HORARIOS CARGADOS:", rows);
      res.json(rows);
    }
  );
});

// Guardar una clase en el horario
app.post("/horario", (req, res) => {
  const { profesor_id, curso, hora, asignatura, sala, dia } = req.body;

  if (!profesor_id || !curso || !hora || !asignatura || !sala || !dia) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  // Validar que no exista un conflicto en el mismo horario
  db.get(
    "SELECT id FROM horarios WHERE profesor_id = ? AND curso = ? AND hora = ? AND dia = ?",
    [profesor_id, curso, hora, dia],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: "Error al verificar horario" });
      }

      if (row) {
        // Actualizar si ya existe
        db.run(
          "UPDATE horarios SET asignatura = ?, sala = ? WHERE id = ?",
          [asignatura, sala, row.id],
          function (err) {
            if (err) {
              return res.status(500).json({ error: "Error al actualizar horario" });
            }
            res.json({ success: true, mensaje: "Clase actualizada", id: row.id });
          }
        );
      } else {
        // Insertar nueva clase
        db.run(
          "INSERT INTO horarios (profesor_id, curso, hora, asignatura, sala, dia) VALUES (?, ?, ?, ?, ?, ?)",
          [profesor_id, curso, hora, asignatura, sala, dia],
          function (err) {
            if (err) {
              return res.status(500).json({ error: "Error al guardar clase" });
            }
            res.json({ success: true, mensaje: "Clase guardada", id: this.lastID });
          }
        );
      }
    }
  );
});

// Eliminar una clase del horario
app.delete("/horario/:id", (req, res) => {
  const { id } = req.params;

  db.run("DELETE FROM horarios WHERE id = ?", [id], function (err) {
    if (err) {
      return res.status(500).json({ error: "Error al eliminar clase" });
    }
    res.json({ success: true, mensaje: "Clase eliminada" });
  });
});

// Obtener todos los horarios por curso (para alumnos)
app.get("/api/horarios/curso/:curso", (req, res) => {
  const { curso } = req.params;

  if (!curso) {
    return res.status(400).json({ error: "Curso requerido" });
  }

  db.all(
    "SELECT * FROM horarios WHERE curso = ? ORDER BY hora ASC, dia ASC",
    [curso],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: "Error al obtener horarios" });
      }
      res.json({ horarios: rows || [] });
    }
  );
});

// Obtener todos los horarios de todos los cursos
app.get("/api/horarios/todos", (req, res) => {
  db.all(
    "SELECT DISTINCT curso FROM horarios ORDER BY curso ASC",
    [],
    (err, cursos) => {
      if (err) {
        return res.status(500).json({ error: "Error al obtener cursos" });
      }

      const cursosArray = (cursos || []).map(c => c.curso);
      res.json({ cursos: cursosArray });
    }
  );
});

// Eliminar una entrada de la malla por su ID

app.delete("/api/malla/:id", (req, res) => {
  db.run("DELETE FROM malla WHERE id = ?", req.params.id, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// Ruta para que el profesor marque la asistencia de un alumno


app.post("/api/profesor/marcar-asistencia", (req, res) => {
  const { profesor_id, alumno_id, estado, sesion, asignatura } = req.body;

  if (!profesor_id || !alumno_id || !estado)
    return res.status(400).json({ error: "Datos incompletos" });

  const fechaHoy = new Date().toISOString().split('T')[0];

  db.run(
    `INSERT INTO asistencia (alumno_id, profesor_id, fecha, estado, sesion, asignatura)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [alumno_id, profesor_id, fechaHoy, estado, sesion, asignatura || null],
    function (err) {
      if (err) return res.status(500).json({ error: "Error al guardar asistencia" });

      res.json({ success: true, id: this.lastID });
    }
  );
});

// Eliminar asistencia por id (acción de profesor)
app.post('/api/profesor/eliminar-asistencia', (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'ID requerido' });
  db.run('DELETE FROM asistencia WHERE id = ?', [id], function(err){
    if (err) return res.status(500).json({ error: 'Error al eliminar registro' });
    res.json({ success: true, deleted: this.changes });
  });
});

// Ruta para que el alumno obtenga su historial de asistencia
app.get("/api/alumno/asistencia/:alumno_id", (req, res) => {
  const { alumno_id } = req.params;
  const { asignatura } = req.query;

  let sql = `SELECT id, alumno_id, profesor_id, fecha, estado, sesion, asignatura FROM asistencia WHERE alumno_id = ?`;
  const params = [alumno_id];
  if (asignatura) {
    sql += ` AND asignatura = ?`;
    params.push(asignatura);
  }
  sql += ` ORDER BY fecha DESC`;

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: "Error al obtener asistencia" });

    res.json({ 
      success: true, 
      sesiones: rows || [] 
    });
  });
});




// Ruta para que el profesor suba una tarea
app.post("/api/profesor/subir-tarea", upload.single("archivo"), (req, res) => {
  const { profesor_id, asignatura } = req.body;

  if (!req.file)
    return res.status(400).json({ error: "No se recibió ningún archivo" });

  if (!profesor_id)
    return res.status(400).json({ error: "Falta profesor_id" });

  const nombreArchivo = req.file.originalname;
  const rutaArchivo = "/tareas/" + req.file.filename;
  const fecha = new Date().toISOString();

  db.run(
    `INSERT INTO tareas (profesor_id, nombre_archivo, ruta_archivo, fecha_subida, asignatura)
     VALUES (?, ?, ?, ?, ?)`,
    [profesor_id, nombreArchivo, rutaArchivo, fecha, asignatura || null],
    function (err) {
      if (err) return res.status(500).json({ error: "Error al guardar en BD" });

      return res.json({
        success: true,
        mensaje: "Tarea subida correctamente"
      });
    }
  );
});

// Ruta para que el alumno obtenga la lista de tareas

app.get("/api/alumno/tareas", (req, res) => {
  db.all("SELECT * FROM tareas ORDER BY fecha_subida DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Error al obtener tareas" });

    res.json({ success: true, tareas: rows });
  });
});

// Ruta para que el alumno obtenga la lista de materiales

app.get("/api/alumno/materiales", (req, res) => {
  const { asignatura } = req.query;
  let sql = "SELECT id, nombre_archivo AS nombre, fecha_subida, asignatura FROM tareas";
  const params = [];
  if (asignatura) {
    sql += " WHERE asignatura = ?";
    params.push(asignatura);
  }
  sql += " ORDER BY fecha_subida DESC";

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: "Error al obtener tareas" });

    res.json({ materiales: rows });
  });
});

app.get("/api/alumno/materiales/:id/descargar", (req, res) => {
  const { id } = req.params;

  db.get("SELECT * FROM tareas WHERE id = ?", [id], (err, tarea) => {
    if (err || !tarea)
      return res.status(404).json({ error: "Archivo no encontrado" });

    const filePath = path.join(__dirname, tarea.ruta_archivo);

    res.download(filePath, tarea.nombre_archivo);
  });
});
// Servir archivos de la carpeta "tareas"
app.use("/tareas", express.static(path.join(__dirname, "tareas")));

// Obtener tareas de un profesor (usar ruta /api/profesor/:id/tareas)
app.get('/api/profesor/:id/tareas', (req, res) => {
  const profesor_id = req.params.id;
  if (!profesor_id) return res.status(400).json({ error: 'profesor_id requerido' });

  db.all('SELECT id, profesor_id, nombre_archivo AS nombre, ruta_archivo, fecha_subida, asignatura FROM tareas WHERE profesor_id = ? ORDER BY fecha_subida DESC', [profesor_id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error al obtener tareas' });
    res.json({ tareas: rows });
  });
});

// ---------------- RUTAS DE CHAT ----------------
// Enviar mensaje (alumno o profesor)
app.post('/api/chat/send', (req, res) => {
  const { from, alumno_id, profesor_id, mensaje } = req.body;
  if (!from || !alumno_id || !profesor_id || !mensaje) return res.status(400).json({ error: 'Datos incompletos' });

  const fecha = new Date().toISOString();
  db.run(
    'INSERT INTO chat (alumno_id, profesor_id, sender, mensaje, fecha) VALUES (?, ?, ?, ?, ?)',
    [alumno_id, profesor_id, from, mensaje, fecha],
    function (err) {
      if (err) return res.status(500).json({ error: 'Error al guardar mensaje' });
      res.json({ success: true, id: this.lastID });
    }
  );
});

// Obtener conversación entre alumno y profesor
app.get('/api/chat/conversation', (req, res) => {
  const { alumno_id, profesor_id } = req.query;
  if (!alumno_id || !profesor_id) return res.status(400).json({ error: 'Faltan parámetros' });

  db.all(
    'SELECT id, alumno_id, profesor_id, sender, mensaje, fecha FROM chat WHERE alumno_id = ? AND profesor_id = ? ORDER BY id ASC',
    [alumno_id, profesor_id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Error al obtener mensajes', details: err.message });
      // Mapear 'sender' a 'from' y 'mensaje' a 'text' para compatibilidad con frontend
      const mensajes = (rows || []).map(row => ({
        id: row.id,
        alumno_id: row.alumno_id,
        profesor_id: row.profesor_id,
        from: row.sender,
        text: row.mensaje,
        fecha: row.fecha
      }));
      res.json({ mensajes });
    }
  );
});

// Nota: edición y eliminación de tareas ahora están implementadas en el router de profesor (/profesor/*)

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor online en http://localhost:${PORT}`));


