import React from 'react';
import useAppStore from '../store/appStore.js';

export default function GroupList({ onNavigate, onToast }) {
  const { groups, user, paymentStatus, setActiveGroup } = useAppStore();

  const handleGroupClick = async (group) => {
    await setActiveGroup(group);
    onNavigate('group-detail');
  };

  const totalNet = groups.reduce((sum, g) => {
    return sum + parseFloat(g.total_lent || 0) - parseFloat(g.total_owed || 0);
  }, 0);

  const isPositive = totalNet > 0.01;
  const isNegative = totalNet < -0.01;
  const summaryText = isPositive
    ? `You're owed $${totalNet.toFixed(2)}`
    : isNegative
    ? `You owe $${Math.abs(totalNet).toFixed(2)}`
    : 'All settled up';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #060818 0%, #0a0f2e 40%, #060818 100%)',
      padding: '0 16px 120px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes shine-btn {
          0%   { left: -100%; }
          28%  { left: 130%; }
          100% { left: 130%; }
        }
        .group-row:active { transform: scale(0.985); }
        .new-group-btn:active { transform: scale(0.97); }
        .join-btn:active { transform: scale(0.97); }
      `}</style>

      {/* Ambient glows */}
      <div style={{ position:'absolute', top:-80, left:'50%', transform:'translateX(-50%)', width:400, height:400, background:'radial-gradient(circle, rgba(59,110,246,0.14) 0%, transparent 65%)', borderRadius:'50%', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:100, right:-60, width:280, height:280, background:'radial-gradient(circle, rgba(245,176,30,0.07) 0%, transparent 65%)', borderRadius:'50%', pointerEvents:'none' }} />

      <div style={{ position:'relative', zIndex:1 }}>

        {/* ── Header ── */}
        <div style={{ display:'flex', alignItems:'center', gap:14, paddingTop:28, paddingBottom:20 }}>
          <img
            src="https://media.base44.com/images/public/69c82e5c9cc68a413bb16ff9/ee1057a35_generated_image.png"
            alt="SplitMate"
            style={{
              width:48, height:48, borderRadius:16, flexShrink:0,
              boxShadow:'0 4px 16px rgba(79,142,247,0.4)',
              objectFit:'cover',
            }}
          />
          <div>
            <h1 style={{ fontSize:22, fontWeight:900, color:'#fff', letterSpacing:-0.3, marginBottom:2 }}>SplitMate</h1>
            <p style={{ fontSize:13, color:'#6070a0', fontWeight:500 }}>
              {user ? `Hey, ${user.first_name || user.username}! 👋` : 'Your expense groups'}
              {paymentStatus?.isPro && (
                <span style={{
                  marginLeft:8, background:'linear-gradient(135deg,rgba(245,176,30,0.2),rgba(245,176,30,0.1))',
                  border:'1px solid rgba(245,176,30,0.4)', color:'#f5c842',
                  fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20,
                }}>⭐ Pro</span>
              )}
            </p>
          </div>
        </div>

        {/* ── Balance Hero ── */}
        <div style={{
          borderRadius:20, padding:'20px 20px',
          background: isPositive
            ? 'linear-gradient(135deg, rgba(34,212,122,0.12) 0%, rgba(34,212,122,0.05) 100%)'
            : isNegative
            ? 'linear-gradient(135deg, rgba(240,82,82,0.12) 0%, rgba(240,82,82,0.05) 100%)'
            : 'rgba(255,255,255,0.04)',
          border: isPositive
            ? '1px solid rgba(34,212,122,0.25)'
            : isNegative
            ? '1px solid rgba(240,82,82,0.25)'
            : '1px solid rgba(255,255,255,0.07)',
          marginBottom:24, position:'relative', overflow:'hidden',
        }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background: isPositive ? 'linear-gradient(90deg,transparent,rgba(34,212,122,0.4),transparent)' : isNegative ? 'linear-gradient(90deg,transparent,rgba(240,82,82,0.4),transparent)' : 'linear-gradient(90deg,transparent,rgba(79,142,247,0.3),transparent)' }} />
          <div style={{ fontSize:11, fontWeight:700, color:'#4a5080', textTransform:'uppercase', letterSpacing:0.8, marginBottom:10 }}>Overall Balance</div>
          <div style={{
            fontSize:32, fontWeight:900, letterSpacing:-1, marginBottom:6,
            color: isPositive ? '#22d47a' : isNegative ? '#f05252' : '#fff',
          }}>
            {totalNet === 0 ? '—' : (isPositive ? '+' : '') + '$' + Math.abs(totalNet).toFixed(2)}
          </div>
          <div style={{ fontSize:13, color: isPositive ? '#22d47a' : isNegative ? '#f05252' : '#4a5080', fontWeight:500 }}>
            {isPositive ? '📈' : isNegative ? '📉' : '✓'} {summaryText}
          </div>
        </div>

        {/* ── Groups Section ── */}
        {groups.length > 0 && (
          <div style={{ fontSize:11, fontWeight:700, color:'#3d4870', textTransform:'uppercase', letterSpacing:0.8, marginBottom:12 }}>
            Your Groups
          </div>
        )}

        {groups.length === 0 ? (
          <div style={{
            textAlign:'center', padding:'48px 24px',
            background:'rgba(255,255,255,0.03)',
            border:'1px solid rgba(255,255,255,0.06)',
            borderRadius:20, marginBottom:24,
          }}>
            <div style={{ fontSize:48, marginBottom:14 }}>👥</div>
            <h3 style={{ fontSize:18, fontWeight:800, color:'#c8d0f0', marginBottom:8 }}>No groups yet</h3>
            <p style={{ fontSize:14, color:'#4a5080', lineHeight:1.7 }}>
              Create a group to start splitting expenses with friends or travel mates
            </p>
          </div>
        ) : (
          <div style={{
            background:'rgba(255,255,255,0.03)',
            border:'1px solid rgba(255,255,255,0.06)',
            borderRadius:20, padding:'4px 0', marginBottom:20,
          }}>
            {groups.map((group, i) => {
              const net = parseFloat(group.total_lent || 0) - parseFloat(group.total_owed || 0);
              const isOwed = net > 0.01;
              const isOwing = net < -0.01;
              return (
                <div
                  key={group.id}
                  className="group-row"
                  onClick={() => handleGroupClick(group)}
                  style={{
                    display:'flex', alignItems:'center', gap:14, padding:'14px 16px',
                    borderBottom: i < groups.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    cursor:'pointer', transition:'all 0.15s',
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width:44, height:44, borderRadius:14, flexShrink:0,
                    background:'linear-gradient(135deg, rgba(79,142,247,0.3) 0%, rgba(106,94,247,0.3) 100%)',
                    border:'1px solid rgba(79,142,247,0.25)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:18, fontWeight:900, color:'#7ab4ff',
                  }}>
                    {group.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:15, fontWeight:700, color:'#e8eeff', marginBottom:3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {group.name}
                    </div>
                    <div style={{ fontSize:12, color:'#4a5080', fontWeight:500 }}>
                      {group.member_count} member{group.member_count !== 1 ? 's' : ''} · {group.currency}
                    </div>
                  </div>

                  {/* Balance */}
                  <div style={{
                    fontSize:14, fontWeight:800, flexShrink:0,
                    color: isOwed ? '#22d47a' : isOwing ? '#f05252' : '#3d4870',
                  }}>
                    {Math.abs(net) < 0.01
                      ? <span style={{ fontSize:18, color:'#22d47a' }}>✓</span>
                      : <>{net > 0 ? '+' : ''}{net.toFixed(2)}</>
                    }
                  </div>

                  {/* Chevron */}
                  <div style={{ color:'#2a3060', fontSize:16, flexShrink:0 }}>›</div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Action Buttons ── */}
        <button
          className="new-group-btn"
          onClick={() => onNavigate('create-group')}
          style={{
            width:'100%', height:56, marginBottom:12,
            background:'linear-gradient(135deg, #4f8ef7 0%, #6a5ef7 100%)',
            border:'none', borderRadius:18,
            fontSize:16, fontWeight:800, color:'#fff',
            cursor:'pointer', letterSpacing:0.2,
            boxShadow:'0 4px 20px rgba(79,142,247,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
            position:'relative', overflow:'hidden',
            transition:'transform 0.1s',
          }}
        >
          <div style={{ position:'absolute', top:0, left:'-100%', width:'60%', height:'100%', background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)', transform:'skewX(-20deg)', animation:'shine-btn 4s infinite' }} />
          + New Group
        </button>

        <button
          className="join-btn"
          onClick={() => onNavigate('join-group')}
          style={{
            width:'100%', height:52,
            background:'rgba(255,255,255,0.05)',
            border:'1px solid rgba(255,255,255,0.10)',
            borderRadius:18,
            fontSize:15, fontWeight:700, color:'#7a8ab8',
            cursor:'pointer', letterSpacing:0.1,
            transition:'transform 0.1s',
          }}
        >
          Join with Code
        </button>

        {/* ── Pro upsell banner ── */}
        {!paymentStatus?.isPro && groups.length >= 2 && (
          <div
            onClick={() => onNavigate('pro')}
            style={{
              marginTop:20, borderRadius:16, padding:'14px 18px',
              background:'linear-gradient(135deg, rgba(245,176,30,0.12) 0%, rgba(245,176,30,0.05) 100%)',
              border:'1px solid rgba(245,176,30,0.25)',
              display:'flex', alignItems:'center', gap:12, cursor:'pointer',
            }}
          >
            <span style={{ fontSize:22 }}>⭐</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#f5c842', marginBottom:2 }}>Upgrade to Pro</div>
              <div style={{ fontSize:12, color:'#7a6020' }}>Unlimited groups + AI features →</div>
            </div>
            <span style={{ color:'#7a6020', fontSize:18 }}>›</span>
          </div>
        )}
      </div>
    </div>
  );
}
