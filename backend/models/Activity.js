import mongoose from 'mongoose';

const ActivitySchema = new mongoose.Schema(
  {
    boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
    cardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Card', default: null },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    entityType: {
      type: String,
      enum: ['board', 'list', 'card', 'comment', 'member', 'checklist', 'attachment'],
      required: true,
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export default mongoose.models.Activity || mongoose.model('Activity', ActivitySchema);
