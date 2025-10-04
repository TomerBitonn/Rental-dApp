const { MongoClient } = require('mongodb');

let client, db;

async function connect() {
    if(db) return db;

    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    db = client.db();

    const users = db.collection('users');
    await users.createIndex({ address: 1 }, { unique: true });
    
    return db;
}

function getDB() {
    if(!db) throw new Error("DB not connected yet");
    return db;
}

module.exports = { connect, getDB };
