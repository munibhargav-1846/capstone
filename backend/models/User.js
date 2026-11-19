import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    avatar: { type: String, default: '' },
    bio: { type: String, default: '', maxlength: 300 },
    jobTitle: { type: String, default: '', maxlength: 80 },
    themePreference: { type: String, enum: ['light', 'dark'], default: 'light' },
    notificationSettings: {
      emailReminders: { type: Boolean, default: true },
      boardUpdates: { type: Boolean, default: true },
      mentions: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model('User', UserSchema);
