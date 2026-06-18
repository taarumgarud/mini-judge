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
    problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem', required: true },
    code: { type: String, required: true },
    language: { type: String, default: 'cpp', required: true },
    status: { type: String, required: true },
    executionTime: Number,
    errorDetails: mongoose.Schema.Types.Mixed
}, { timestamps: true });

const Problem = mongoose.model('Problem', problemSchema);
const Submission = mongoose.model('Submission', submissionSchema);

module.exports = { Problem, Submission }; 