import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: [true, 'A transaction must have an amount'],
    },
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: [true, 'A transaction must have a type'],
    },
    category: {
      type: String,
      required: [true, 'A transaction must have a category'],
    },
    date: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'A transaction must belong to a user'],
    },
    isDeleted: {
      type: Boolean,
      default: false,
      select: false, // Default is not returning the field in queries
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.index({ user: 1, isDeleted: 1, date: -1 });
transactionSchema.index({ type: 1, category: 1 });
transactionSchema.index({ isDeleted: 1, date: -1 });

// Soft Delete Middleware: hide records where isDeleted is true
transactionSchema.pre(/^find/, function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

export const Transaction = mongoose.model('Transaction', transactionSchema);
