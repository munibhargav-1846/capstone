import mongoose from 'mongoose';

const BoardMemberSchema = new mongoose.Schema(
  {
    boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['admin', 'member', 'viewer'], default: 'member' },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

BoardMemberSchema.index({ boardId: 1, userId: 1 }, { unique: true });

export default mongoose.models.BoardMember || mongoose.model('BoardMember', BoardMemberSchema);
