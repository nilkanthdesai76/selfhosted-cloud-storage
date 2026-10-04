import { useState } from 'react';
import { API_URL } from '../config';
import { getAccessToken } from '../utils/auth';
import Modal from './Modal';
import Alert from './Alert';
import Spinner from './Spinner';

export default function ChangePasswordModal({ isOpen, onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ message: '', type: '' });

  const getStrength = () => {
    let s = 0;
    if (newPassword.length >= 6) s++;
    if (/[A-Z]/.test(newPassword)) s++;
    if (/\d/.test(newPassword)) s++;
    return s;
  };

  const strengthColors = ['', 'bg-red-500 w-1/3', 'bg-yellow-500 w-2/3', 'bg-green-500 w-full'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setAlert({ message: 'Passwords do not match', type: 'error' });
      return;
    }
    if (newPassword.length < 6) {
      setAlert({ message: 'Password must be at least 6 characters', type: 'error' });
      return;
    }

    setLoading(true);
    setAlert({ message: '', type: '' });

    try {
      const response = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAccessToken()}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();

      if (response.ok) {
        setAlert({ message: 'Password changed successfully!', type: 'success' });
        setTimeout(() => {
          onClose();
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setAlert({ message: '', type: '' });
        }, 1500);
      } else {
        setAlert({ message: data.error || 'Failed to change password', type: 'error' });
      }
    } catch {
      setAlert({ message: 'Network error', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🔑 Change Password">
      <Alert message={alert.message} type={alert.type} show={!!alert.message} />
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block mb-2 text-gray-700 font-medium text-sm">Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            className="w-full p-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary"
          />
        </div>
        <div className="mb-4">
          <label className="block mb-2 text-gray-700 font-medium text-sm">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
            className="w-full p-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary"
          />
          <div className="h-1 bg-gray-200 rounded mt-2 overflow-hidden">
            <div className={`h-full transition-all ${strengthColors[getStrength()]}`} />
          </div>
        </div>
        <div className="mb-5">
          <label className="block mb-2 text-gray-700 font-medium text-sm">Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            className="w-full p-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full p-3 bg-gradient-to-br from-primary to-secondary text-white rounded-lg font-semibold hover:-translate-y-0.5 transition disabled:opacity-60"
        >
          {loading ? <>Changing<Spinner /></> : 'Change Password'}
        </button>
      </form>
    </Modal>
  );
}
