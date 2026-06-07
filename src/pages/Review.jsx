import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FileText, ArrowRight, Loader } from 'lucide-react';
import Layout from '../components/Layout';
import AudioRecordingsList from '../components/AudioRecordingsList';
import { generateSettlementReport } from '../services/aiService';
import { fetchAudioRecordings } from '../services/apiService';
import { saveConversation } from '../hooks/useConversationSync';

const Review = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { transcript, parties, refNumber, language, conversationId } = location.state || {
        transcript: [],
        parties: [],
        refNumber: '',
        language: 'English',
        conversationId: null,
    };
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');
    const [audioRecordings, setAudioRecordings] = useState([]);

    useEffect(() => {
        if (!conversationId) return;
        fetchAudioRecordings(conversationId)
            .then(setAudioRecordings)
            .catch(() => {});
    }, [conversationId]);

    const handleGenerateReport = async () => {
        setIsGenerating(true);
        setError('');
        try {
            const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
            const reportData = await generateSettlementReport(transcript, parties, refNumber, date, language);

            if (conversationId) {
                await saveConversation(conversationId, {
                    transcript,
                    report: reportData,
                    status: 'completed',
                });
            }

            navigate('/report', { state: { reportData, refNumber, transcript, conversationId } });
        } catch (err) {
            setError('Failed to generate report. Please try again.');
            console.error(err);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Layout>
            <div className="review-container" style={{ maxWidth: '900px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                    <h2>Step 3: Transcript Verification</h2>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div className="step-indicator active">1</div>
                        <div className="step-indicator active">2</div>
                        <div className="step-indicator active">3</div>
                        <div className="step-indicator">4</div>
                    </div>
                </div>

                {conversationId && audioRecordings.length > 0 && (
                    <div className="card" style={{ marginBottom: '2rem' }}>
                        <AudioRecordingsList
                            conversationId={conversationId}
                            recordings={audioRecordings}
                            title="Party audio recordings"
                        />
                    </div>
                )}

                <div className="card" style={{ marginBottom: '2rem' }}>
                    <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                        <h3>Full Conversation Transcript</h3>
                        <p style={{ color: 'var(--text-secondary)' }}>Please verify the transcript before generating the legal report.</p>
                    </div>

                    <div className="transcript-list">
                        {transcript.length === 0 ? (
                            <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>No transcript data available.</p>
                        ) : (
                            transcript.map((item, index) => (
                                <div key={index} style={{ marginBottom: '1.5rem', borderLeft: `3px solid ${item.role === 'Claimant' ? 'var(--primary)' : 'var(--secondary)'}`, paddingLeft: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                        <strong>{item.speaker} ({item.role})</strong>
                                        <span style={{ fontSize: '0.85rem', color: '#999' }}>{item.timestamp}</span>
                                    </div>
                                    <p style={{ margin: 0 }}>{item.text}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {error && <div style={{ color: 'red', marginBottom: '1rem', textAlign: 'right' }}>{error}</div>}

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        className="btn-primary"
                        onClick={handleGenerateReport}
                        disabled={isGenerating}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 2rem', fontSize: '1.1rem', opacity: isGenerating ? 0.7 : 1 }}
                    >
                        {isGenerating ? (
                            <>
                                <Loader className="spin" size={20} /> Generating AI Report...
                            </>
                        ) : (
                            <>
                                <FileText size={20} /> Generate Final Report <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                </div>
            </div>
            <style>{`
                .step-indicator {
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    background: #eee;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    color: #999;
                }
                .step-indicator.active {
                    background: var(--primary);
                    color: white;
                }
                .spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </Layout>
    );
};
export default Review;
