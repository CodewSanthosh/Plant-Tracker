const mongoose = require('mongoose');

const plantSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
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
    required: [true, 'Planted by is required'],
  },
  location: {
    lat: { type: Number },
    lng: { type: Number }
  },
  updates: [
    {
      image: { type: String, required: true },
      notes: { type: String },
      date: { type: Date, required: true },
      createdAt: { type: Date, default: Date.now }
    }
  ]
}, {
  timestamps: true,
});

module.exports = mongoose.model('Plant', plantSchema);
