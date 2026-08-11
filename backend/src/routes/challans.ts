import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../services/db';
import { authenticateToken, requireRoles, AuthenticatedRequest } from '../middlewares/auth';

const router = Router();

// Validation Schemas
const challanItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().min(0, 'Unit price cannot be negative'),
});

const createChallanSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  status: z.enum(['Draft', 'Confirmed'], {
    errorMap: () => ({ message: 'Status must be Draft or Confirmed' }),
  }),
  items: z.array(challanItemSchema).min(1, 'At least one product item is required'),
});

const updateStatusSchema = z.object({
  status: z.enum(['Confirmed', 'Cancelled'], {
    errorMap: () => ({ message: 'Status must be Confirmed or Cancelled' }),
  }),
});

// Helper: Generate Challan Number (e.g. CHLN-YYYYMMDD-XXXX)
async function generateChallanNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // Count existing challans created today
  const count = await prisma.salesChallan.count({
    where: {
      challanNumber: {
        startsWith: `CHLN-${dateStr}-`
      }
    }
  });

  const seq = String(count + 1).padStart(4, '0');
  return `CHLN-${dateStr}-${seq}`;
}

// GET /api/challans - List all challans
router.get('/', authenticateToken, requireRoles(['Admin', 'Sales', 'Warehouse', 'Accounts']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const status = req.query.status ? String(req.query.status) : '';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }

    const [challans, total] = await prisma.$transaction([
      prisma.salesChallan.findMany({
        where: whereClause,
        include: {
          customer: {
            select: { name: true, businessName: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.salesChallan.count({ where: whereClause })
    ]);

    return res.json({
      challans,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Failed to retrieve challans:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/challans/:id - Retrieve Challan Detail
router.get('/:id', authenticateToken, requireRoles(['Admin', 'Sales', 'Warehouse', 'Accounts']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const challan = await prisma.salesChallan.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        items: true
      }
    });

    if (!challan) {
      return res.status(404).json({ error: 'Challan not found' });
    }

    return res.json(challan);
  } catch (error) {
    console.error('Failed to retrieve challan details:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/challans - Create Sales Challan
router.post('/', authenticateToken, requireRoles(['Admin', 'Sales']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = createChallanSchema.parse(req.body);
    const creator = req.user?.username || 'system';

    // 1. Fetch Customer details for snapshot
    const customer = await prisma.customer.findUnique({
      where: { id: body.customerId }
    });
    if (!customer) {
      return res.status(404).json({ error: 'Selected customer not found' });
    }
    const customerSnapshotObj = {
      id: customer.id,
      name: customer.name,
      businessName: customer.businessName,
      email: customer.email,
      mobile: customer.mobile,
      gstNumber: customer.gstNumber || '',
      address: customer.address
    };
    const customerSnapshot = JSON.stringify(customerSnapshotObj);

    // 2. Fetch all products to verify stock, create product snapshots, and calculate amounts
    const productIds = body.items.map(item => item.productId);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds } }
    });

    const productsMap = new Map(dbProducts.map(p => [p.id, p]));

    // Check if all requested products exist
    for (const item of body.items) {
      if (!productsMap.has(item.productId)) {
        return res.status(404).json({ error: `Product with ID ${item.productId} not found` });
      }
    }

    // 3. Business logic checks if status is Confirmed
    if (body.status === 'Confirmed') {
      for (const item of body.items) {
        const prod = productsMap.get(item.productId)!;
        if (prod.currentStock < item.quantity) {
          return res.status(400).json({
            error: `Insufficient stock for product '${prod.name}'. Available: ${prod.currentStock}, Requested: ${item.quantity}`
          });
        }
      }
    }

    // Generate Challan Number
    const challanNumber = await generateChallanNumber();

    // 4. Create Challan within a transaction
    const challan = await prisma.$transaction(async (tx) => {
      let totalQty = 0;
      let totalAmt = 0;

      // Construct challan items list with snapshots
      const itemsData = body.items.map(item => {
        const prod = productsMap.get(item.productId)!;
        const prodSnapshotObj = {
          id: prod.id,
          name: prod.name,
          sku: prod.sku,
          category: prod.category,
          location: prod.location
        };

        totalQty += item.quantity;
        const itemTotal = item.quantity * item.unitPrice;
        totalAmt += itemTotal;

        return {
          productId: prod.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: itemTotal,
          productSnapshot: JSON.stringify(prodSnapshotObj)
        };
      });

      // Create primary Challan
      const newChallan = await tx.salesChallan.create({
        data: {
          challanNumber,
          customerId: body.customerId,
          customerSnapshot,
          status: body.status,
          totalQuantity: totalQty,
          totalAmount: totalAmt,
          createdBy: creator,
          items: {
            create: itemsData
          }
        },
        include: {
          items: true
        }
      });

      // If status is Confirmed, reduce stock levels and create movement logs
      if (body.status === 'Confirmed') {
        for (const item of body.items) {
          const prod = productsMap.get(item.productId)!;
          
          // Reduce Stock
          await tx.product.update({
            where: { id: item.productId },
            data: {
              currentStock: {
                decrement: item.quantity
              }
            }
          });

          // Write Stock Log
          await tx.stockLog.create({
            data: {
              productId: item.productId,
              quantityChanged: item.quantity,
              movementType: 'OUT',
              reason: `Sales Challan Confirmation: ${challanNumber}`,
              createdBy: creator
            }
          });
        }
      }

      return newChallan;
    });

    return res.status(201).json(challan);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Failed to create challan:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/challans/:id/status - Update Challan status (Draft -> Confirmed, or Confirmed -> Cancelled)
router.patch('/:id/status', authenticateToken, requireRoles(['Admin', 'Sales', 'Accounts']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = updateStatusSchema.parse(req.body);
    const updater = req.user?.username || 'system';

    const challan = await prisma.salesChallan.findUnique({
      where: { id: req.params.id },
      include: { items: true }
    });

    if (!challan) {
      return res.status(404).json({ error: 'Challan not found' });
    }

    if (challan.status === body.status) {
      return res.status(400).json({ error: `Challan is already in status '${body.status}'` });
    }

    // Business Logic Transitions
    if (challan.status === 'Cancelled') {
      return res.status(400).json({ error: 'Cannot update status of a Cancelled challan' });
    }

    if (challan.status === 'Confirmed' && body.status === 'Confirmed') {
      return res.status(400).json({ error: 'Challan is already Confirmed' });
    }

    // 1. Transition: Draft -> Confirmed
    if (challan.status === 'Draft' && body.status === 'Confirmed') {
      // Check stock sufficiency
      const productIds = challan.items.map(item => item.productId).filter(Boolean) as string[];
      const dbProducts = await prisma.product.findMany({
        where: { id: { in: productIds } }
      });
      const productsMap = new Map(dbProducts.map(p => [p.id, p]));

      for (const item of challan.items) {
        if (!item.productId) {
          return res.status(400).json({ error: 'Cannot confirm challan: contains deleted product references' });
        }
        const prod = productsMap.get(item.productId);
        if (!prod || prod.currentStock < item.quantity) {
          return res.status(400).json({
            error: `Insufficient stock for product '${prod?.name || 'Unknown'}'. Available: ${prod?.currentStock || 0}, Required: ${item.quantity}`
          });
        }
      }

      // Execute Transition in Transaction
      const updatedChallan = await prisma.$transaction(async (tx) => {
        // Update challan status
        const updated = await tx.salesChallan.update({
          where: { id: challan.id },
          data: { status: 'Confirmed' }
        });

        // Decrement stock & write logs
        for (const item of challan.items) {
          await tx.product.update({
            where: { id: item.productId! },
            data: {
              currentStock: {
                decrement: item.quantity
              }
            }
          });

          await tx.stockLog.create({
            data: {
              productId: item.productId!,
              quantityChanged: item.quantity,
              movementType: 'OUT',
              reason: `Sales Challan Confirmation: ${challan.challanNumber}`,
              createdBy: updater
            }
          });
        }
        return updated;
      });

      return res.json(updatedChallan);
    }

    // 2. Transition: Confirmed -> Cancelled (Revert Stock)
    if (challan.status === 'Confirmed' && body.status === 'Cancelled') {
      const updatedChallan = await prisma.$transaction(async (tx) => {
        // Update status
        const updated = await tx.salesChallan.update({
          where: { id: challan.id },
          data: { status: 'Cancelled' }
        });

        // Revert stock & write logs
        for (const item of challan.items) {
          if (item.productId) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                currentStock: {
                  increment: item.quantity
                }
              }
            });

            await tx.stockLog.create({
              data: {
                productId: item.productId,
                quantityChanged: item.quantity,
                movementType: 'IN',
                reason: `Sales Challan Cancellation Reversal: ${challan.challanNumber}`,
                createdBy: updater
              }
            });
          }
        }
        return updated;
      });

      return res.json(updatedChallan);
    }

    // 3. Transition: Draft -> Cancelled (No stock impact)
    if (challan.status === 'Draft' && body.status === 'Cancelled') {
      const updatedChallan = await prisma.salesChallan.update({
        where: { id: challan.id },
        data: { status: 'Cancelled' }
      });
      return res.json(updatedChallan);
    }

    return res.status(400).json({ error: 'Invalid status transition' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Failed to update challan status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
