import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.status === 'INACTIVE') {
      return res.status(403).json({ success: false, message: 'Account is inactive' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Update last login
    await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

    // Generate JWT Token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    // Neon free-tier databases auto-suspend and need a few seconds to wake up.
    if (error?.code === 'P1001' || String(error?.message).includes("Can't reach database server")) {
      return res.status(503).json({
        success: false,
        message: 'Database is waking up (temporarily unavailable). Please try again in a few seconds.',
      });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const signup = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name: name.trim(), email, passwordHash: hashedPassword, role: 'EMPLOYEE', status: 'ACTIVE' },
      select: { id: true, name: true, email: true, role: true },
    });

    // Generate JWT Token (auto-login after signup)
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    if (error?.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }
    // Neon free-tier databases auto-suspend and need a few seconds to wake up.
    if (error?.code === 'P1001' || String(error?.message).includes("Can't reach database server")) {
      return res.status(503).json({
        success: false,
        message: 'Database is waking up (temporarily unavailable). Please try again in a few seconds.',
      });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getMe = async (req: any, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true }
    });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};