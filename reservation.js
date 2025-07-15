import express from 'express';
import Reservation from '../models/Reservation.js';
;

const router = express.Router();

// POST /api/reservations - Create new reservation
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, date, time, guests, specialRequests } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !date || !time || !guests) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }

    // Validate date is in the future
    const reservationDate = new Date(date);
    if (reservationDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Reservation date must be in the future'
      });
    }

    // Create new reservation
    const newReservation = new Reservation({
      name,
      email,
      phone,
      date: reservationDate,
      time,
      guests,
      specialRequests
    });

    const savedReservation = await newReservation.save();

    // Send confirmation email (optional)
    try {
      await sendReservationEmail(savedReservation);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Reservation created successfully! We will confirm your booking soon.',
      data: {
        id: savedReservation._id,
        name: savedReservation.name,
        email: savedReservation.email,
        date: savedReservation.date,
        time: savedReservation.time,
        guests: savedReservation.guests,
        status: savedReservation.status,
        createdAt: savedReservation.createdAt
      }
    });

  } catch (error) {
    console.error('Reservation creation error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
});

// GET /api/reservations - Get all reservations (admin only)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, date } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.date = { $gte: startDate, $lt: endDate };
    }

    const reservations = await Reservation.find(query)
      .sort({ date: 1, time: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    const total = await Reservation.countDocuments(query);

    res.json({
      success: true,
      data: reservations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get reservations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
});

// GET /api/reservations/:id - Get single reservation
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const reservation = await Reservation.findById(id).select('-__v');
    
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    res.json({
      success: true,
      data: reservation
    });

  } catch (error) {
    console.error('Get reservation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
});

// PUT /api/reservations/:id/status - Update reservation status
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, tableNumber } = req.body;

    if (!['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const updateData = { status };
    if (tableNumber && status === 'confirmed') {
      updateData.tableNumber = tableNumber;
    }

    const reservation = await Reservation.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    res.json({
      success: true,
      message: 'Reservation status updated successfully',
      data: reservation
    });

  } catch (error) {
    console.error('Update reservation status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
});

// DELETE /api/reservations/:id - Cancel reservation
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const reservation = await Reservation.findByIdAndUpdate(
      id,
      { status: 'cancelled' },
      { new: true }
    );

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    res.json({
      success: true,
      message: 'Reservation cancelled successfully',
      data: reservation
    });

  } catch (error) {
    console.error('Cancel reservation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
});

export default router;