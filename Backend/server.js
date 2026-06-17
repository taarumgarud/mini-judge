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

        let totalTime = 0;

        for(const testCase of problem.testCases) {
            const result = await executeCpp(code, testCase.input);
            totalTime += result.executionTime || 0;

            if(result.status === 'Compile Error') {
                return res.json({
                    status: 'Compile Error',
                    errorTrace: result.output,
                    executionTime: result.executionTime
                });
            }

            if (result.status !== 'Pass') {
                return res.json({
                    status: result.status,
                    executionTime: result.executionTime
                });
            }

            if (result.output !== testCase.expectedOutput){
                return res.json({
                    status: 'WrongAnswer',
                    failingInput: testCase.input,
                    expectedOutput: testCase.expectedOutput,
                    actualOutput: result.output,
                    executionTime: result.executionTime
                });
            }
        }

        const submission = new Submission({ problemId, code, status: 'Pass'});
        await submission.save();

        res.json({ status: 'Pass', executionTime: totalTime });
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));