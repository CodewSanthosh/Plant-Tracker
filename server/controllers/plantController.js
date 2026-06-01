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

// @desc    Get all plants
// @route   GET /api/plants
// @access  Private
const getPlants = async (req, res) => {
  try {
    const plants = await Plant.find({ user: req.user._id }).sort({ createdAt: -1 });
    const count = await Plant.countDocuments({ user: req.user._id });

    res.json({ plants, count });
  } catch (error) {
    console.error('Get plants error:', error.message);
    res.status(500).json({ message: 'Server error fetching plants' });
  }
};

// @desc    Add a new plant
// @route   POST /api/plants
// @access  Private
const addPlant = async (req, res) => {
  try {
    const { plantName, region, plantedDate, plantedBy, lat, lng } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a plant image' });
    }

    // Upload to Cloudinary
    const cloudResult = await uploadToCloudinary(req.file.buffer);

    const location = (lat && lng) ? { lat: Number(lat), lng: Number(lng) } : undefined;

    const plant = await Plant.create({
      user: req.user._id,
      plantName,
      image: cloudResult.secure_url,
      region,
      plantedDate,
      plantedBy,
      location,
    });

    const count = await Plant.countDocuments({ user: req.user._id });

    res.status(201).json({ plant, count });
  } catch (error) {
    console.error('Add plant error:', error.message);
    res.status(500).json({ message: 'Server error adding plant' });
  }
};

// @desc    Delete a plant
// @route   DELETE /api/plants/:id
// @access  Private
const deletePlant = async (req, res) => {
  try {
    const plant = await Plant.findById(req.params.id);

    if (!plant) {
      return res.status(404).json({ message: 'Plant not found' });
    }

    // Ensure the user owns the plant
    if (plant.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to delete this plant' });
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
    const count = await Plant.countDocuments({ user: req.user._id });

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
    const count = await Plant.countDocuments({ user: req.user._id });
    res.json({ count });
  } catch (error) {
    console.error('Count error:', error.message);
    res.status(500).json({ message: 'Server error getting count' });
  }
};

// @desc    Add a growth update to a plant
// @route   POST /api/plants/:id/updates
// @access  Private
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

    if (plant.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to update this plant' });
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
