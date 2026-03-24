const db = require('../config/db.config');

const getUserByUsername = async (username) => {
  const res = await db.query('SELECT * FROM users WHERE username = $1', [username]);
  return res.rows[0];
};

const upsertUser = async (user) => {
  const query = `
    INSERT INTO users (username, password, role, name) 
    VALUES ($1, $2, $3, $4) 
    ON CONFLICT (username) DO UPDATE 
    SET password=$2, role=$3, name=$4
    RETURNING *;
  `;
  const values = [user.username, user.password, user.role, user.name];
  const res = await db.query(query, values);
  return res.rows[0];
};

const getAllUsersFull = async () => {
  const res = await db.query('SELECT username, password, role, name FROM users;');
  return res.rows;
};

module.exports = {
  getUserByUsername,
  upsertUser,
  getAllUsersFull
};
