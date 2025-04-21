import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db.js'; // Importamos la conexión a la base de datos
import { PORT } from './config.js'; // Importamos el valor de PORT desde config.js
import fs from 'fs';
import multer from 'multer';
import path from 'path';


dotenv.config();

const app = express();

app.use(cors()); // Habilita CORS para todas las rutas
app.use(express.json()); // Permite recibir JSON en el cuerpo de la solicitud
app.use('/uploads', express.static('uploads')); // Sirve archivos estáticos

const uploadFolder = './uploads';
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder);
}

// Configuración de multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Carpeta donde se guardarán las imágenes
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/\s+/g, '-');
    cb(null, `${Date.now()}-${name}${ext}`);
  },
});

const upload = multer({ storage });


app.get('/desserts', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM desserts');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener los postres' });
  }
});

app.get('/desserts/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM desserts WHERE id = $1', [id]);
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).send('postre no encontrado');
    }
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener el postre' });
  }
});



 //Ruta POST para crear un nuevo postre


 app.post('/desserts', upload.single('image'), async (req, res) => {
  const { name, price, description } = req.body;
  const imagePath = req.file ? req.file.filename: null;

  try {
    const result = await pool.query(
      'INSERT INTO desserts (name, price, description, image_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, price, description, imagePath]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al crear el postre:', err);
    res.status(500).json({ error: 'Error al crear el postre' });
  }
});

//Ruta PUT para actualizar un postre
app.put('/desserts/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const { price } = req.body;
  const { description } = req.body;
  const { image_url } = req.body;
  try {
    const result = await pool.query(
        'UPDATE desserts SET name = $1, price = $2, description = $3,image_url = $4 WHERE id = $5 RETURNING *',
        [name, price,description,image_url, id] 
    );
    if (result.rowCount > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).send('postre no encontrado');
    }
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar el postre' });
  }
});

// Ruta DELETE para eliminar un postre
app.delete('/desserts/:id', async (req, res) => {
    const { id } = req.params;
  
    try {
      const result = await pool.query('DELETE FROM desserts WHERE id = $1', [id]);
  
      if (result.rowCount > 0) {
        console.log(`postre con ID ${id} eliminado`);
        res.status(200).json({ message: 'postre eliminado' }); // 👈 mensaje para el frontend
      } else {
        res.status(404).json({ message: 'postre no encontrado' });
      }
    } catch (err) {
      console.error('Error al eliminar postre:', err);
      res.status(500).json({ error: 'Error al eliminar el postre' });
    }
  });
  

// Levantar el servidor en el puerto configurado
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
