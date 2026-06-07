import { Router } from 'express';
import jwt from 'jsonwebtoken';

const router = Router();

router.post('/login', (req, res) => {
  const { accessKey } = req.body;
  const expected = process.env.PORTAL_ACCESS_KEY;

  if (!expected) {
    return res.status(500).json({ error: 'Portal access key is not configured on the server' });
  }

  if (!accessKey || accessKey !== expected) {
    return res.status(401).json({ error: 'Invalid access key' });
  }

  const token = jwt.sign({ role: 'portal_user' }, process.env.JWT_SECRET, {
    expiresIn: '12h',
  });

  res.json({ token, expiresIn: 43200 });
});

router.get('/verify', (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ valid: false });
  }

  try {
    jwt.verify(header.slice(7), process.env.JWT_SECRET);
    return res.json({ valid: true });
  } catch {
    return res.status(401).json({ valid: false });
  }
});

export default router;
