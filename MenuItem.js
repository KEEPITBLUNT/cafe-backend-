import mongoose from 'mongoose';

const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['coffee', 'tea', 'snacks', 'desserts', 'gujarati-specials', 'beverages']
  },
  image: {
    type: String,
    required: [true, 'Image URL is required']
  },
  rating: {
    type: Number,
    min: [0, 'Rating cannot be less than 0'],
    max: [5, 'Rating cannot exceed 5'],
    default: 0
  },
  isVeg: {
    type: Boolean,
    default: true
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  ingredients: [{
    type: String,
    trim: true
  }],
  nutritionalInfo: {
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number
  },
  preparationTime: {
    type: Number, // in minutes
    min: [1, 'Preparation time must be at least 1 minute']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
menuItemSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create some default menu items if collection is empty
menuItemSchema.statics.createDefaults = async function() {
  const count = await this.countDocuments();
  if (count === 0) {
    const defaultItems = [
      {
        name: "MASALA CHAI",
        description: "Traditional Indian spiced tea with cardamom, ginger, and cinnamon",
        price: 25,
        category: "tea",
        image: "https://images.pexels.com/photos/1638280/pexels-photo-1638280.jpeg?auto=compress&cs=tinysrgb&w=400",
        rating: 4.8,
        isVeg: true,
        isPopular: true,
        isAvailable: true
      },
      {
        name: "CAPPUCCINO",
        description: "Rich espresso with steamed milk and velvety foam",
        price: 80,
        category: "coffee",
        image: "https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=400",
        rating: 4.6,
        isVeg: true,
        isPopular: false,
        isAvailable: true
      },
      {
        name: "DHOKLA",
        description: "Steamed Gujarati snack made from fermented rice and chickpea flour",
        price: 45,
        category: "gujarati-specials",
        image: "https://images.pexels.com/photos/5560763/pexels-photo-5560763.jpeg?auto=compress&cs=tinysrgb&w=400",
        rating: 4.9,
        isVeg: true,
        isPopular: true,
        isAvailable: true
      },
      {
        name: "KHANDVI",
        description: "Soft, savory rolls made from gram flour and buttermilk",
        price: 55,
        category: "gujarati-specials",
        image: "https://images.pexels.com/photos/14737/pexels-photo-14737.jpeg?auto=compress&cs=tinysrgb&w=400",
        rating: 4.7,
        isVeg: true,
        isPopular: false,
        isAvailable: true
      },
      {
        name: "COLD COFFEE",
        description: "Chilled coffee with ice cream and whipped cream",
        price: 90,
        category: "coffee",
        image: "https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=400",
        rating: 4.5,
        isVeg: true,
        isPopular: true,
        isAvailable: true
      },
      {
        name: "GULAB JAMUN",
        description: "Soft, spongy milk-based dessert in sugar syrup",
        price: 40,
        category: "desserts",
        image: "https://images.pexels.com/photos/12737080/pexels-photo-12737080.jpeg?auto=compress&cs=tinysrgb&w=400",
        rating: 4.8,
        isVeg: true,
        isPopular: false,
        isAvailable: true
      },
      {
        name: "SAMOSA",
        description: "Crispy fried pastry with spiced potato filling",
        price: 20,
        category: "snacks",
        image: "https://images.pexels.com/photos/14477/pexels-photo-14477.jpeg?auto=compress&cs=tinysrgb&w=400",
        rating: 4.6,
        isVeg: true,
        isPopular: true,
        isAvailable: true
      },
      {
        name: "LATTE",
        description: "Smooth espresso with steamed milk and light foam",
        price: 85,
        category: "coffee",
        image: "https://images.pexels.com/photos/324028/pexels-photo-324028.jpeg?auto=compress&cs=tinysrgb&w=400",
        rating: 4.4,
        isVeg: true,
        isPopular: false,
        isAvailable: true
      }
    ];

    await this.insertMany(defaultItems);
    console.log('✅ Default menu items created');
  }
};

export default mongoose.model('MenuItem', menuItemSchema);