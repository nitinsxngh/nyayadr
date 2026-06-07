import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Mic, MicOff, Save, StopCircle, Loader } from 'lucide-react';
import Layout from '../components/Layout';
import AudioRecordingsList from '../components/AudioRecordingsList';
import { useConversationSync, saveConversation } from '../hooks/useConversationSync';
import { fetchAudioRecordings, uploadPartyAudio } from '../services/apiService';
import { transcribeAudio, fetchAIStatus } from '../services/aiService';

const SPEECH_LANG = { English: 'en-IN', Hindi: 'hi-IN' };
const MAX_NETWORK_RETRIES = 3;
const CHUNK_MS = 4500;

const speechErrorMessage = (error) => {
    switch (error) {
        case 'network':
            return 'Browser speech service blocked on this network. Switching to AI transcription…';
        case 'not-allowed':
            return 'Microphone access denied. Allow microphone permissions for this site in your browser.';
        case 'no-speech':
            return 'No speech detected. Try speaking closer to the microphone.';
        case 'audio-capture':
            return 'No microphone found. Connect a microphone and try again.';
        case 'service-not-allowed':
            return 'Speech recognition is not allowed on this page. Use Chrome over HTTPS or localhost.';
        default:
            return `Speech recognition error: ${error}`;
    }
};

