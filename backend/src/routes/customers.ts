import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../services/db';
import { authenticateToken, requireRoles, AuthenticatedRequest } from '../middlewares/auth';

const router = Router();

// Validation Schemas
const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  mobile: z.string().min(10, 'Mobile number must be at least 10 digits'),
  email: z.string().email('Invalid email address'),
  businessName: z.string().min(1, 'Business name is required'),
  gstNumber: z.string().optional().or(z.literal('')),
  customerType: z.enum(['Retail', 'Wholesale', 'Distributor'], {
    errorMap: () => ({ message: 'Customer type must be Retail, Wholesale, or Distributor' }),
  }),
  address: z.string().min(1, 'Address is required'),
  status: z.enum(['Lead', 'Active', 'Inactive'], {
    errorMap: () => ({ message: 'Status must be Lead, Active, or Inactive' }),
  }),
  followUpDate: z.string().optional().nullable().transform((val) => val ? new Date(val) : null),
  notes: z.string().optional().or(z.literal('')),
});

const noteSchema = z.object({
  note: z.string().min(1, 'Note content cannot be empty'),
});

// GET /api/customers - List, Search, and Filter Customers
router.get('/', authenticateToken, requireRoles(['Admin', 'Sales', 'Accounts']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const search = req.query.q ? String(req.query.q) : '';
    const status = req.query.status ? String(req.query.status) : '';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (status) {
      whereClause.status = status;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { businessName: { contains: search } },
        { email: { contains: search } },
        { mobile: { contains: search } },
      ];
    }

    const [customers, total] = await prisma.$transaction([
      prisma.customer.findMany({
        where: whereClause,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.customer.count({ where: whereClause })
    ]);

    return res.json({
      customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Failed to retrieve customers:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/customers/:id - Retrieve Customer Detail with Notes
router.get('/:id', authenticateToken, requireRoles(['Admin', 'Sales', 'Accounts']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        followUpNotes: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    return res.json(customer);
  } catch (error) {
    console.error('Failed to retrieve customer:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/customers - Add Customer (Admin & Sales only)
router.post('/', authenticateToken, requireRoles(['Admin', 'Sales']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = customerSchema.parse(req.body);

    const customer = await prisma.customer.create({
      data: {
        name: body.name,
        mobile: body.mobile,
        email: body.email,
        businessName: body.businessName,
        gstNumber: body.gstNumber || null,
        customerType: body.customerType,
        address: body.address,
        status: body.status,
        followUpDate: body.followUpDate,
        notes: body.notes || null,
      }
    });

    // Add initial CRM follow-up note if notes are provided
    if (body.notes) {
      await prisma.customerNote.create({
        data: {
          customerId: customer.id,
          note: `Customer created. Initial note: ${body.notes}`,
          createdBy: req.user?.username || 'system',
        }
      });
    }

    return res.status(201).json(customer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Failed to create customer:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/customers/:id - Edit Customer (Admin & Sales only)
router.put('/:id', authenticateToken, requireRoles(['Admin', 'Sales']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = customerSchema.parse(req.body);

    const existingCustomer = await prisma.customer.findUnique({
      where: { id: req.params.id }
    });

    if (!existingCustomer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id: req.params.id },
      data: {
        name: body.name,
        mobile: body.mobile,
        email: body.email,
        businessName: body.businessName,
        gstNumber: body.gstNumber || null,
        customerType: body.customerType,
        address: body.address,
        status: body.status,
        followUpDate: body.followUpDate,
        notes: body.notes || null,
      }
    });

    // Log update note if status changed
    if (existingCustomer.status !== body.status) {
      await prisma.customerNote.create({
        data: {
          customerId: updatedCustomer.id,
          note: `Status updated from '${existingCustomer.status}' to '${body.status}'.`,
          createdBy: req.user?.username || 'system',
        }
      });
    }

    return res.json(updatedCustomer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Failed to update customer:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/customers/:id/notes - Add follow-up note (Admin & Sales only)
router.post('/:id/notes', authenticateToken, requireRoles(['Admin', 'Sales']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = noteSchema.parse(req.body);

    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const note = await prisma.customerNote.create({
      data: {
        customerId: customer.id,
        note: body.note,
        createdBy: req.user?.username || 'system',
      }
    });

    return res.status(201).json(note);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Failed to create customer note:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
