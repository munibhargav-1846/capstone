import mongoose from 'mongoose';

const ChecklistSchema = new mongoose.Schema(
  {
    cardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Card', required: true },
    boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    items: [
      {
        text: { type: String, required: true, trim: true },
        isCompleted: { type: Boolean, default: false },
        position: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.models.Checklist || mongoose.model('Checklist', ChecklistSchema);
