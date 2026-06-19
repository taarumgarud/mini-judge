import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import Split from 'react-split';
import './App.css';

function App() {
    const [problemsList, setProblemsList] = useState([]);
    const [problem, setProblem] = useState(null);
    const [activeTab, setActiveTab] = useState('description');
    const [history, setHistory] = useState([]);
    
    const [code, setCode] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    
    const pollingInterval = useRef(null);

    // Initial Load: Fetch all problems
    useEffect(() => {
        fetch('http://localhost:5000/problems')
            .then(res => res.json())
            .then(data => {
                setProblemsList(data);
                if (data.length > 0) loadProblem(data[0]._id);
            });
        return () => clearTimeout(pollingInterval.current);
    }, []);

    // Load specific problem and its history
    const loadProblem = async (id) => {
        setResult(null);
        const res = await fetch(`http://localhost:5000/problems/${id}`);
        const fullProblem = await res.json();
        setProblem(fullProblem);
        
        // Restore code from localStorage or set default
        const savedCode = localStorage.getItem(`code_${id}`);
        setCode(savedCode || '// Write your C++ code here\n#include <iostream>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}');
        
        fetchHistory(id);
    };

    const fetchHistory = async (id) => {
        const res = await fetch(`http://localhost:5000/problems/${id}/submissions`);
        const data = await res.json();
        setHistory(data);
    };

    const handleCodeChange = (value) => {
        setCode(value);
        if (problem) localStorage.setItem(`code_${problem._id}`, value);
    };

    const handleProblemChange = (e) => {
        loadProblem(e.target.value);
        setActiveTab('description');
    };

    const pollStatus = async (submissionId) => {
        try {
            const res = await fetch(`http://localhost:5000/status/${submissionId}`);
            if (!res.ok) throw new Error('Server error');
            const data = await res.json();

            if (data.status === 'Queued' || data.status === 'Executing') {
                setResult({ status: data.status });
                pollingInterval.current = setTimeout(() => pollStatus(submissionId), 1000);
            } else {
                setResult({ status: data.status, executionTime: data.executionTime, ...data.errorDetails });
                setLoading(false);
                fetchHistory(problem._id); // Refresh history after completion
            }
        } catch (error) {
            setResult({ status: 'Server Error' });
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        setResult({ status: 'Queued' });
        setActiveTab('description'); // Auto-switch to description to see result terminal
        if (pollingInterval.current) clearTimeout(pollingInterval.current);
        
        try {
            const response = await fetch('http://localhost:5000/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ problemId: problem._id, code })
            });
            const data = await response.json();
            pollingInterval.current = setTimeout(() => pollStatus(data.submissionId), 1000);
        } catch (error) {
            setResult({ status: 'Submission Failed' });
            setLoading(false);
        }
    };

    if (!problem) return <div className="loading-screen">Loading Platform...</div>;

    return (
        <div className="app-container">
            {/* Top Navigation Bar */}
            <nav className="top-nav">
                <div className="logo">LeetForces</div>
                <select className="problem-selector" value={problem._id} onChange={handleProblemChange}>
                    {problemsList.map(p => (
                        <option key={p._id} value={p._id}>{p.title}</option>
                    ))}
                </select>
            </nav>

            <Split sizes={[40, 60]} minSize={300} expandToMin={false} gutterSize={8} className="split-wrapper">
                
                {/* Left Pane: Tabs (Description / History) */}
                <div className="pane left-pane">
                    <div className="tabs">
                        <button className={`tab ${activeTab === 'description' ? 'active' : ''}`} onClick={() => setActiveTab('description')}>Description</button>
                        <button className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>Submissions</button>
                    </div>

                    <div className="pane-content">
                        {activeTab === 'description' && (
                            <>
                                <h1>{problem.title}</h1>
                                <div className="tags">
                                    <span className={`tag diff-${problem.difficulty?.toLowerCase() || 'easy'}`}>{problem.difficulty || 'Easy'}</span>
                                    {problem.tags?.map(tag => <span key={tag} className="tag">{tag}</span>)}
                                </div>
                                <p className="description" style={{ whiteSpace: 'pre-wrap' }}>{problem.description}</p>
                            </>
                        )}

                        {activeTab === 'history' && (
                            <div className="history-list">
                                {history.length === 0 ? <p className="text-muted">No submissions yet.</p> : null}
                                {history.map(sub => (
                                    <div key={sub._id} className="history-card">
                                        <div className={`status-dot ${sub.status === 'Pass' ? 'dot-green' : 'dot-red'}`}></div>
                                        <div className="history-details">
                                            <strong>{sub.status}</strong>
                                            <span className="text-muted text-sm">{sub.executionTime ? `${sub.executionTime}ms` : '-'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Pane: Editor & Output */}
                <div className="pane right-pane">
                    <div className="editor-header">
                        <span className="lang-badge">C++</span>
                        <button onClick={handleSubmit} disabled={loading} className={`submit-btn ${loading ? 'loading' : ''}`}>
                            {loading ? 'Executing...' : 'Submit Code'}
                        </button>
                    </div>
                    
                    <div className="monaco-wrapper">
                        <Editor
                            height="100%"
                            defaultLanguage="cpp"
                            theme="vs-dark"
                            value={code}
                            onChange={handleCodeChange}
                            options={{ minimap: { enabled: false }, fontSize: 14, padding: { top: 16 } }}
                        />
                    </div>

                    {/* Terminal Window */}
                    <div className="terminal-window">
                        <div className="terminal-header">Execution Output</div>
                        <div className="terminal-content">
                            {!result && <span className="text-muted">Run code to see results...</span>}
                            {result && (
                                <div>
                                    <h3 className={`status ${result.status === 'Pass' ? 'text-green' : result.status === 'Queued' || result.status === 'Executing' ? 'text-yellow' : 'text-red'}`}>
                                        {result.status} {result.executionTime !== undefined && `(${result.executionTime}ms)`}
                                    </h3>
                                    
                                    {result.status === 'Compile Error' && (
                                        <pre className="error-trace">{result.errorTrace}</pre>
                                    )}
                                    
                                    {result.status === 'Wrong Answer' && (
                                        <div className="diff-box">
                                            <div><strong>Input:</strong> <pre>{result.failingInput}</pre></div>
                                            <div><strong>Expected:</strong> <pre className="text-green">{result.expectedOutput}</pre></div>
                                            <div><strong>Actual:</strong> <pre className="text-red">{result.actualOutput}</pre></div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Split>
        </div>
    );
}

export default App;