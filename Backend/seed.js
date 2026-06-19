require('dotenv').config();
const mongoose = require('mongoose');
const { Problem } = require('./models');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mini-judge';

const problems = [
    {
        title: "Two Sum",
        description: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\n**Input Format:**\nLine 1: An integer N (size of array)\nLine 2: N space-separated integers\nLine 3: An integer Target\n\n**Output Format:**\nSpace-separated indices.",
        difficulty: "Easy",
        tags: ["Array", "Hash Table"],
        testCases: [
            { input: "4\n2 7 11 15\n9", expectedOutput: "0 1" },
            { input: "3\n3 2 4\n6", expectedOutput: "1 2" },
            { input: "2\n3 3\n6", expectedOutput: "0 1" }
        ]
    },
    {
        title: "Valid Parentheses",
        description: "Given a string `s` containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.\n\n**Input Format:**\nLine 1: A string of brackets\n\n**Output Format:**\nPrint `true` or `false`.",
        difficulty: "Easy",
        tags: ["String", "Stack"],
        testCases: [
            { input: "()", expectedOutput: "true" },
            { input: "()[]{}", expectedOutput: "true" },
            { input: "(]", expectedOutput: "false" },
            { input: "([)]", expectedOutput: "false" }
        ]
    },
    {
        title: "Maximum Subarray",
        description: "Find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.\n\n**Input Format:**\nLine 1: Integer N\nLine 2: N space-separated integers\n\n**Output Format:**\nAn integer representing the max sum.",
        difficulty: "Medium",
        tags: ["Array", "Dynamic Programming"],
        testCases: [
            { input: "9\n-2 1 -3 4 -1 2 1 -5 4", expectedOutput: "6" },
            { input: "1\n1", expectedOutput: "1" },
            { input: "5\n5 4 -1 7 8", expectedOutput: "23" }
        ]
    }
];

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('Connected to MongoDB. Wiping old problems...');
        await Problem.deleteMany({});
        console.log('Seeding new problems...');
        await Problem.insertMany(problems);
        console.log('Successfully seeded database!');
        process.exit(0);
    })
    .catch(err => {
        console.error('Seeding error:', err);
        process.exit(1);
    });