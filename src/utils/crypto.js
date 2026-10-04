import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export const hashPassword = async (password) => {
  return bcrypt.hash(password, 12);
};

export const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

export const generateSecretKey = () => {
  return crypto.randomBytes(32).toString('hex');
};

export const hashFile = (buffer) => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

export const generateShareToken = () => {
  return crypto.randomBytes(16).toString('hex');
};
