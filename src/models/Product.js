const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      minlength: [2, 'Product name must be at least 2 characters'],
      maxlength: [120, 'Product name cannot exceed 120 characters'],
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      trim: true,
      uppercase: true,
      minlength: [2, 'SKU must be at least 2 characters'],
      maxlength: [40, 'SKU cannot exceed 40 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      maxlength: [80, 'Category cannot exceed 80 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
      validate: { validator: Number.isFinite, message: 'Price must be a finite number' },
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      validate: [Number.isInteger, 'Quantity must be a whole number'],
    },
    reorderLevel: {
      type: Number,
      default: 10,
      min: [0, 'Reorder level cannot be negative'],
      validate: [Number.isInteger, 'Reorder level must be a whole number'],
    },
    supplier: {
      type: String,
      trim: true,
      maxlength: [120, 'Supplier cannot exceed 120 characters'],
      default: '',
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

productSchema.virtual('stockValue').get(function getStockValue() {
  return this.price * this.quantity;
});

productSchema.index({ name: 'text', sku: 'text', category: 'text', supplier: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ quantity: 1, reorderLevel: 1 });

module.exports = mongoose.model('Product', productSchema);
