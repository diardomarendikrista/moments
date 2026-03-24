const authService = require('../services/auth.service');

const login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await authService.login(username, password);
    res.json(result);
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ message: error.message });
  }
};

const getMe = (req, res) => {
  res.json({ user: req.user });
};

module.exports = {
  login,
  getMe
};
