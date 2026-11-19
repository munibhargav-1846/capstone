import mongoose from 'mongoose';

const LabelSchema = new mongoose.Schema(
  {
    boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    color: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Label || mongoose.model('Label', LabelSchema);
