const Database = require('better-sqlite3');
const db = new Database('data/orbit.db');

console.log("Users:");
console.log(db.prepare("SELECT email FROM users").all());

console.log("Profiles:");
console.log(db.prepare("SELECT id, name, city FROM profiles").all());

console.log("Interest Weights:");
console.log(db.prepare("SELECT key, weight FROM interest_weights LIMIT 10").all());

db.close();