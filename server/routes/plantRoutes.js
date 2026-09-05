const express = require('express');
const router = express.Router();
const multer = require('multer');
const { getPlants, addPlant, deletePlant, getPlantCount, addPlantUpdate } = require('../controllers/plantController');
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

// All routes are protected (logged-in users only)
router.get('/', protect, getPlants);
// Any logged-in user can add a plant (plant is owned by the creator)
router.post('/', protect, upload.single('image'), addPlant);
// Owner or admin can delete a plant (ownership check in controller)
router.delete('/:id', protect, deletePlant);
// Owner or admin can post growth updates (ownership check in controller)
router.post('/:id/updates', protect, upload.single('image'), addPlantUpdate);
router.get('/count', protect, getPlantCount);

module.exports = router;

