import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db.js';
import { PORT } from './config.js'; 
import fs from 'fs';
import multer from 'multer';
import path from 'path';


dotenv.config();

const app = express();


app.use(cors()); 
app.use(express.json()); 
app.use('/uploads', express.static('uploads'));

const uploadFolder = './uploads';
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); 
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
  const image_url = req.file ? req.file.filename: null;

  try {
    const result = await pool.query(
      'INSERT INTO desserts (name, price, description, image_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, price, description, image_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al crear el postre:', err);
    res.status(500).json({ error: 'Error al crear el postre' });
  }
});


app.put('/desserts/:id', upload.single('image'), async (req, res) => {
  const { id } = req.params;
  const { name, price, description } = req.body;
   const imagePath = req.file ? req.file.filename: null;

  try {
    const current = await pool.query('SELECT * FROM desserts WHERE id = $1', [id]);

    if (current.rowCount === 0) {
      return res.status(404).send('Postre no encontrado');
    }

    const actual = current.rows[0];

    const updatedName = name ?? actual.name;
    const updatedPrice = price ?? actual.price;
    const updatedDescription = description ?? actual.description;
    const updatedImageUrl = imagePath ?? actual.image_url;

    const result = await pool.query(
      'UPDATE desserts SET name = $1, price = $2, description = $3, image_url = $4 WHERE id = $5 RETURNING *',
      [updatedName, updatedPrice, updatedDescription, updatedImageUrl, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al actualizar el postre:', err);
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
