import mongoose from 'mongoose';

const CardSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '' },
    boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
    listId: { type: mongoose.Schema.Types.ObjectId, ref: 'List', required: true },
    position: { type: Number, required: true, default: 0 },
    assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    labels: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Label' }],
    dueDate: { type: Date, default: null },
    isCompleted: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    coverColor: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Card || mongoose.model('Card', CardSchema);
