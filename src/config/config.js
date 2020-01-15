const config = {
    chatUrl: process.env.chatUrl || 'http://localhost:8080',
    chatGroupUrl: process.env.chatGroupUrl || 'group',
    chatLoginUrl: process.env.chatLoginUrl || 'login',
    loginUser: process.env.loginUser || 'user',
    loginPass: process.env.loginPass || 'pass',
    MONGODB_NAME: process.env.MONGODB_NAME || 'kanban',
    MONGODB_URL: process.env.MONGODB_URL || 'mongodb+srv://admin:kanban123@cluster0-tk8aq.mongodb.net/'
};

module.exports = config;