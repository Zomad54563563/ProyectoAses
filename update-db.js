const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./src/database.db');

function ensureColumn(table, column, type){
  db.all(`PRAGMA table_info('${table}')`, [], (err, rows) => {
    if(err) return console.error(err);
    const cols = rows.map(r=>r.name);
    if(!cols.includes(column)){
      console.log(`Adding column ${column} to ${table}`);
      db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`, (e)=>{
        if(e) console.error('Error adding column:', e.message);
        else console.log('Added column', column);
      });
    } else {
      console.log(`Column ${column} already exists in ${table}`);
    }
  });
}

ensureColumn('profesores','materias','TEXT');
ensureColumn('asistencia','asignatura','TEXT');

setTimeout(()=>db.close(),1000);
