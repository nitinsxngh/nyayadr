import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, Headphones, Loader, Plus } from 'lucide-react';
import Layout from '../components/Layout';
import AudioRecordingsList from '../components/AudioRecordingsList';
import { fetchAllSessions } from '../services/apiService';

const statusLabel = {
  active: 'In progress',
  in_review: 'In review',
  completed: 'Completed',
};

const SessionsArchive = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchAllSessions()
      .then(setSessions)
      .catch((err) => setError(err.message || 'Failed to load sessions'))
      .finally(() => setLoading(false));
  }, []);

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <Layout>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Headphones size={28} />
              Recorded sessions
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              View and listen to all ADR sessions saved in the system.
            </p>
          </div>
          <Link
            to="/intake"
            className="btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
          >
            <Plus size={18} /> New session
          </Link>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <Loader className="spin" size={32} style={{ marginBottom: '1rem' }} />
            <p>Loading sessions…</p>
          </div>
        )}

        {error && (
          <div className="card" style={{ padding: '1rem', color: '#c62828', background: '#ffebee' }}>
            {error}
          </div>
        )}

        {!loading && !error && sessions.length === 0 && (
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              No sessions recorded yet.
            </p>
            <Link to="/intake" className="btn-primary" style={{ textDecoration: 'none' }}>
              Start first session
            </Link>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {sessions.map((session) => {
            const isOpen = expandedId === session.id;
            return (
              <div key={session.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <button
                  type="button"
                  onClick={() => toggleExpand(session.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem 1.25rem',
                    background: isOpen ? '#f8fafc' : 'var(--surface)',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--primary)' }}>
                      {session.refNumber}
                    </div>
                    <div
                      style={{
                        fontSize: '0.85rem',
                        color: 'var(--text-secondary)',
                        marginTop: '0.25rem',
                      }}
                    >
                      {session.sessionDate} · {session.language} ·{' '}
                      <span
                        style={{
                          background:
                            session.status === 'completed'
                              ? '#e8f5e9'
                              : session.status === 'in_review'
                                ? '#fff8e1'
                                : '#eef2f7',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                        }}
                      >
                        {statusLabel[session.status] || session.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '0.35rem' }}>
                      {session.recordingCount} recording{session.recordingCount !== 1 ? 's' : ''} ·{' '}
                      {session.transcriptCount} transcript line
                      {session.transcriptCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                  {isOpen ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
                </button>

                {isOpen && (
                  <div
                    style={{
                      padding: '1.25rem',
                      borderTop: '1px solid var(--border)',
                      background: 'var(--surface)',
                    }}
                  >
                    <div style={{ marginBottom: '1.25rem' }}>
                      <h4 style={{ marginBottom: '0.5rem', fontSize: '0.95rem' }}>Parties</h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {session.parties?.map((p) => (
                          <span
                            key={p.partyId}
                            style={{
                              fontSize: '0.85rem',
                              padding: '0.35rem 0.75rem',
                              background: '#eef2f7',
                              borderRadius: 'var(--radius-md)',
                            }}
                          >
                            {p.role}: {p.name}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div style={{ marginBottom: '1.25rem' }}>
                      <AudioRecordingsList
                        conversationId={session.id}
                        recordings={session.recordings}
                        title="Audio recordings"
                      />
                    </div>

                    {session.transcript?.length > 0 && (
                      <div>
                        <h4 style={{ marginBottom: '0.75rem', fontSize: '0.95rem' }}>Transcript</h4>
                        <div
                          style={{
                            maxHeight: '280px',
                            overflowY: 'auto',
                            padding: '1rem',
                            background: '#fafbfc',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border)',
                          }}
                        >
                          {session.transcript.map((line, idx) => (
                            <div
                              key={idx}
                              style={{
                                marginBottom: '1rem',
                                borderLeft: '3px solid var(--primary)',
                                paddingLeft: '0.75rem',
                              }}
                            >
                              <div
                                style={{
                                  fontSize: '0.85rem',
                                  fontWeight: 600,
                                  marginBottom: '0.2rem',
                                }}
                              >
                                {line.speaker} ({line.role}) · {line.timestamp}
                              </div>
                              <p style={{ margin: 0, fontSize: '0.95rem' }}>{line.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </Layout>
  );
};

export default SessionsArchive;
