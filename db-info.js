const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./src/database.db');

function show(table){
  db.all(`PRAGMA table_info('${table}')`, [], (err, rows) => {
    if(err) console.error(err);
    else console.log(table, 'columns:', rows.map(r=>r.name));
    if(table === 'asistencia') db.close();
  });
}

show('profesores');
show('asistencia');
