const express = require('express');
const router = express.Router();
const multer = require('multer');
const { getPlants, addPlant, deletePlant, getPlantCount } = require('../controllers/plantController');
const { protect } = require('../middleware/auth');

// Use memory storage — file buffer is uploaded to Cloudinary in the controller
const storage = multer.memoryStorage();

// File filter — only allow images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif/;
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpg, png, webp, gif) are allowed!'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter,
});

// All routes are protected
router.get('/', protect, getPlants);
router.post('/', protect, upload.single('image'), addPlant);
router.delete('/:id', protect, deletePlant);
router.get('/count', protect, getPlantCount);

module.exports = router;
