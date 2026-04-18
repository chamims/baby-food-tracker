import { useState, useEffect, useCallback } from 'react';
import type { BabyProfile } from '../../utils/profile';
import {
  dbListInvites,
  dbCreateInvite,
  dbRevokeInvite,
  dbLeaveHousehold,
  type HouseholdInvite,
} from '../../utils/supabase';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (profile: BabyProfile) => void;
  initialProfile: BabyProfile;
  userEmail?: string;
  userId?: string;
  householdId?: string | null;
  onSignOut?: () => void;
  onAfterLeave?: () => void;
}

export default function SettingsModal({
  open,
  onClose,
  onSave,
  initialProfile,
  userEmail,
  userId,
  householdId,
  onSignOut,
  onAfterLeave,
}: SettingsModalProps) {
  const [name, setName] = useState(initialProfile.babyName);
  const [dob, setDob] = useState(initialProfile.dob ?? '');
  const [startDate, setStartDate] = useState(initialProfile.startDate ?? '');

  const [invites, setInvites] = useState<HouseholdInvite[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [leaveBusy, setLeaveBusy] = useState(false);
  const [confirmingLeave, setConfirmingLeave] = useState(false);

  const loadInvites = useCallback(async () => {
    if (!householdId) return;
    try {
      setInvites(await dbListInvites(householdId));
    } catch (err) {
      console.error('Failed to list invites:', err);
    }
  }, [householdId]);

  useEffect(() => {
    if (open && householdId) {
      void loadInvites();
    }
  }, [open, householdId, loadInvites]);

  if (!open) return null;

  const handleSave = () => {
    onSave({ babyName: name.trim() || 'Baby', dob: dob || undefined, startDate: startDate || undefined });
    onClose();
  };

  const handleSendInvite = async () => {
    if (!householdId || !userId) return;
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setInviteError('Enter a valid email');
      return;
    }
    setInviteBusy(true);
    setInviteError('');
    try {
      await dbCreateInvite(householdId, email, userId);
      setInviteEmail('');
      await loadInvites();
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === '23505') {
        setInviteError('Already invited — revoke first to re-send');
      } else {
        setInviteError('Failed to create invite');
      }
    } finally {
      setInviteBusy(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await dbRevokeInvite(id);
      setInvites(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      console.error('Failed to revoke invite:', err);
    }
  };

  const handleLeave = async () => {
    setLeaveBusy(true);
    try {
      await dbLeaveHousehold();
      onClose();
      onAfterLeave?.();
    } catch (err) {
      console.error('Failed to leave household:', err);
      setLeaveBusy(false);
    }
  };

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-stone-800 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-stone-700 sticky top-0 bg-white dark:bg-stone-800 z-10">
          <h2 className="font-bold text-gray-800 dark:text-stone-100">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-stone-200 text-2xl leading-none">×</button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-stone-400 uppercase tracking-wide mb-2">Baby</p>
            <label className="block text-sm font-semibold text-gray-700 dark:text-stone-200 mb-1.5">
              Baby's name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Emma"
              className="w-full border border-gray-200 dark:border-stone-600 rounded-xl px-3 py-2.5 text-gray-800 dark:text-stone-100 bg-white dark:bg-stone-700 focus:outline-none focus:border-sage-400 focus:ring-2 focus:ring-sage-100"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-stone-200 mb-1.5">
              Date of birth
            </label>
            <input
              type="date"
              value={dob}
              onChange={e => setDob(e.target.value)}
              className="w-full border border-gray-200 dark:border-stone-600 rounded-xl px-3 py-2.5 text-gray-800 dark:text-stone-100 bg-white dark:bg-stone-700 focus:outline-none focus:border-sage-400 focus:ring-2 focus:ring-sage-100"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-stone-200 mb-1.5">
              Solids start date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full border border-gray-200 dark:border-stone-600 rounded-xl px-3 py-2.5 text-gray-800 dark:text-stone-100 bg-white dark:bg-stone-700 focus:outline-none focus:border-sage-400 focus:ring-2 focus:ring-sage-100"
            />
          </div>

          {householdId && (
            <div className="border-t border-gray-100 dark:border-stone-700 pt-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-stone-400 uppercase tracking-wide mb-2">Household</p>
              <label className="block text-sm font-semibold text-gray-700 dark:text-stone-200 mb-1.5">
                Invite someone by email
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="flex-1 border border-gray-200 dark:border-stone-600 rounded-xl px-3 py-2.5 text-sm text-gray-800 dark:text-stone-100 bg-white dark:bg-stone-700 focus:outline-none focus:border-sage-400 focus:ring-2 focus:ring-sage-100"
                />
                <button
                  onClick={handleSendInvite}
                  disabled={inviteBusy || !inviteEmail.trim()}
                  className="btn-primary px-4 text-sm disabled:opacity-50"
                >
                  {inviteBusy ? '…' : 'Invite'}
                </button>
              </div>
              {inviteError && <p className="text-xs text-red-500 mt-1.5">{inviteError}</p>}
              <p className="text-xs text-gray-500 dark:text-stone-400 mt-2">
                They'll auto-join next time they sign in with that Gmail.
              </p>

              {invites.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-gray-500 dark:text-stone-400 uppercase tracking-wide mb-2">Pending</p>
                  <ul className="space-y-2">
                    {invites.map(inv => (
                      <li key={inv.id} className="flex items-center justify-between text-sm bg-gray-50 dark:bg-stone-700 rounded-lg px-3 py-2">
                        <div className="min-w-0 mr-2">
                          <p className="truncate text-gray-700 dark:text-stone-200">{inv.email}</p>
                          <p className="text-xs text-gray-500 dark:text-stone-400">expires {fmtDate(inv.expiresAt)}</p>
                        </div>
                        <button
                          onClick={() => handleRevoke(inv.id)}
                          className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 flex-shrink-0"
                        >
                          Revoke
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-stone-700">
                {confirmingLeave ? (
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 space-y-2">
                    <p className="text-xs text-red-800 dark:text-red-300">
                      Leave this household? If you're the only member, all data will be deleted. Otherwise data stays for remaining members.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmingLeave(false)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-white dark:bg-stone-700 text-gray-700 dark:text-stone-200 border border-gray-200 dark:border-stone-600"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleLeave}
                        disabled={leaveBusy}
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-500 text-white disabled:opacity-50"
                      >
                        {leaveBusy ? 'Leaving…' : 'Yes, leave'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmingLeave(true)}
                    className="text-xs text-red-500 hover:text-red-600 dark:text-red-400"
                  >
                    Leave household
                  </button>
                )}
              </div>
            </div>
          )}

          {userEmail && onSignOut && (
            <div className="border-t border-gray-100 dark:border-stone-700 pt-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-stone-400 uppercase tracking-wide mb-2">Account</p>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-700 dark:text-stone-200 truncate mr-3">{userEmail}</p>
                <button
                  onClick={() => { onSignOut(); onClose(); }}
                  className="text-sm text-red-500 hover:text-red-600 dark:text-red-400 whitespace-nowrap flex-shrink-0"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 p-4 border-t border-gray-100 dark:border-stone-700 sticky bottom-0 bg-white dark:bg-stone-800">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={handleSave}
            disabled={name.trim() === ''}
            className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
