import express from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import MenuItem from '../models/MenuItem.js';


const router = express.Router();

// POST /api/orders - Create new order
router.post('/', async (req, res) => {
  try {
    const { customer, deliveryAddress, items, specialInstructions } = req.body;

    // Validate required fields
    if (!customer || !deliveryAddress || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Customer details, delivery address, and items are required'
      });
    }

    // Validate customer fields
    if (!customer.name || !customer.email || !customer.phone) {
      return res.status(400).json({
        success: false,
        message: 'Customer name, email, and phone are required'
      });
    }

    // Validate delivery address fields
    if (!deliveryAddress.street || !deliveryAddress.area || !deliveryAddress.pincode) {
      return res.status(400).json({
        success: false,
        message: 'Street address, area, and pincode are required'
      });
    }

    // Validate and calculate totals
    let subtotal = 0;
    const validatedItems = [];

    console.log('Processing order items:', items);

    for (const item of items) {
      // Validate ObjectId format
      if (!item.menuItemId || !mongoose.Types.ObjectId.isValid(item.menuItemId)) {
        return res.status(400).json({
          success: false,
          message: `Invalid menu item ID: ${item.menuItemId}`
        });
      }

      // Find menu item in database
      const menuItem = await MenuItem.findById(item.menuItemId);
      if (!menuItem) {
        return res.status(400).json({
          success: false,
          message: `Menu item "${item.name}" not found or has been removed`
        });
      }

      if (!menuItem.isAvailable) {
        return res.status(400).json({
          success: false,
          message: `Menu item "${menuItem.name}" is currently unavailable`
        });
      }

      // Validate quantity
      if (!item.quantity || item.quantity < 1) {
        return res.status(400).json({
          success: false,
          message: `Invalid quantity for item "${menuItem.name}"`
        });
      }

      const itemTotal = menuItem.price * item.quantity;
      subtotal += itemTotal;

      validatedItems.push({
        menuItem: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: item.quantity,
        image: menuItem.image
      });
    }

    const deliveryFee = subtotal >= 300 ? 0 : 30; // Free delivery above 300
    const total = subtotal + deliveryFee;

    // Create new order
    const newOrder = new Order({
      customer: {
        name: customer.name.trim(),
        email: customer.email.trim().toLowerCase(),
        phone: customer.phone.trim()
      },
      deliveryAddress: {
        street: deliveryAddress.street.trim(),
        area: deliveryAddress.area.trim(),
        city: deliveryAddress.city?.trim() || 'Ahmedabad',
        pincode: deliveryAddress.pincode.trim(),
        landmark: deliveryAddress.landmark?.trim() || ''
      },
      items: validatedItems,
      subtotal,
      deliveryFee,
      total,
      specialInstructions: specialInstructions?.trim() || ''
    });

    console.log('Creating order:', newOrder);

    const savedOrder = await newOrder.save();
    await savedOrder.populate('items.menuItem');

    console.log('Order created successfully:', savedOrder.orderNumber);

    // Send order confirmation email (optional - don't fail if email fails)
    try {
      await sendOrderEmail(savedOrder);
      console.log('Order confirmation email sent');
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Continue without failing the order
    }

    res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      data: {
        orderNumber: savedOrder.orderNumber,
        total: savedOrder.total,
        estimatedDeliveryTime: savedOrder.estimatedDeliveryTime,
        status: savedOrder.status
      }
    });

  } catch (error) {
    console.error('Order creation error:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid data format provided'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/orders/:orderNumber - Get order by order number
router.get('/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;

    const order = await Order.findOne({ orderNumber })
      .populate('items.menuItem')
      .select('-__v');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

 res.json({
  success: true,
  data: {
    status: order.status,
    estimatedDeliveryTime: order.estimatedDeliveryTime,
    deliveryAddress: order.deliveryAddress,
     paymentMethod: order.paymentMethod,
    items: order.items.map((item) => ({
      name: item.name || item.menuItem?.name || 'Unnamed Item',
      price: item.price || item.menuItem?.price || 0,
      quantity: item.quantity,
      image: item.image || item.menuItem?.image || ''
    })),
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    totalAmount: order.total
  }
});
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
});

// GET /api/orders - Get all orders (admin only)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, date } = req.query;

    const query = {};
    if (status) query.status = status;
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.createdAt = { $gte: startDate, $lt: endDate };
    }

    const orders = await Order.find(query)
      .populate('items.menuItem')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
});

// PUT /api/orders/:orderNumber/status - Update order status
router.put('/:orderNumber/status', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'preparing', 'out-for-delivery', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const updateData = { status };
    if (status === 'delivered') {
      updateData.actualDeliveryTime = new Date();
    }

    const order = await Order.findOneAndUpdate(
      { orderNumber },
      updateData,
      { new: true, runValidators: true }
    ).populate('items.menuItem');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: order
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
});

export default router;
