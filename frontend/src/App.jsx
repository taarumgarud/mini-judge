import React, { useState, useEffect } from 'react';

function App() {
    const [problem, setProblem] = useState(null);
    const [code, setCode] = useState('');
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(false);

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
    }, []);

    const handleSubmit = async () => {
        setLoading(true);
        setStatus('Evaluating...');
        
        const response = await fetch('http://localhost:5000/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ problemId: problem._id, code })
        });
        
        const data = await response.json();
        setStatus(data.status);
        setLoading(false);
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
            
            <div style={{ marginTop: '20px', display: 'flex', gap: '20px', alignItems: 'center' }}>
                <button 
                    onClick={handleSubmit} 
                    disabled={loading}
                    style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none' }}
                >
                    {loading ? 'Submitting...' : 'Submit'}
                </button>
                
                {status && (
                    <strong style={{ 
                        color: status === 'Pass' ? 'green' : 'red',
                        padding: '10px',
                        border: '1px solid #ccc',
                        backgroundColor: '#f9f9f9'
                    }}>
                        Verdict: {status}
                    </strong>
                )}
            </div>
        </div>
    );
}

export default App;