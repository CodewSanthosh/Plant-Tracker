const Plant = require('../models/Plant');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

// Upload buffer to Cloudinary via stream
const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'plant-tracker',
        transformation: [{ width: 800, height: 600, crop: 'limit', quality: 'auto' }],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

// Helper — extract Cloudinary public_id from URL
const getPublicIdFromUrl = (url) => {
  try {
    const parts = url.split('/');
    const uploadIdx = parts.indexOf('upload');
    if (uploadIdx === -1) return null;
    const pathAfterUpload = parts.slice(uploadIdx + 2).join('/');
    return pathAfterUpload.replace(/\.[^.]+$/, '');
  } catch {
    return null;
  }
};

// @desc    Get all plants (shared across all users)
// @route   GET /api/plants
// @access  Private
const getPlants = async (req, res) => {
  try {
    const plants = await Plant.find().sort({ createdAt: -1 });
    const count = await Plant.countDocuments();

    res.json({ plants, count });
  } catch (error) {
    console.error('Get plants error:', error.message);
    res.status(500).json({ message: 'Server error fetching plants' });
  }
};

// @desc    Add a new plant
// @route   POST /api/plants
// @access  Private/Admin
const addPlant = async (req, res) => {
  try {
    const { plantName, region, plantedDate, plantedBy, lat, lng } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a plant image' });
    }

    if (!lat || !lng) {
      return res.status(400).json({ message: 'Please pick the plantation location on the map' });
    }

    // Upload to Cloudinary
    const cloudResult = await uploadToCloudinary(req.file.buffer);

    const location = { lat: Number(lat), lng: Number(lng) };

    const plant = await Plant.create({
      user: req.user._id,
      plantName,
      image: cloudResult.secure_url,
      region,
      plantedDate,
      plantedBy,
      location,
    });

    const count = await Plant.countDocuments();

    res.status(201).json({ plant, count });
  } catch (error) {
    console.error('Add plant error:', error.message);
    res.status(500).json({ message: 'Server error adding plant' });
  }
};

// @desc    Delete a plant
// @route   DELETE /api/plants/:id
// @access  Private/Admin
const deletePlant = async (req, res) => {
  try {
    const plant = await Plant.findById(req.params.id);

    if (!plant) {
      return res.status(404).json({ message: 'Plant not found' });
    }

    // Delete image from Cloudinary
    const publicId = getPublicIdFromUrl(plant.image);
    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (cloudErr) {
        console.error('Cloudinary delete error:', cloudErr.message);
      }
    }

    await Plant.findByIdAndDelete(req.params.id);
    const count = await Plant.countDocuments();

    res.json({ message: 'Plant removed', count });
  } catch (error) {
    console.error('Delete plant error:', error.message);
    res.status(500).json({ message: 'Server error deleting plant' });
  }
};

// @desc    Get plant count
// @route   GET /api/plants/count
// @access  Private
const getPlantCount = async (req, res) => {
  try {
    const count = await Plant.countDocuments();
    res.json({ count });
  } catch (error) {
    console.error('Count error:', error.message);
    res.status(500).json({ message: 'Server error getting count' });
  }
};

// @desc    Add a growth update to a plant
// @route   POST /api/plants/:id/updates
// @access  Private (any logged-in user)
const addPlantUpdate = async (req, res) => {
  try {
    const { notes, date } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image for the update' });
    }

    const plant = await Plant.findById(req.params.id);

    if (!plant) {
      return res.status(404).json({ message: 'Plant not found' });
    }

    // Upload update image to Cloudinary
    const cloudResult = await uploadToCloudinary(req.file.buffer);

    // Add update to the array
    plant.updates.push({
      image: cloudResult.secure_url,
      notes,
      date,
    });

    await plant.save();
    
    res.status(201).json(plant);
  } catch (error) {
    console.error('Add plant update error:', error.message);
    res.status(500).json({ message: 'Server error adding plant update' });
  }
};

module.exports = { getPlants, addPlant, deletePlant, getPlantCount, addPlantUpdate };
