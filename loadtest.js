import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
    vus: 50,          // 50 concurrent users
    duration: '30s',
};

// Step 1: Setup - Fetch a valid problem ID dynamically before the spam begins
let problemId = null;

export function setup() {
    const res = http.get('http://localhost:5000/problems');
    const problems = res.json();
    if (problems.length > 0) {
        return problems[0]._id; // Pass the ID down to the VUs
    }
    throw new Error("No problems found in database. Run seed.js first.");
}

// Step 2: The actual load test per Virtual User (VU)
export default function (id) {
    problemId = id;

    const url = 'http://localhost:5000/submit';
    const payload = JSON.stringify({
        problemId: problemId,
        code: `
        #include <iostream>
        using namespace std;
        int main() {
            int a, b;
            if (cin >> a >> b) {
                cout << a + b << "\\n";
            }
            return 0;
        }`
    });

    const params = { headers: { 'Content-Type': 'application/json' } };

    // Submit the code
    let res = http.post(url, payload, params);
    check(res, { 'status is 200 (Submission Accepted)': (r) => r.status === 200 });
    
    if (res.status !== 200) return;

    let submissionId = res.json('submissionId');
    let isDone = false;
    let attempts = 0;

    // Poll the backend until the worker finishes compiling/executing
    while (!isDone && attempts < 25) {
        sleep(1); // Wait 1 second to prevent blowing up the Express event loop
        let statusRes = http.get(`http://localhost:5000/status/${submissionId}`);
        
        if (statusRes.status === 200) {
            let status = statusRes.json('status');
            if (status !== 'Queued' && status !== 'Executing') {
                isDone = true;
                check(statusRes, { 'verdict reached successfully': (r) => true });
            }
        }
        attempts++;
    }
}