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
    const plants = await Plant.find({}).sort({ createdAt: -1 });
    const count = await Plant.countDocuments();

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
    const { plantName, region, plantedDate, plantedBy } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a plant image' });
    }

    // Upload to Cloudinary
    const cloudResult = await uploadToCloudinary(req.file.buffer);

    const plant = await Plant.create({
      plantName,
      image: cloudResult.secure_url,
      region,
      plantedDate,
      plantedBy,
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
// @access  Private
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

module.exports = { getPlants, addPlant, deletePlant, getPlantCount };
