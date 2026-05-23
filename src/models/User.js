const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    email: {
      type:     String,
      required: [true, 'Email is required'],
      unique:   true,
      lowercase: true,
      trim:     true,
      match:    [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    password: {
      type:     String,
      required: [true, 'Password is required'],
      minlength: 8,
      select:   false, // never returned in queries by default
    },
    googleId: {
      type:   String,
      sparse: true,
    },
    role: {
      type:    String,
      enum:    ['subscriber', 'admin'],
      default: 'subscriber',
    },
    isEmailVerified: {
      type:    Boolean,
      default: false,
    },
    refreshToken: {
      type:   String,
      select: false,
    },
    passwordResetToken:   { type: String, select: false },
    passwordResetExpires: { type: Date,   select: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.refreshToken;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt   = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare plain password to hashed
userSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
