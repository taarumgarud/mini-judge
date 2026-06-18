require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Problem, Submission } = require('./models');
const { executeCpp } = require('./executor');

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error(err));

const queue = [];
let currentRunning = 0;
const MAX_CONCURRENT_JOBS = 8;

const processQueue = async () => {
    if(currentRunning >= MAX_CONCURRENT_JOBS || queue.length === 0) return;

    currentRunning++;
    const submissionId = queue.shift();

    try {
        const submission = await Submission.findById(submissionId);
        const problem = await Problem.findById(submission.problemId);

        submission.status = 'Executing';
        await submission.save();

        let overallStatus = 'Pass';
        let totalTime = 0;
        let errorDetails = {};

        for(const testCase of problem.testCases){
            const result = await executeCpp(submission.code, testCase.input);
            totalTime += result.executionTime || 0;

            if(result.status === 'Compile Error') {
                overallStatus = 'Compile Error';
                errorDetails = { errorTrace: result.output };
                break;
            }

            if(result.status !== 'Pass') {
                overallStatus = result.status;
                break;
            }

            if(result.output !== testCase.expectedOutput) {
                overallStatus = 'Wrong Answer';
                errorDetails = {
                    failingInput: testCase.input,
                    expectedOutput: testCase.expectedOutput,
                    actualOutput: result.output
                };
                break;
            }
        }

        submission.status = overallStatus;
        submission.executionTime = totalTime;
        if(Object.keys(errorDetails).length > 0) {
            submission.errorDetails = errorDetails;
        }
        await submission.save();

    } catch (error) {
        console.error('Worker error:',error);
    } finally {
        currentRunning--;
        processQueue();
    }
};

app.get('/problems', async (req, res) => {
    const problems = await Problem.find().select('-testCases');
    res.json(problems);
});

app.get('/problems/:id', async (req, res) => {
    const problem = await Problem.findById(req.params.id);
    res.json(problem);
});

app.post('/submit', async (req, res) => {
    const { problemId, code } = req.body;

    try{
        const problem = await Problem.findById(problemId);
        if(!problem) return res.status(404).json({ error: 'Problem not found' });

        const submission = new Submission({ problemId, code, status: 'Queued'});
        await submission.save();

        queue.push(submission._id);
        processQueue();

        res.json({ submissionId: submission._id, status: 'Queued' });
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/status/:id', async (req, res) => {
    try {
        const submission = await Submission.findById(req.params.id);
        if(!submission) return res.status(404).json({ error: 'Submission not found' });
        res.json(submission);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));