import React, { useState, useEffect, useRef } from 'react';

function App() {
    const [problem, setProblem] = useState(null);
    const [code, setCode] = useState('');
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

        return () => clearInterval(pollingInterval.current); 
    }, []);

    const pollStatus = async (submissionId) => {
        const res = await fetch(`http://localhost:5000/status/${submissionId}`);
        const data = await res.json();

        if(data.status === 'Queued' || data.status === 'Executing') {
            setResult({ status: data.status });
        }else{
            clearInterval(pollingInterval.current);
            setResult({
                status: data.status,
                executionTime: data.executionTime,
                ...data.errorDetails
            });
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        setResult({ status: 'Queued' });
        
        const response = await fetch('http://localhost:5000/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ problemId: problem._id, code })
        });
        
        const data = await response.json();

        pollingInterval.current = setInterval(() => {
            pollStatus(data.submissionId);
        }, 1000);
    };

    if (!problem) return <div>Loading problem...</div>;

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
            <h1>{problem.title}</h1>
            <p>{problem.description}</p>
            
            <textarea 
                rows="15" 
                style={{ width: '100%', fontFamily: 'monospace', padding: '10px', marginTop: '10px' }}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Write your C++ code here..."
            />
            
            <button
                onClick={handleSubmit}
                disabled={loading}
                style={{ padding:'10px 20px', marginTop: '10px', cursor: 'pointer', backgroundColor: loading ? '#ccc' : '#007bff', color: 'white', border: 'none' }}
            >
                Submit
            </button>

            {result && (
                <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#fdfdfd' }}>
                    <h3 style={{ color: ['Pass', 'Queued', 'Executing'].includes(result.status) ? (result.status === 'Pass' ? 'green' : '#ff9800') : 'red', marginTop: 0}}>
                        Verdict: {result.status}
                        {result.status === 'Executing' && '...'} 
                        {result.executionTime !== undefined && ` (${result.executionTime}ms)`}
                    </h3>

                    {result.status === 'Compile Error' && (
                        <div>
                            <strong>Compiler Output: </strong>
                            <pre style={{ backgroundColor: '#2d2d2d', color: '#f8c555', padding: '10px', overflowX: 'auto', marginTop: '5px' }}>
                                {result.errorTrace}
                            </pre>
                        </div>
                    )}
                    {result.status === 'Wrong Answer' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                            <div>
                                <strong>Failing Input:</strong>
                                <pre style={{ margin: '5px 0 0 0', padding: '8px', backgroundColor: '#eee' }}>{result.failingInput}</pre>
                            </div>
                            <div>
                                <strong>Expected Output:</strong>
                                <pre style={{ margin: '5px 0 0 0', padding: '8px', backgroundColor: '#e6ffe6', color: '#006600'}}>{result.expectedOutput}</pre>
                            </div>
                            <div>
                                <strong>Actual Output:</strong>
                                <pre style={{ margin: '5px 0 0 0', padding: '8px', backgroundColor: '#ffe6e6', color: '#cc0000' }}>{result.actualOutput}</pre>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default App;