const Session = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { parties: initialParties, refNumber, language, conversationId } = location.state || {
        parties: [
            { id: 1, role: 'Claimant', name: 'Ajit' },
            { id: 2, role: 'Respondent', name: 'Nirmal' }
        ],
        refNumber: 'ADR/TEST/001',
        language: 'English'
    };

    const [activePartyId, setActivePartyId] = useState(null);
    const [transcript, setTranscript] = useState([]);
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [useServerAI, setUseServerAI] = useState(false);
    const [manualText, setManualText] = useState('');
    const [mode, setMode] = useState('browser');
    const [audioRecordings, setAudioRecordings] = useState([]);
    const [isUploadingAudio, setIsUploadingAudio] = useState(false);

    const recognitionRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const archiveChunksRef = useRef({});
    const archiveMimeRef = useRef('audio/webm');
    const activePartyIdRef = useRef(null);
    const networkRetryCountRef = useRef(0);
    const transcribingRef = useRef(false);
    const chunkQueueRef = useRef([]);
    const snapshotTimerRef = useRef(null);
    const isFinalizingRef = useRef(false);
    const scrollRef = useRef(null);

    const fileExt = (mime) => {
        if (mime?.includes('mp4')) return 'mp4';
        if (mime?.includes('ogg')) return 'ogg';
        return 'webm';
    };

    useEffect(() => {
        activePartyIdRef.current = activePartyId;
    }, [activePartyId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [transcript]);

    useConversationSync(conversationId, transcript, Boolean(conversationId));

    useEffect(() => {
        fetchAIStatus().then((status) => {
            if (status.transcriptionAvailable) {
                setUseServerAI(true);
                const providers = [
                    status.gemini && 'Gemini',
                    status.openai && 'OpenAI fallback',
                ].filter(Boolean);
                setInfo(
                    `AI transcription active (${providers.join(' + ')}). Speak in short phrases; text appears every few seconds.`
                );
            }
        });
    }, []);

    useEffect(() => {
        if (!conversationId) return;
        fetchAudioRecordings(conversationId)
            .then(setAudioRecordings)
            .catch((err) => console.warn('Could not load recordings:', err.message));
    }, [conversationId]);

    const appendTranscript = useCallback((partyId, text) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        const party = initialParties.find(p => p.id === partyId);
        setTranscript(prev => [...prev, {
            speaker: party ? party.name : 'Unknown',
            role: party ? party.role : '',
            text: trimmed,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        }]);
    }, [initialParties]);

    const processChunkQueue = useCallback(async () => {
        if (transcribingRef.current || chunkQueueRef.current.length === 0) return;
        transcribingRef.current = true;
        setIsTranscribing(true);

        while (chunkQueueRef.current.length > 0) {
            const { blob, partyId } = chunkQueueRef.current.shift();
            if (activePartyIdRef.current !== partyId) continue;
            try {
                const text = await transcribeAudio(blob, language);
                if (text && activePartyIdRef.current === partyId) {
                    appendTranscript(partyId, text);
                    setError('');
                }
            } catch (err) {
                console.warn('Gemini transcription failed:', err);
                setError(`Transcription failed: ${err.message}. Check API key and network.`);
                break;
            }
        }

        transcribingRef.current = false;
        setIsTranscribing(false);
    }, [language, appendTranscript]);

    const pushArchiveChunk = useCallback((partyId, blob) => {
        if (!blob?.size) return;
        if (!archiveChunksRef.current[partyId]) archiveChunksRef.current[partyId] = [];
        archiveChunksRef.current[partyId].push(blob);
    }, []);

    const refreshAudioList = useCallback(async () => {
        if (!conversationId) return;
        try {
            const list = await fetchAudioRecordings(conversationId);
            setAudioRecordings(list);
        } catch (err) {
            console.warn('Could not refresh recordings:', err.message);
        }
    }, [conversationId]);

    const uploadPartySnapshot = useCallback(async (partyId, { clearChunks = false } = {}) => {
        if (!partyId || !conversationId) return false;
        const party = initialParties.find((p) => p.id === partyId);
        if (!party) return false;

        const chunkList = [...(archiveChunksRef.current[partyId] || [])];
        if (!chunkList.length) return false;

        const mime = archiveMimeRef.current;
        const blob = new Blob(chunkList, { type: mime });
        if (blob.size < 100) return false;

        setIsUploadingAudio(true);
        try {
            const formData = new FormData();
            formData.append(
                'audio',
                blob,
                `${party.role}-${party.name}.${fileExt(mime)}`
            );
            formData.append('partyId', String(party.id));
            formData.append('role', party.role);
            formData.append('partyName', party.name);
            await uploadPartyAudio(conversationId, formData);
            await refreshAudioList();
            if (clearChunks) delete archiveChunksRef.current[partyId];
            return true;
        } catch (err) {
            setError(`Audio upload failed: ${err.message}`);
            return false;
        } finally {
            setIsUploadingAudio(false);
        }
    }, [conversationId, initialParties, refreshAudioList]);

    const scheduleSnapshotUpload = useCallback((partyId) => {
        if (!conversationId || !partyId) return;
        clearTimeout(snapshotTimerRef.current);
        snapshotTimerRef.current = setTimeout(() => {
            uploadPartySnapshot(partyId, { clearChunks: false });
        }, 5000);
    }, [conversationId, uploadPartySnapshot]);

    const releaseMediaStream = useCallback(() => {
        mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
        setIsRecording(false);
    }, []);

    const finalizePartyAudio = useCallback(async (partyId) => {
        if (!partyId || !conversationId || isFinalizingRef.current) return;
        isFinalizingRef.current = true;
        clearTimeout(snapshotTimerRef.current);

        try {
            const recorder = mediaRecorderRef.current;
            if (recorder && recorder.state === 'recording') {
                await new Promise((resolve) => {
                    recorder.onstop = () => resolve();
                    try {
                        recorder.stop();
                    } catch {
                        resolve();
                    }
                });
            }
            await uploadPartySnapshot(partyId, { clearChunks: true });
        } finally {
            isFinalizingRef.current = false;
        }
    }, [conversationId, uploadPartySnapshot]);

    const stopSpeechOnly = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
    }, []);

    const startGeminiRecording = useCallback(async (partyId) => {
        if (!useServerAI) {
            setError('AI transcription not configured. Set GEMINI_API_KEY or OPENAI_API_KEY in server .env.');
            return;
        }

        releaseMediaStream();
        stopSpeechOnly();
        chunkQueueRef.current = [];
        archiveChunksRef.current[partyId] = [];

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : MediaRecorder.isTypeSupported('audio/webm')
                    ? 'audio/webm'
                    : '';

            archiveMimeRef.current = mimeType || 'audio/webm';

            const recorder = mimeType
                ? new MediaRecorder(stream, { mimeType })
                : new MediaRecorder(stream);

            recorder.ondataavailable = (event) => {
                if (activePartyIdRef.current !== partyId) return;
                pushArchiveChunk(partyId, event.data);
                scheduleSnapshotUpload(partyId);
                if (event.data.size > 500) {
                    chunkQueueRef.current.push({ blob: event.data, partyId });
                    processChunkQueue();
                }
            };

            recorder.onerror = () => {
                setError('Recording error. Try selecting the party again.');
                setIsRecording(false);
            };

            recorder.onstart = () => {
                setIsRecording(true);
                setError('');
            };

            mediaRecorderRef.current = recorder;
            recorder.start(CHUNK_MS);
            setMode('gemini');
            setInfo('AI transcription active — speak clearly; lines appear every few seconds.');
        } catch (err) {
            setError(
                err.name === 'NotAllowedError'
                    ? speechErrorMessage('not-allowed')
                    : `Could not access microphone: ${err.message}`
            );
            setIsRecording(false);
        }
    }, [releaseMediaStream, stopSpeechOnly, processChunkQueue, pushArchiveChunk, scheduleSnapshotUpload, useServerAI]);

    const startBrowserArchiveRecording = useCallback(async (partyId) => {
        archiveChunksRef.current[partyId] = [];

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : MediaRecorder.isTypeSupported('audio/webm')
                    ? 'audio/webm'
                    : '';

            archiveMimeRef.current = mimeType || 'audio/webm';

            const recorder = mimeType
                ? new MediaRecorder(stream, { mimeType })
                : new MediaRecorder(stream);

            recorder.ondataavailable = (event) => {
                if (activePartyIdRef.current === partyId) {
                    pushArchiveChunk(partyId, event.data);
                    scheduleSnapshotUpload(partyId);
                }
            };

            recorder.onstart = () => setIsRecording(true);

            mediaRecorderRef.current = recorder;
            recorder.start(CHUNK_MS);
        } catch (err) {
            setError(
                err.name === 'NotAllowedError'
                    ? speechErrorMessage('not-allowed')
                    : `Could not access microphone: ${err.message}`
            );
        }
    }, [pushArchiveChunk, scheduleSnapshotUpload]);

    const switchToGemini = useCallback((partyId) => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        setMode('gemini');
        startGeminiRecording(partyId);
    }, [startGeminiRecording]);

    const stopRecognition = useCallback(() => {
        stopSpeechOnly();
        releaseMediaStream();
    }, [stopSpeechOnly, releaseMediaStream]);

    const startBrowserRecognition = useCallback((partyId) => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            if (useServerAI) {
                switchToGemini(partyId);
                return;
            }
            setError('Browser does not support Speech Recognition. Please use Chrome.');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = SPEECH_LANG[language] || 'en-IN';

        recognition.onstart = () => {
            networkRetryCountRef.current = 0;
            setIsRecording(true);
            setError('');
            setInfo('Browser speech recognition active.');
        };

        recognition.onerror = (event) => {
            const { error: err } = event;
            if (err === 'aborted') return;

            if (
                err === 'network' &&
                networkRetryCountRef.current < MAX_NETWORK_RETRIES &&
                activePartyIdRef.current === partyId
            ) {
                networkRetryCountRef.current += 1;
                setError(`Connection issue. Retrying (${networkRetryCountRef.current}/${MAX_NETWORK_RETRIES})…`);
                setTimeout(() => {
                    if (activePartyIdRef.current === partyId && recognitionRef.current === recognition) {
                        try {
                            recognition.start();
                        } catch {
                            if (useServerAI) switchToGemini(partyId);
                            else setError(speechErrorMessage('network'));
                        }
                    }
                }, 1500);
                return;
            }

            if (err === 'network' && useServerAI) {
                switchToGemini(partyId);
                return;
            }

            if (err !== 'no-speech') console.warn('Speech recognition error:', err);
            setError(speechErrorMessage(err));
            setIsRecording(false);
        };

        recognition.onend = () => {
            setIsRecording(false);
            if (mode !== 'browser') return;
            if (activePartyIdRef.current === partyId && recognitionRef.current === recognition) {
                try {
                    recognition.start();
                } catch {
                    // ignore
                }
            }
        };

        recognition.onresult = (event) => {
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    const speechResult = event.results[i][0].transcript;
                    if (speechResult.trim()) appendTranscript(partyId, speechResult);
                }
            }
        };

        recognitionRef.current = recognition;
        setMode('browser');
        recognition.start();
    }, [language, appendTranscript, switchToGemini, mode, useServerAI]);

    const startListening = useCallback(async (partyId) => {
        if (useServerAI) {
            startGeminiRecording(partyId);
        } else {
            await startBrowserArchiveRecording(partyId);
            startBrowserRecognition(partyId);
        }
    }, [useServerAI, startGeminiRecording, startBrowserRecognition, startBrowserArchiveRecording]);

    const addManualStatement = () => {
        if (!activePartyId) {
            setError('Select a party before adding a statement.');
            return;
        }
        appendTranscript(activePartyId, manualText);
        setManualText('');
        setError('');
    };

    const toggleParty = async (id) => {
        if (activePartyId === id) {
            await finalizePartyAudio(activePartyId);
            stopRecognition();
            setActivePartyId(null);
            chunkQueueRef.current = [];
        } else {
            if (activePartyId) {
                await finalizePartyAudio(activePartyId);
                stopRecognition();
            }
            networkRetryCountRef.current = 0;
            setActivePartyId(id);
            setTimeout(() => startListening(id), 300);
        }
    };

    const saveCurrentPartyAudio = async () => {
        if (!activePartyId) return;
        await uploadPartySnapshot(activePartyId, { clearChunks: false });
    };

    useEffect(() => {
        return () => {
            clearTimeout(snapshotTimerRef.current);
            recognitionRef.current?.stop();
            releaseMediaStream();
        };
    }, [releaseMediaStream]);

    const endSession = async () => {
        if (activePartyId) {
            await finalizePartyAudio(activePartyId);
        }
        stopRecognition();
        if (conversationId) {
            try {
                await saveConversation(conversationId, {
                    transcript,
                    status: 'in_review',
                });
            } catch (err) {
                console.warn('Failed to save session:', err.message);
            }
        }
        navigate('/review', {
            state: {
                transcript,
                parties: initialParties,
                refNumber,
                language,
                conversationId,
            },
        });
    };

    const listeningLabel = isTranscribing
        ? 'Transcribing…'
        : isRecording
            ? 'Listening… speak now'
            : null;

    return (
        <Layout>
            <div className="session-container" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem', height: 'calc(100vh - 120px)' }}>

                <div className="parties-control" style={{ borderRight: '1px solid var(--border)', paddingRight: '1rem' }}>
                    <h3>Parties</h3>
                    {info && !error && (
                        <div style={{ padding: '0.5rem', background: '#e8f5e9', color: '#2e7d32', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                            {info}
                        </div>
                    )}
                    {error && (
                        <div style={{ padding: '0.5rem', background: '#ffebee', color: '#c62828', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.9rem' }}>
                            {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                        {initialParties.map(party => (
                            <div
                                key={party.id}
                                className={`card party-control-card ${activePartyId === party.id ? 'active' : ''}`}
                                style={{
                                    padding: '1rem',
                                    cursor: 'pointer',
                                    border: activePartyId === party.id ? '2px solid var(--success)' : '1px solid var(--border)',
                                    background: activePartyId === party.id ? '#f0fff4' : 'var(--surface)',
                                    transition: 'all 0.2s'
                                }}
                                onClick={() => toggleParty(party.id)}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '1rem' }}>{party.name}</h4>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{party.role}</span>
                                    </div>
                                    {activePartyId === party.id ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            {(isRecording || isTranscribing) ? (
                                                <div className="recording-wave">
                                                    <span></span><span></span><span></span>
                                                </div>
                                            ) : (
                                                <Loader className="spin" size={20} />
                                            )}
                                            <Mic size={20} color="var(--success)" />
                                        </div>
                                    ) : (
                                        <MicOff size={20} color="var(--secondary)" />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {!conversationId && (
                        <div
                            style={{
                                marginTop: '1rem',
                                padding: '0.75rem',
                                background: '#fff8e1',
                                color: '#f57f17',
                                borderRadius: '4px',
                                fontSize: '0.85rem',
                            }}
                        >
                            Start the session from <strong>Case Intake</strong> so audio can be saved.
                        </div>
                    )}

                    <div style={{ marginTop: '1.5rem' }}>
                        <AudioRecordingsList
                            conversationId={conversationId}
                            recordings={audioRecordings}
                            title="Recorded audio"
                            emptyMessage={
                                activePartyId
                                    ? 'Speak for a few seconds, then switch party or tap Save recording.'
                                    : 'Select a party and record to capture audio.'
                            }
                        />
                        {isUploadingAudio && (
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                Uploading audio…
                            </p>
                        )}
                        {activePartyId && conversationId && (
                            <button
                                type="button"
                                className="btn-outline"
                                onClick={saveCurrentPartyAudio}
                                disabled={isUploadingAudio}
                                style={{
                                    width: '100%',
                                    marginTop: '0.5rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.4rem',
                                }}
                            >
                                <Save size={16} /> Save recording now
                            </button>
                        )}
                    </div>

                    {activePartyId && (
                        <div style={{ marginTop: '1.5rem' }}>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                Type statement (optional)
                            </label>
                            <textarea
                                value={manualText}
                                onChange={(e) => setManualText(e.target.value)}
                                rows={3}
                                placeholder="Enter what was said…"
                                style={{
                                    width: '100%',
                                    marginTop: '0.5rem',
                                    padding: '0.5rem',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius)',
                                    resize: 'vertical',
                                    fontSize: '0.9rem'
                                }}
                            />
                            <button
                                type="button"
                                className="btn-primary"
                                onClick={addManualStatement}
                                disabled={!manualText.trim()}
                                style={{ width: '100%', marginTop: '0.5rem' }}
                            >
                                Add to transcript
                            </button>
                        </div>
                    )}

                    <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
                        <button className="btn-primary" onClick={endSession} style={{ width: '100%', backgroundColor: '#e74c3c' }}>
                            <StopCircle size={18} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} /> End Session
                        </button>
                    </div>
                </div>

                <div className="transcript-area" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3>Live Transcript</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            {activePartyId && listeningLabel && !error && (
                                <span style={{ color: '#27ae60', fontSize: '0.9rem' }}>{listeningLabel}</span>
                            )}
                            {isRecording && (
                                <span style={{ color: '#e74c3c', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span className="recording-dot"></span> Live
                                </span>
                            )}
                        </div>
                    </div>

                    <div
                        className="transcript-box"
                        ref={scrollRef}
                        style={{
                            flex: 1,
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)',
                            padding: '2rem',
                            overflowY: 'auto',
                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
                        }}
                    >
                        {transcript.length === 0 ? (
                            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                                <Mic size={48} color="var(--border)" style={{ marginBottom: '1rem' }} />
                                <p style={{ fontStyle: 'italic' }}>Select a party to start transcription.</p>
                                <p style={{ fontSize: '0.8rem' }}>Microphone permission required.</p>
                            </div>
                        ) : (
                            transcript.map((item, index) => (
                                <div key={index} style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                        <strong style={{ color: 'var(--primary)' }}>{item.speaker}</strong>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: '#eee', padding: '2px 6px', borderRadius: '4px' }}>{item.role}</span>
                                        <span style={{ fontSize: '0.75rem', color: '#999' }}>{item.timestamp}</span>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '1.05rem', lineHeight: '1.6' }}>{item.text}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
            <style>{`
                .recording-dot {
                    width: 8px;
                    height: 8px;
                    background-color: #e74c3c;
                    border-radius: 50%;
                    animation: pulse 1s infinite;
                }
                .spin {
                    animation: spin 1s linear infinite;
                }
                .recording-wave {
                    display: inline-flex;
                    align-items: center;
                    gap: 2px;
                    height: 12px;
                }
                .recording-wave span {
                    display: block;
                    width: 2px;
                    height: 100%;
                    background-color: var(--success);
                    animation: wave 1s infinite ease-in-out;
                }
                .recording-wave span:nth-child(1) { animation-delay: -0.2s; }
                .recording-wave span:nth-child(2) { animation-delay: -0.1s; }
                .recording-wave span:nth-child(3) { animation-delay: 0s; }

                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes wave {
                    0%, 40%, 100% { transform: scaleY(0.4); }
                    20% { transform: scaleY(1); }
                }
            `}</style>
        </Layout>
    );
};

export default Session;
