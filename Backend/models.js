const mongoose = require('mongoose');

const testCaseSchema = new mongoose.Schema({
    input: String,
    expectedOutput: String
});

const problemSchema = new mongoose.Schema({
    title: String,
    description: String,
    testCases: [testCaseSchema]
});

const submissionSchema = new mongoose.Schema({
    problemId: mongoose.Schema.Types.ObjectId,
    code: String,
    language: { type: String, default: 'cpp'},
    status: String,
    executionTime: Number,
    errorDetails: mongoose.Schema.Types.Mixed
});

const Problem = mongoose.model('Problem', problemSchema);
const Submission = mongoose.model('Submission', submissionSchema);

module.exports = { Problem, Submission }; 