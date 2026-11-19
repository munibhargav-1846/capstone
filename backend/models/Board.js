import mongoose from 'mongoose';

const BoardSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', maxlength: 600 },
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    background: {
      type: { type: String, enum: ['color', 'gradient', 'image'], default: 'color' },
      value: { type: String, default: '#F1F5F9' },
      label: { type: String, default: 'Slate Mist' },
    },
    isStarredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isArchived: { type: Boolean, default: false },
    lastViewedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.Board || mongoose.model('Board', BoardSchema);
