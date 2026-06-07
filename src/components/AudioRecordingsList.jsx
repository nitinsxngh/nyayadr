import React, { useState } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';
import { getAudioPlayUrl } from '../services/apiService';

const AudioRecordingsList = ({
  conversationId,
  recordings = [],
  title = 'Session recordings',
  emptyMessage = 'No audio recordings for this session.',
}) => {
  const [playingId, setPlayingId] = useState(null);
  const [audioSrc, setAudioSrc] = useState('');
  const [loadingId, setLoadingId] = useState(null);
  const audioRef = React.useRef(null);

  const handlePlay = async (recording) => {
    if (playingId === recording.audioId) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }

    setLoadingId(recording.audioId);
    try {
      let url = recording.playUrl;
      if (!url && conversationId) {
        const data = await getAudioPlayUrl(conversationId, recording.audioId);
        url = data.playUrl;
      }
      setAudioSrc(url);
      setPlayingId(recording.audioId);
      setTimeout(() => audioRef.current?.play(), 50);
    } catch (err) {
      console.warn(err);
    } finally {
      setLoadingId(null);
    }
  };

  if (!recordings.length) {
    return (
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
        {emptyMessage}
      </p>
    );
  }

  return (
    <div>
      <h4 style={{ marginBottom: '0.75rem', fontSize: '0.95rem' }}>{title}</h4>
      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {recordings.map((rec) => (
          <li
            key={rec.audioId}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.5rem 0.75rem',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
              <Volume2 size={16} color="var(--primary)" />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{rec.displayName}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  {rec.role} · {rec.partyName}
                </div>
                <div style={{ color: '#999', fontSize: '0.7rem' }}>
                  {rec.recordedAt
                    ? new Date(rec.recordedAt).toLocaleString()
                    : `ID: ${rec.audioId.slice(0, 8)}…`}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="btn-outline"
              onClick={() => handlePlay(rec)}
              disabled={loadingId === rec.audioId}
              style={{ padding: '0.35rem 0.6rem', flexShrink: 0 }}
              title={playingId === rec.audioId ? 'Pause' : 'Play'}
            >
              {loadingId === rec.audioId ? (
                '…'
              ) : playingId === rec.audioId ? (
                <Pause size={16} />
              ) : (
                <Play size={16} />
              )}
            </button>
          </li>
        ))}
      </ul>
      {audioSrc && (
        <audio
          ref={audioRef}
          src={audioSrc}
          onEnded={() => setPlayingId(null)}
          style={{ display: 'none' }}
        />
      )}
    </div>
  );
};

export default AudioRecordingsList;
