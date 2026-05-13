import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import Student from '../models/Student';
import { encryptBackend, decryptBackend, decryptFrontendLayer } from '../utils/crypto';
import CryptoJS from 'crypto-js';

// @desc    Register a new student
// @route   POST /api/register
export const registerStudent = async (req: Request, res: Response) => {
  const FRONTEND_SECRET = 'student_registration_system_2026_secure_key';
  try {
    const { encryptedPayload } = req.body;

    if (!encryptedPayload) {
      return res.status(400).json({ message: 'No payload provided' });
    }

    // 1. Decrypt frontend layer
    const decryptedData = decryptFrontendLayer(encryptedPayload, FRONTEND_SECRET);
    if (!decryptedData) {
      return res.status(400).json({ message: 'Encryption Key Mismatch. Please check Server/Client secrets.' });
    }

    const { email, password, ...otherData } = decryptedData;

    // Check if student exists
    const studentExists = await Student.findOne({ email });
    if (studentExists) {
      return res.status(400).json({ message: 'Student already exists' });
    }

    // 2. Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // 3. Apply 2nd level encryption to other student data
    const backendEncryptedData = encryptBackend(otherData);

    // 4. Save to DB
    const student = await Student.create({
      email,
      passwordHash,
      encryptedData: backendEncryptedData,
    });

    res.status(201).json({
      message: 'Student registered successfully',
      studentId: student._id,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all students
// @route   GET /api/students
export const getStudents = async (req: Request, res: Response) => {
  const FRONTEND_SECRET = 'student_registration_system_2026_secure_key';
  try {
    const students = await Student.find();
    
    const decryptedStudents = students.map((s) => {
      // 1. Decrypt backend layer
      const otherData = decryptBackend(s.encryptedData);
      
      // 2. Combine with email
      const studentData = { id: s._id, email: s.email, ...otherData };
      
      // 3. Re-encrypt with frontend layer before sending
      // This matches the requirement: Backend decrypts one level, sends encrypted data back
      const encryptedForFrontend = CryptoJS.AES.encrypt(
        JSON.stringify(studentData),
        FRONTEND_SECRET
      ).toString();

      return encryptedForFrontend;
    });

    res.json(decryptedStudents);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update student
// @route   PUT /api/student/:id
export const updateStudent = async (req: Request, res: Response) => {
  const FRONTEND_SECRET = 'student_registration_system_2026_secure_key';
  try {
    const { encryptedPayload } = req.body;
    const decryptedData = decryptFrontendLayer(encryptedPayload, FRONTEND_SECRET);
    
    if (!decryptedData) {
      return res.status(400).json({ message: 'Invalid payload' });
    }

    const { email, password, ...otherData } = decryptedData;
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Update fields
    if (email) student.email = email;
    if (password) student.passwordHash = await bcrypt.hash(password, 10);
    
    // Re-encrypt other data
    student.encryptedData = encryptBackend(otherData);
    
    await student.save();
    res.json({ message: 'Student updated successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete student
// @route   DELETE /api/student/:id
export const deleteStudent = async (req: Request, res: Response) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    await student.deleteOne();
    res.json({ message: 'Student removed' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login student
// @route   POST /api/login
export const loginStudent = async (req: Request, res: Response) => {
  const FRONTEND_SECRET = 'student_registration_system_2026_secure_key';
  try {
    const { encryptedPayload } = req.body;
    const decryptedData = decryptFrontendLayer(encryptedPayload, FRONTEND_SECRET);
    
    if (!decryptedData) {
      return res.status(400).json({ message: 'Invalid payload' });
    }

    const { email, password } = decryptedData;
    const student = await Student.findOne({ email });

    if (student && (await bcrypt.compare(password, student.passwordHash))) {
      res.json({
        message: 'Login successful',
        studentId: student._id,
        email: student.email,
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
