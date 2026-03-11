const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Database
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS personas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    cedula TEXT NOT NULL,
    edad TEXT DEFAULT '',
    telefono TEXT NOT NULL,
    telefono_opcional TEXT DEFAULT '',
    email TEXT DEFAULT '',
    direccion TEXT DEFAULT '',
    punto_referencia TEXT DEFAULT '',
    sector_barrio TEXT DEFAULT '',
    fecha_nacimiento TEXT DEFAULT '',
    genero TEXT DEFAULT 'M',
    created_at TEXT DEFAULT (datetime('now','localtime')),
    received_at TEXT DEFAULT (datetime('now','localtime'))
  );
`);

// Add new columns if upgrading
const cols = db.prepare("PRAGMA table_info(personas)").all().map(c => c.name);
const newCols = [
    { name: 'edad', type: "TEXT DEFAULT ''" },
    { name: 'telefono_opcional', type: "TEXT DEFAULT ''" },
    { name: 'punto_referencia', type: "TEXT DEFAULT ''" },
    { name: 'sector_barrio', type: "TEXT DEFAULT ''" },
];
for (const col of newCols) {
    if (!cols.includes(col.name)) {
        db.exec(`ALTER TABLE personas ADD COLUMN ${col.name} ${col.type}`);
        console.log(`✅ Columna '${col.name}' agregada`);
    }
}

console.log('✅ Base de datos inicializada');

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// POST /api/personas
app.post('/api/personas', (req, res) => {
    try {
        const { nombre, cedula, edad, telefono, telefono_opcional, email, direccion, punto_referencia, sector_barrio, fecha_nacimiento, genero } = req.body;
        if (!nombre || !cedula || !telefono) {
            return res.status(400).json({ success: false, message: 'Campos requeridos: nombre, cedula, telefono' });
        }
        const stmt = db.prepare(`INSERT INTO personas (nombre, cedula, edad, telefono, telefono_opcional, email, direccion, punto_referencia, sector_barrio, fecha_nacimiento, genero)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        const result = stmt.run(nombre, cedula, edad || '', telefono, telefono_opcional || '', email || '', direccion || '', punto_referencia || '', sector_barrio || '', fecha_nacimiento || '', genero || 'M');
        console.log(`✅ Persona registrada: ${nombre} (ID: ${result.lastInsertRowid})`);
        res.status(201).json({ success: true, message: 'Persona registrada exitosamente', data: { id: result.lastInsertRowid } });
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// POST /api/personas/batch
app.post('/api/personas/batch', (req, res) => {
    try {
        const { personas } = req.body;
        if (!Array.isArray(personas) || personas.length === 0) {
            return res.status(400).json({ success: false, message: 'Se requiere un array de personas' });
        }
        const stmt = db.prepare(`INSERT INTO personas (nombre, cedula, edad, telefono, telefono_opcional, email, direccion, punto_referencia, sector_barrio, fecha_nacimiento, genero)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        const insertMany = db.transaction((items) => {
            const results = [];
            for (const p of items) {
                const result = stmt.run(p.nombre, p.cedula, p.edad || '', p.telefono, p.telefono_opcional || '', p.email || '', p.direccion || '', p.punto_referencia || '', p.sector_barrio || '', p.fecha_nacimiento || '', p.genero || 'M');
                results.push(result.lastInsertRowid);
            }
            return results;
        });
        const ids = insertMany(personas);
        console.log(`✅ Batch: ${ids.length} personas registradas`);
        res.status(201).json({ success: true, message: `${ids.length} personas registradas`, data: { ids, count: ids.length } });
    } catch (error) {
        console.error('❌ Error en batch:', error.message);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// GET /api/personas
app.get('/api/personas', (req, res) => {
    try {
        const { search } = req.query;
        let personas;
        if (search) {
            const term = `%${search}%`;
            personas = db.prepare(`SELECT * FROM personas WHERE nombre LIKE ? OR cedula LIKE ? OR telefono LIKE ? OR email LIKE ? OR sector_barrio LIKE ? ORDER BY received_at DESC`).all(term, term, term, term, term);
        } else {
            personas = db.prepare('SELECT * FROM personas ORDER BY received_at DESC').all();
        }
        res.json({ success: true, data: personas, count: personas.length });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error interno' });
    }
});

// GET /api/personas/:id
app.get('/api/personas/:id', (req, res) => {
    try {
        const persona = db.prepare('SELECT * FROM personas WHERE id = ?').get(req.params.id);
        if (!persona) return res.status(404).json({ success: false, message: 'Persona no encontrada' });
        res.json({ success: true, data: persona });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error interno' });
    }
});

// DELETE /api/personas/:id
app.delete('/api/personas/:id', (req, res) => {
    try {
        const result = db.prepare('DELETE FROM personas WHERE id = ?').run(req.params.id);
        if (result.changes === 0) return res.status(404).json({ success: false, message: 'Persona no encontrada' });
        res.json({ success: true, message: 'Persona eliminada' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error interno' });
    }
});

// GET /api/stats
app.get('/api/stats', (req, res) => {
    try {
        const total = db.prepare('SELECT COUNT(*) as count FROM personas').get();
        res.json({ success: true, data: { total: total.count } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error interno' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 ElimAPP API corriendo en:`);
    console.log(`   Local:   http://localhost:${PORT}`);
    console.log(`   Red:     http://<tu-ip>:${PORT}\n`);
});
