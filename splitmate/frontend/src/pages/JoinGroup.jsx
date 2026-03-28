// =============================================================================
// pages/JoinGroup.jsx — Join a group via invite code
// =============================================================================

import React, { useState } from 'react';
import useAppStore from '../store/appStore.js';
import api from '../utils/api.js';

export default function JoinGroup({ onNavigate, onToast }) {
  const { joinGroup } = useAppStore();
  const [code, setCode]           = useState('');
  const [preview, setPreview]     = useState(null);
  const [loading, setLoading]     = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handlePreview = async () => {
    if (code.trim().length < 4) return;
    setLoading(true);
    try {
      const { group } = await api.groups.preview(code.trim().toUpperCase());
      setPreview(group);
    } catch (err) {
      setPreview(null);
      onToast('Invalid invite code', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    setSubmitting(true);
    try {
      await joinGroup(code.trim().toUpperCase());
      onToast(`Joined ${preview?.name || 'group'}! 🎉`);
      onNavigate('groups');
    } catch (err) {
      if (err.code === 'FREE_LIMIT_REACHED') {
        onNavigate('pro');
      } else {
        onToast(err.message, 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="header">
        <button className="back-btn" onClick={() => onNavigate('groups')}>←</button>
        <h1 className="header-title">Join Group</h1>
      </div>

      <div className="form">
        <div className="form-group">
          <label className="form-label">Enter invite code</label>
          <input
            className="form-input input-large"
            type="text"
            placeholder="e.g. ABC12345"
            value={code}
            onChange={e => { setCode(e.target.value.toUpperCase()); setPreview(null); }}
            onBlur={handlePreview}
            maxLength={10}
            autoFocus
          />
          <p className="form-hint">Ask your friend to share their group invite code from the app</p>
        </div>

        {loading && <div className="loading-hint">Looking up group...</div>}

        {preview && (
          <div className="group-preview-card">
            <div className="preview-avatar">{preview.name.charAt(0)}</div>
            <div>
              <div className="preview-name">{preview.name}</div>
              <div className="preview-meta">
                {preview.member_count} members · {preview.currency}
              </div>
              {preview.description && (
                <div className="preview-desc">{preview.description}</div>
              )}
            </div>
          </div>
        )}

        <button
          className="btn btn-primary btn-full"
          onClick={preview ? handleJoin : handlePreview}
          disabled={code.length < 4 || submitting}
        >
          {submitting ? 'Joining...' : preview ? 'Join Group 🎉' : 'Find Group'}
        </button>
      </div>
    </div>
  );
}
