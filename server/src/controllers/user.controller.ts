import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../index';
import { AuthRequest } from '../middleware/auth';

export const getEmployees = async (req: AuthRequest, res: Response) => {
  try {
    const employees = await prisma.user.findMany({
      where: { role: { in: ['EMPLOYEE', 'ADMIN'] } },
      select: { id: true, name: true, email: true, role: true, status: true, lastLogin: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: employees });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch employees' });
  }
};

export const createEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const employee = await prisma.user.create({
      data: { name, email, passwordHash: hashedPassword, role: role || 'EMPLOYEE', status: 'ACTIVE' },
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
    });
    await prisma.auditLog.create({
      data: { userId: req.user!.id, action: 'CREATE', fieldName: 'USER', newValue: `Created employee: ${email}` },
    });
    res.status(201).json({ success: true, data: employee });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create employee' });
  }
};

export const updateEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, role } = req.body;
    const employee = await prisma.user.findUnique({ where: { id } });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    if (email && email !== employee.email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Email already in use' });
      }
    }
    const updated = await prisma.user.update({
      where: { id },
      data: { ...(name && { name }), ...(email && { email }), ...(role && { role }) },
      select: { id: true, name: true, email: true, role: true, status: true, lastLogin: true, createdAt: true },
    });
    await prisma.auditLog.create({
      data: { userId: req.user!.id, action: 'UPDATE', fieldName: 'USER', newValue: `Updated employee: ${email || employee.email}` },
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update employee' });
  }
};

export const changeEmployeePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    const employee = await prisma.user.findUnique({ where: { id } });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id }, data: { passwordHash: hashedPassword } });
    await prisma.auditLog.create({
      data: { userId: req.user!.id, action: 'UPDATE', fieldName: 'PASSWORD', newValue: `Password changed for: ${employee.email}` },
    });
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to change password' });
  }
};

export const toggleEmployeeStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const employee = await prisma.user.findUnique({ where: { id } });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    const newStatus = employee.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const updated = await prisma.user.update({
      where: { id },
      data: { status: newStatus },
      select: { id: true, name: true, email: true, role: true, status: true },
    });
    await prisma.auditLog.create({
      data: { userId: req.user!.id, action: 'STATUS_CHANGE', fieldName: 'USER_STATUS', oldValue: employee.status, newValue: newStatus },
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to toggle status' });
  }
};

export const deleteEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const employee = await prisma.user.findUnique({ where: { id } });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    if (id === req.user!.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
    }
    await prisma.user.delete({ where: { id } });
    await prisma.auditLog.create({
      data: { userId: req.user!.id, action: 'DELETE', fieldName: 'USER', newValue: `Deleted employee: ${employee.email}` },
    });
    res.json({ success: true, message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete employee' });
  }
};
