import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import Split from 'react-split';
import './App.css';

function App() {
    const [problem, setProblem] = useState(null);
    const [code, setCode] = useState('// Write your C++ code here\n#include <iostream>\nusing namespace std;\n\nint main() {\n  \n  return 0;\n}');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const pollingInterval = useRef(null);

    useEffect(() => {
        fetch('http://localhost:5000/problems')
            .then(res => res.json())
            .then(data => {
                if (data.length > 0) {
                    fetch(`http://localhost:5000/problems/${data[0]._id}`)
                        .then(res => res.json())
                        .then(fullProblem => setProblem(fullProblem));
                }
            });

        return () => clearTimeout(pollingInterval.current); 
    }, []);

    const pollStatus = async (submissionId) => {
        try{
            const res = await fetch(`http://localhost:5000/status/${submissionId}`);
            if(!res.ok) throw new Error('Server error');
            const data = await res.json();

            if(data.status === 'Queued' || data.status === 'Executing') {
                setResult({ status: data.status });
                pollingInterval.current = setTimeout(() => pollStatus(submissionId), 1000);
            }else{
                setResult({
                    status: data.status,
                    executionTime: data.executionTime,
                    ...data.errorDetails
                });
                setLoading(false);
            }
        } catch (error) {
            setResult({ status: 'Server Error: Retrying...' });
            pollingInterval.current = setTimeout(() => pollStatus(submissionId), 2000);
        }  
    };

    const handleSubmit = async () => {
        setLoading(true);
        setResult({ status: 'Queued' });

        if(pollingInterval.current) clearTimeout(pollingInterval.current);

        try{
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
        <Split sizes={[40,60]} minSize={300} expandToMin={false} gutterSize={10} className="split-wrapper">
            {/* Left Pane: Problem Description */}
            <div className="pane problem-pane">
                <h1>{problem.title}</h1>
                <div className="tags">
                    <span className="tag diff-easy">Easy</span>
                    <span className="tag">Arrays</span>
                </div>
                <p className="description">{problem.description}</p>
            </div>

            {/* Right Pane: Editor && Output */}
            <div className="pane editor-pane">
                <div className="editor-header">
                    <span className="lang-badge">C++</span>
                    <button onClick={handleSubmit} disabled={loading} className={`sumbit-btn ${loading ? 'loading' : ''}`}>
                        {loading ? 'Executing...' : 'Submit Code'}
                    </button>
                </div>

                <div className="monaco-wrapper">
                    <Editor
                        heights="100%"
                        defaultLanguage="cpp"
                        theme="vs-dark"
                        value={code}
                        onChange={(value) => setCode(value)}
                        options={{ minimap: { enabled: false}, fontSize: 14 }}
                    />
                </div>

                {/* Terminal Output Window */}
                <div className="terminal-window">
                    <div className="terminal-header">Execution Output</div>
                    <div className="terminal-content">
                        {!result && <span className="text-muted">Run code to see results...</span>}
                        {result && (
                            <div>
                                <h3 className={`status ${result.status === 'Pass' ? 'text-green' : 'text-red'}`}>
                                    {result.status} {result.executionTime !== undefined && `(${result.executionTime}ms)`}
                                </h3>

                                {result.status === 'Compile Error' && (
                                    <pre className="error-trace">{result.errorTrace}</pre>
                                )}

                                {result.status === 'Wrong Answer' && (
                                    <div className="diff-box">
                                        <div><strong>Input:</strong> <pre>{result.failingInput}</pre></div>
                                        <div><strong>Expected:</strong> <pre className='text-green'>{result.expectedOutput}</pre></div>
                                        <div><strong>Actual:</strong> <pre className="text-red">{result.actualOutput}</pre></div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Split>
    );
}

export default App;