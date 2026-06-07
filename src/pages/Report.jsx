import React, { useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Download, Share2 } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import Layout from '../components/Layout';

const Report = () => {
    const location = useLocation();
    const { reportData } = location.state || { reportData: null };
    const reportRef = useRef(null);

    const downloadPDF = () => {
        const element = reportRef.current;
        const opt = {
            margin: 10,
            filename: `ADR_Settlement_Report.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save();
    };

    if (!reportData) {
        return (
            <Layout>
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <h2>No Report Data</h2>
                    <p>Please go back and generate a report from the transcript.</p>
                </div>
            </Layout>
        );
    }

    const { caseDetails, parties, background, issues, proceedingsSummary, settlementTerms, withdrawalStatement, legalEffect, recommendedWayForward } = reportData;
    // Fallback if transcript is not passed (e.g. from old flow), though it should be passed now.
    const { transcript } = location.state || { transcript: [] };

    return (
        <Layout>
            <div className="report-page-container" style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '4rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h2>Step 4: Final Settlement Report</h2>
                    <button className="btn-primary" onClick={downloadPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Download size={18} /> Download PDF Report
                    </button>
                </div>

                {/* Paper-like Report Container */}
                <div
                    ref={reportRef}
                    className="paper-report"
                    style={{
                        background: 'white',
                        padding: '40px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        color: 'black',
                        fontFamily: 'Times New Roman, serif',
                        fontSize: '12pt',
                        lineHeight: '1.6'
                    }}
                >
                    <div style={{ textAlign: 'center', borderBottom: '2px solid black', paddingBottom: '10px', marginBottom: '20px' }}>
                        <h1 style={{ fontSize: '18pt', textTransform: 'uppercase', marginBottom: '5px', color: 'black' }}>AI-ASSISTED ADR SETTLEMENT REPORT</h1>
                        <h2 style={{ fontSize: '14pt', fontWeight: 'normal', fontStyle: 'italic', color: 'black' }}>({caseDetails.natureOfDispute})</h2>
                    </div>

                    <h3 style={{ borderBottom: '1px solid #ccc', marginTop: '20px', fontSize: '13pt', color: 'black' }}>1. Case Identification Details</h3>
                    <table style={{ width: '100%', marginBottom: '15px' }}>
                        <tbody>
                            <tr><td style={{ fontWeight: 'bold', width: '200px' }}>ADR Reference No.:</td><td>{caseDetails.refNo}</td></tr>
                            <tr><td style={{ fontWeight: 'bold' }}>Police Station Jurisdiction:</td><td>{caseDetails.policeStation}</td></tr>
                            <tr><td style={{ fontWeight: 'bold' }}>Nature of Dispute:</td><td>{caseDetails.natureOfDispute}</td></tr>
                            <tr><td style={{ fontWeight: 'bold' }}>Mode of Resolution:</td><td>{caseDetails.modeOfResolution}</td></tr>
                            <tr><td style={{ fontWeight: 'bold' }}>Date of ADR Proceedings:</td><td>{caseDetails.date}</td></tr>
                            <tr><td style={{ fontWeight: 'bold' }}>Venue:</td><td>{caseDetails.venue}</td></tr>
                        </tbody>
                    </table>

                    <h3 style={{ borderBottom: '1px solid #ccc', marginTop: '20px', fontSize: '13pt', color: 'black' }}>2. Parties to the Dispute</h3>
                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                        {parties.map((party, index) => (
                            <div key={index} style={{ flex: '1 1 45%' }}>
                                <p><strong>{party.role}</strong></p>
                                <p>Name: {party.name}</p>
                                <p>Address: {party.address || 'N/A'}</p>
                                <p>Role: {party.disputeRole}</p>
                            </div>
                        ))}
                    </div>

                    <h3 style={{ borderBottom: '1px solid #ccc', marginTop: '20px', fontSize: '13pt', color: 'black' }}>3. Background of the Dispute</h3>
                    <p>{background}</p>

                    <h3 style={{ borderBottom: '1px solid #ccc', marginTop: '20px', fontSize: '13pt', color: 'black' }}>4. Issues Identified for Resolution</h3>
                    <ul>
                        {issues.map((issue, idx) => (
                            <li key={idx}>{issue}</li>
                        ))}
                    </ul>

                    <h3 style={{ borderBottom: '1px solid #ccc', marginTop: '20px', fontSize: '13pt', color: 'black' }}>5. ADR Proceedings Summary</h3>
                    <p>{proceedingsSummary}</p>

                    <h3 style={{ borderBottom: '1px solid #ccc', marginTop: '20px', fontSize: '13pt', color: 'black' }}>6. Mutually Agreed Settlement Terms</h3>
                    {settlementTerms.map((term, idx) => (
                        <div key={idx} style={{ marginBottom: '10px' }}>
                            <p><strong>6.{idx + 1} {term.title}</strong></p>
                            <p>{term.content}</p>
                        </div>
                    ))}

                    <h3 style={{ borderBottom: '1px solid #ccc', marginTop: '20px', fontSize: '13pt', color: 'black' }}>7. Withdrawal of Criminal Intent</h3>
                    <p>{withdrawalStatement}</p>

                    <h3 style={{ borderBottom: '1px solid #ccc', marginTop: '20px', fontSize: '13pt', color: 'black' }}>8. Legal Effect of This Settlement</h3>
                    <p>{legalEffect}</p>

                    {recommendedWayForward && (
                        <>
                            <h3 style={{ borderBottom: '1px solid #ccc', marginTop: '20px', fontSize: '13pt', color: 'black' }}>9. Recommended Way Forward (Legal Advisory)</h3>
                            <div style={{ backgroundColor: '#f9f9fa', padding: '15px', borderLeft: '4px solid #4a5568', marginTop: '10px' }}>
                                <p style={{ marginBottom: '10px' }}><strong>Summary:</strong> {recommendedWayForward.summary}</p>
                                {recommendedWayForward.applicableLaws && recommendedWayForward.applicableLaws.length > 0 && (
                                    <ul style={{ margin: '10px 0 10px 20px' }}>
                                        {recommendedWayForward.applicableLaws.map((law, idx) => (
                                            <li key={idx} style={{ marginBottom: '8px' }}>
                                                <strong>{law.act}:</strong> {law.relevance}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                <p style={{ marginTop: '15px', fontStyle: 'italic', fontSize: '11pt', color: '#555' }}>
                                    <strong>Disclaimer:</strong> {recommendedWayForward.disclaimer}
                                </p>
                            </div>
                        </>
                    )}

                    <h3 style={{ borderBottom: '1px solid #ccc', marginTop: '20px', fontSize: '13pt', color: 'black' }}>{recommendedWayForward ? '10' : '9'}. Declaration by Parties</h3>
                    <p>We, the undersigned, confirm that we have read and understood the terms of this settlement, we agree to comply with all conditions stated above, and we sign this document voluntarily and in good faith.</p>

                    <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
                        {parties.map((party, index) => (
                            <div key={index} style={{ width: '45%' }}>
                                <p><strong>{party.role}</strong></p>
                                <p>Name: {party.name}</p>
                                <br /><br />
                                <div style={{ borderTop: '1px solid black', paddingTop: '5px' }}>Signature</div>
                                <p>Date: {caseDetails.date}</p>
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: '40px', borderTop: '2px solid black', paddingTop: '20px' }}>
                        <p><strong>Police / Mediator Endorsement</strong></p>
                        <br />
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div>
                                <p>Name & Rank: ___________________</p>
                                <p>Police Station: Ghaziabad</p>
                            </div>
                            <div style={{ width: '200px' }}>
                                <br />
                                <div style={{ borderTop: '1px solid black', paddingTop: '5px' }}>Signature & Seal</div>
                                <p>Date: {caseDetails.date}</p>
                            </div>
                        </div>
                    </div>

                    {/* Added Transcript Section */}
                    <div className="html2pdf__page-break"></div>
                    <h3 style={{ borderBottom: '1px solid #ccc', marginTop: '20px', fontSize: '13pt', color: 'black' }}>{recommendedWayForward ? '11' : '10'}. Full Conversation Transcript</h3>
                    <p style={{ fontStyle: 'italic', marginBottom: '15px' }}>The following is a verbatim record of the AI-mediated session.</p>

                    {transcript && transcript.length > 0 ? (
                        transcript.map((item, index) => (
                            <div key={index} style={{ marginBottom: '10px' }}>
                                <p style={{ marginBottom: '2px' }}><strong>{item.speaker} ({item.role})</strong> <span style={{ fontSize: '0.8em', color: '#666' }}>[{item.timestamp}]</span></p>
                                <p style={{ marginTop: '0' }}>{item.text}</p>
                            </div>
                        ))
                    ) : (
                        <p>No transcript data available.</p>
                    )}
                </div>
            </div>
        </Layout>
    );
};
export default Report;
