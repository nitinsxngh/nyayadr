import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Trash2, ArrowRight, Loader } from 'lucide-react';
import Layout from '../components/Layout';
import { createConversation } from '../services/apiService';

const Intake = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        refNumber: 'ADR/GZB/RT/2026/001',
        date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
        language: 'English',
        consent: false
    });

    const [parties, setParties] = useState([
        { id: 1, role: 'Claimant', name: 'Party P1', mobile: '' },
        { id: 2, role: 'Respondent', name: 'Party P2', mobile: '' }
    ]);
    const [isStarting, setIsStarting] = useState(false);
    const [startError, setStartError] = useState('');

    const handlePartyChange = (id, field, value) => {
        setParties(parties.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const addParty = () => {
        const newId = parties.length + 1;
        setParties([...parties, { id: newId, role: 'Witness', name: `Party P${newId}`, mobile: '' }]);
    };

    const removeParty = (id) => {
        setParties(parties.filter(p => p.id !== id));
    };

    const handleStartSession = async () => {
        if (!formData.consent) {
            alert("Please provide the AI ADR consent.");
            return;
        }

        setIsStarting(true);
        setStartError('');

        try {
            const conversationId = await createConversation({
                refNumber: formData.refNumber,
                sessionDate: formData.date,
                language: formData.language,
                consent: formData.consent,
                parties,
            });

            navigate('/session', {
                state: {
                    ...formData,
                    parties,
                    conversationId,
                    date: formData.date,
                },
            });
        } catch (err) {
            setStartError(err.message || 'Failed to start session. Is the API server running?');
        } finally {
            setIsStarting(false);
        }
    };

    return (
        <Layout>
            <div className="intake-container">
                <h2>Case Intake Details</h2>
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label>ADR Reference Number</label>
                            <input
                                type="text"
                                value={formData.refNumber}
                                onChange={e => setFormData({ ...formData, refNumber: e.target.value })}
                            />
                        </div>
                        <div>
                            <label>Date</label>
                            <input
                                type="text"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                        <div>
                            <label>Report Language</label>
                            <select
                                value={formData.language}
                                onChange={e => setFormData({ ...formData, language: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius)',
                                    fontSize: '1rem',
                                    backgroundColor: 'white'
                                }}
                            >
                                <option value="English">English</option>
                                <option value="Hindi">Hindi (हिंदी)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3>Parties Involved</h3>
                    <button className="btn-outline" onClick={addParty} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <UserPlus size={18} /> Add Party
                    </button>
                </div>

                <div className="parties-list" style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
                    {parties.map((party) => (
                        <div key={party.id} className="card party-card">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 2fr auto', gap: '1rem', alignItems: 'end' }}>
                                <div>
                                    <label>Role</label>
                                    <select
                                        value={party.role}
                                        onChange={e => handlePartyChange(party.id, 'role', e.target.value)}
                                    >
                                        <option>Claimant</option>
                                        <option>Respondent</option>
                                        <option>Witness</option>
                                    </select>
                                </div>
                                <div>
                                    <label>Name</label>
                                    <input
                                        type="text"
                                        value={party.name}
                                        onChange={e => handlePartyChange(party.id, 'name', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label>Mobile Number</label>
                                    <input
                                        type="tel"
                                        value={party.mobile}
                                        onChange={e => handlePartyChange(party.id, 'mobile', e.target.value)}
                                        placeholder="+91..."
                                    />
                                </div>
                                <button
                                    onClick={() => removeParty(party.id)}
                                    style={{ color: '#e74c3c', padding: '0.5rem', background: 'transparent' }}
                                    title="Remove Party"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="card consent-section" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: '#eef2f7' }}>
                    <input
                        type="checkbox"
                        checked={formData.consent}
                        onChange={e => setFormData({ ...formData, consent: e.target.checked })}
                        style={{ width: 'auto', marginBottom: 0 }}
                        id="consent-check"
                    />
                    <label htmlFor="consent-check" style={{ fontWeight: 500 }}>
                        I hereby confirm that all parties have consented to the AI-Assisted ADR facilitation process.
                    </label>
                </div>

                {startError && (
                    <div style={{ color: '#c62828', marginTop: '1rem', textAlign: 'right' }}>{startError}</div>
                )}

                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        className="btn-primary"
                        onClick={handleStartSession}
                        disabled={isStarting}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', padding: '0.75rem 1.5rem', opacity: isStarting ? 0.7 : 1 }}
                    >
                        {isStarting ? (
                            <>
                                <Loader className="spin" size={20} /> Saving case…
                            </>
                        ) : (
                            <>
                                Start Voice Session <ArrowRight size={20} />
                            </>
                        )}
                    </button>
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

export default Intake;
