import bcrypt from 'bcryptjs';
import { User, Workspace, Card } from '../models/index.js';
import { signToken, sanitizeUser } from '../middleware/auth.js';

export async function register(req, res) {
  try {
    const { name, email, password } = req.body;
    if (!name || !name.trim() || !email || !email.trim() || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
    });

    const slugBase = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'workspace';
    await Workspace.create({
      name: `${name.trim().split(' ')[0]}'s Workspace`,
      description: 'Personal workspace for organizing projects and tasks.',
      slug: `${slugBase}-${Date.now().toString().slice(-4)}`,
      ownerId: user._id,
      visibility: 'team',
      members: [{ userId: user._id, role: 'admin', joinedAt: new Date() }],
    });

    const token = signToken(user._id);
    res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const token = signToken(user._id);
    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function getMe(req, res) {
  res.json({ user: req.user });
}

export async function updateProfile(req, res) {
  try {
    const { name, bio, jobTitle, avatar, themePreference, notificationSettings } = req.body;
    const updates = {};
    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ message: 'Name cannot be empty' });
      updates.name = name.trim();
    }
    if (bio !== undefined) updates.bio = bio;
    if (jobTitle !== undefined) updates.jobTitle = jobTitle;
    if (avatar !== undefined) updates.avatar = avatar;
    if (themePreference === 'light' || themePreference === 'dark') {
      updates.themePreference = themePreference;
    }
    if (notificationSettings) updates.notificationSettings = notificationSettings;

    const updated = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true }).select('-passwordHash');
    res.json({ user: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Valid current password and new password (min 6 chars) required' });
    }
    const user = await User.findById(req.user._id);
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function getAssignedCards(req, res) {
  try {
    const cards = await Card.find({ assignees: req.user._id, isArchived: false })
      .populate('boardId', 'title')
      .populate('listId', 'title')
      .lean();
    const enriched = cards.map((c) => ({
      ...c,
      boardId: c.boardId?._id || c.boardId,
      boardTitle: c.boardId?.title || 'Board',
      listId: c.listId?._id || c.listId,
      listTitle: c.listId?.title || 'List',
    }));
    res.json({ cards: enriched });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
