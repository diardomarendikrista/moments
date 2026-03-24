const userRepository = require('../repositories/user.repository');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middlewares/auth.middleware');

const login = async (username, password) => {
  const user = await userRepository.getUserByUsername(username);

  if (!user || user.password !== password) {
    throw new Error('Invalid username or password');
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  return {
    token,
    user: { id: user.id, username: user.username, role: user.role, name: user.name }
  };
};

module.exports = {
  login
};
