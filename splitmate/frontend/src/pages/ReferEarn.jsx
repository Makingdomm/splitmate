import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function ReferEarn({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.referrals.me();
      setStats(data);
    } catch (err) {
      setError('Failed to load referral info');
    } finally {
      setLoading(false);
    }
  };

  const botUsername = 'SplitMateExpenseBot';
  const referralLink = stats ? `https://t.me/${botUsername}?start=ref_${stats.referral_code}` : '';

  const handleCopy = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleShare = () => {
    if (!referralLink) return;
    const text = `💸 Split expenses effortlessly with SplitMate — right inside Telegram!\n\nNo app needed. Track who owes what, scan receipts with AI, and settle in crypto.\n\nJoin here: ${referralLink}`;
    window.Telegram?.WebApp?.openTelegramLink(
      `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text)}`
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: '#fff', padding: '16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #eee', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => onNavigate(-1)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#007AFF', padding: 0, lineHeight: 1 }}>←</button>
        <div>
          <div style={{ fontWeight: 700, fontSize: 17 }}>Refer & Earn</div>
          <div style={{ fontSize: 12, color: '#888' }}>Earn free Pro months</div>
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #4a7c59 0%, #2d5a3d 100%)', margin: 16, borderRadius: 16, padding: '24px 20px', color: '#fff', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🎁</div>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Invite friends, earn free Pro</div>
        <div style={{ fontSize: 14, opacity: 0.85, lineHeight: 1.5 }}>
          For every friend who upgrades to Pro,<br />
          you get <strong>1 free month of SplitMate Pro</strong>
        </div>
      </div>

      {/* Stats */}
      {!loading && stats && (
        <div style={{ display: 'flex', gap: 10, margin: '0 16px 16px' }}>
          {[
            { value: stats.total_referrals, label: 'Friends invited', color: '#4a7c59' },
            { value: stats.pending_referrals, label: 'Pending upgrade', color: '#FF9500' },
            { value: stats.free_months_earned, label: 'Free months earned', color: '#34C759' },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, background: '#fff', borderRadius: 14, padding: '14px 10px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 2, lineHeight: 1.3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* How it works */}
      <div style={{ background: '#fff', margin: '0 16px 16px', borderRadius: 16, padding: '20px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: '#888', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 }}>HOW IT WORKS</div>
        {[
          'Share your unique referral link with friends',
          'They sign up and start using SplitMate',
          'When they upgrade to Pro, you get 1 free month automatically',
        ].map((text, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: i < 2 ? 16 : 0 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: '#4a7c59', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
            <div style={{ fontSize: 15, color: '#333', lineHeight: 1.4, paddingTop: 4 }}>{text}</div>
          </div>
        ))}
        <div style={{ marginTop: 16, background: '#f5f5f5', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#555', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>♾️</span><span>No limit — refer as many friends as you want!</span>
        </div>
      </div>

      {/* Referral link box */}
      <div style={{ background: '#fff', margin: '0 16px 16px', borderRadius: 16, padding: '20px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: '#888', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>YOUR REFERRAL LINK</div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: '#aaa', fontSize: 14 }}>Loading your link…</div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '12px 0', color: '#FF3B30', fontSize: 14 }}>{error}
            <button onClick={loadStats} style={{ display: 'block', margin: '10px auto 0', background: 'none', border: 'none', color: '#007AFF', fontSize: 14, cursor: 'pointer' }}>Try again</button>
          </div>
        ) : (
          <>
            <div style={{ background: '#f5f5f5', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#555', wordBreak: 'break-all', marginBottom: 10, lineHeight: 1.5 }}>
              {referralLink}
            </div>
            {stats?.referral_code && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <span style={{ fontSize: 13, color: '#888' }}>Your code:</span>
                <span style={{ background: '#4a7c59', color: '#fff', borderRadius: 6, padding: '3px 10px', fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>{stats.referral_code}</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleCopy} style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: 'none', background: copied ? '#34C759' : '#f0f0f0', color: copied ? '#fff' : '#333', fontSize: 15, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                {copied ? '✅ Copied!' : <span style={{display:'flex',alignItems:'center',gap:6}}><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 2v4"/><path d="M8 2h8"/><path d="M9 12h6"/><path d="M9 16h6"/></svg> Copy link</span>}
              </button>
              <button onClick={handleShare} style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: 'none', background: '#4a7c59', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                📤 Share
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
