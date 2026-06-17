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

        let overallStatus = 'Pass';

        for(const testCase of problem.testCases) {
            const result = await executeCpp(code, testCase.input);

            if(result.status !== 'Pass') {
                overallStatus = result.status;
                break;
            }
            if (result.output !== testCase.expectedOutput) {
                overallStatus = 'Wrong Answer';
                break;
            }
        }

        const submission = new Submission({ problemId, code, status: overallStatus });
        await submission.save();

        res.json({ status: overallStatus });
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));