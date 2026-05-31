const mongoose = require('mongoose');

const plantSchema = new mongoose.Schema({
  plantName: {
    type: String,
    required: [true, 'Plant name is required'],
    trim: true,
  },
  image: {
    type: String,
    required: [true, 'Plant image is required'],
  },
  region: {
    type: String,
    required: [true, 'Planted region/place is required'],
    trim: true,
  },
  plantedDate: {
    type: Date,
    required: [true, 'Date of plantation is required'],
  },
  plantedBy: {
    type: String,
    required: [true, 'Person who planted is required'],
    trim: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Plant', plantSchema);
