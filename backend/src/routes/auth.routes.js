const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * POST /api/auth/login
 * Verifies email and password directly against the NeonDB users table.
 * No hardcoded users or credentials.
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email and password cannot be empty',
      });
    }

    // Query the database for the matching email
    const queryText = `
      SELECT id, name, email, password, role, is_active, created_at
      FROM users
      WHERE LOWER(TRIM(email)) = $1;
    `;

    const result = await db.query(queryText, [cleanEmail]);

    if (result.rows.length === 0) {
      console.log(`[AUTH] Login failed: User "${cleanEmail}" not found in NeonDB.`);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const user = result.rows[0];

    // Check account active state
    if (user.is_active === false) {
      console.log(`[AUTH] Login failed: User "${cleanEmail}" is inactive.`);
      return res.status(403).json({
        success: false,
        message: 'Your account is deactivated. Please contact an administrator.',
      });
    }

    // Password verification against database stored password
    const isMatch = (user.password === password || user.password?.trim() === cleanPassword);

    if (!isMatch) {
      console.log(`[AUTH] Login failed: Incorrect password for user "${cleanEmail}".`);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const normalizedRole = (user.role || 'VIEWER').toUpperCase();
    console.log(`[AUTH] Login successful: "${cleanEmail}" (Role: ${normalizedRole})`);

    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../middleware/auth.middleware');
    const token = jwt.sign(
      { id: user.id, email: user.email, role: normalizedRole, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name || user.email.split('@')[0],
        email: user.email,
        role: normalizedRole,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error('[AUTH] Login database error:', error.message || error);
    return res.status(500).json({
      success: false,
      message: `Database connection error: ${error.message || 'Unable to connect to NeonDB'}`,
    });
  }
});

/**
 * GET /api/auth/users
 * Fetches all registered staff users from NeonDB.
 */
router.get('/users', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, name, email, role, is_active, created_at
      FROM users
      ORDER BY id ASC;
    `);

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      users: result.rows.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: (u.role || 'VIEWER').toUpperCase(),
        is_active: u.is_active,
        created_at: u.created_at,
      })),
    });
  } catch (error) {
    console.error('[AUTH] Failed to fetch users from NeonDB:', error.message || error);
    return res.status(500).json({
      success: false,
      message: `Database error: ${error.message || 'Unable to fetch users'}`,
    });
  }
});

/**
 * POST /api/auth/users
 * Creates or updates a staff member directly in NeonDB.
 */
router.post('/users', async (req, res) => {
  try {
    const { name, email, password, role, is_active } = req.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Valid email address is required',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name && typeof name === 'string') ? name.trim() : cleanEmail.split('@')[0];
    const cleanRole = (role && typeof role === 'string') ? role.trim().toUpperCase() : 'VIEWER';
    const activeStatus = is_active !== false;

    // Check if user already exists
    const existing = await db.query('SELECT id, role, password FROM users WHERE LOWER(TRIM(email)) = $1', [cleanEmail]);

    if (existing.rows.length > 0) {
      const existingUser = existing.rows[0];
      const newPassword = (password && typeof password === 'string' && password.trim())
        ? password.trim()
        : existingUser.password;

      const updateQuery = `
        UPDATE users
        SET name = $1, role = $2, password = $3, is_active = $4
        WHERE id = $5
        RETURNING id, name, email, role, is_active, created_at;
      `;
      const updateRes = await db.query(updateQuery, [cleanName, cleanRole, newPassword, activeStatus, existingUser.id]);

      return res.status(200).json({
        success: true,
        message: `Updated staff user ${cleanEmail}`,
        user: updateRes.rows[0],
      });
    } else {
      if (!password || typeof password !== 'string' || !password.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Password is required when creating a new staff account',
        });
      }

      const insertQuery = `
        INSERT INTO users (name, email, password, role, is_active, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id, name, email, role, is_active, created_at;
      `;
      const insertRes = await db.query(insertQuery, [cleanName, cleanEmail, password.trim(), cleanRole, activeStatus]);

      return res.status(201).json({
        success: true,
        message: `Created staff user ${cleanEmail}`,
        user: insertRes.rows[0],
      });
    }
  } catch (error) {
    console.error('[AUTH] Error saving staff user to NeonDB:', error.message || error);
    return res.status(500).json({
      success: false,
      message: `Database error: ${error.message || 'Unable to save user'}`,
    });
  }
});

/**
 * DELETE /api/auth/users/:id
 * Removes a staff member from NeonDB.
 */
router.delete('/users/:id', async (req, res) => {
  try {
    const param = req.params.id;
    const isNumeric = /^\d+$/.test(param);

    let userQuery = isNumeric
      ? 'SELECT id, email, role FROM users WHERE id = $1'
      : 'SELECT id, email, role FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))';
    const userRes = await db.query(userQuery, [isNumeric ? parseInt(param, 10) : param]);

    if (userRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found in NeonDB',
      });
    }

    const targetUser = userRes.rows[0];

    // Ensure at least one active Admin remains
    if (String(targetUser.role).toUpperCase() === 'ADMIN') {
      const adminCountRes = await db.query(`
        SELECT COUNT(*) as count FROM users 
        WHERE UPPER(TRIM(role)) = 'ADMIN' AND is_active = TRUE AND id != $1
      `, [targetUser.id]);

      const remainingAdmins = parseInt(adminCountRes.rows[0].count, 10);
      if (remainingAdmins < 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete the only remaining active Administrator account in NeonDB',
        });
      }
    }

    await db.query('DELETE FROM users WHERE id = $1', [targetUser.id]);
    console.log(`[AUTH] Deleted user ID ${targetUser.id} (${targetUser.email}) from NeonDB`);

    return res.status(200).json({
      success: true,
      message: `User ${targetUser.email} removed successfully from NeonDB`,
    });
  } catch (error) {
    console.error('[AUTH] Error deleting user from NeonDB:', error.message || error);
    return res.status(500).json({
      success: false,
      message: `Database error: ${error.message || 'Unable to delete user'}`,
    });
  }
});

module.exports = router;
