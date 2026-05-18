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
    // 1. Decrypt frontend layer (decrypts each field separately)
    const decryptedData = decryptFrontendLayer(req.body, FRONTEND_SECRET);
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
      
      // 2. Combine with email and ID
      const studentData = { id: s._id, email: s.email, ...otherData };
      
      // 3. Re-encrypt each field with the frontend layer before sending
      const encryptedStudentData: any = {};
      for (const key of Object.keys(studentData)) {
        if (key === 'id') {
          encryptedStudentData[key] = studentData[key];
        } else {
          encryptedStudentData[key] = CryptoJS.AES.encrypt(
            String((studentData as any)[key]),
            FRONTEND_SECRET
          ).toString();
        }
      }

      return encryptedStudentData;
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
    const decryptedData = decryptFrontendLayer(req.body, FRONTEND_SECRET);
    
    if (!decryptedData) {
      return res.status(400).json({ message: 'Invalid payload' });
    }

    const { email, password, ...otherData } = decryptedData;
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check duplicate email
    if (email) {
      const emailExists = await Student.findOne({ email, _id: { $ne: req.params.id } });
      if (emailExists) {
        return res.status(400).json({ message: 'Email address is already in use by another student' });
      }
      student.email = email;
    }

    if (password) {
      student.passwordHash = await bcrypt.hash(password, 10);
    }
    
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
    const decryptedData = decryptFrontendLayer(req.body, FRONTEND_SECRET);
    
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
