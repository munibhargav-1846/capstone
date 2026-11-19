import { Workspace, Board, BoardMember } from '../models/index.js';

export async function getWorkspaceRole(workspaceId, userId) {
  const ws = await Workspace.findById(workspaceId);
  if (!ws) return null;
  if (String(ws.ownerId) === String(userId)) return 'admin';
  const member = ws.members.find((m) => String(m.userId) === String(userId));
  return member ? member.role : null;
}

export async function getBoardRole(boardId, userId) {
  const board = await Board.findById(boardId);
  if (!board) return null;
  if (String(board.ownerId) === String(userId)) return 'admin';
  const bm = await BoardMember.findOne({ boardId, userId });
  if (bm) return bm.role;
  return getWorkspaceRole(board.workspaceId, userId);
}

export function canEdit(role) {
  return role === 'admin' || role === 'member';
}

export function isAdmin(role) {
  return role === 'admin';
}
