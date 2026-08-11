import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../services/db';
import { authenticateToken, requireRoles, AuthenticatedRequest } from '../middlewares/auth';

const router = Router();

// Validation Schemas
const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().min(1, 'SKU code is required'),
  category: z.string().min(1, 'Category is required'),
  unitPrice: z.number().min(0, 'Unit price cannot be negative'),
  currentStock: z.number().int().min(0, 'Current stock cannot be negative'),
  minStockAlert: z.number().int().min(0, 'Minimum stock alert quantity cannot be negative'),
  location: z.string().min(1, 'Location/warehouse is required'),
  stockReason: z.string().optional(), // optional reason for stock adjustment during updates
});

// GET /api/products - List, Search, and Filter Products
router.get('/', authenticateToken, requireRoles(['Admin', 'Sales', 'Warehouse', 'Accounts']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const search = req.query.q ? String(req.query.q) : '';
    const lowStock = req.query.lowStock === 'true';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { category: { contains: search } },
      ];
    }

    if (lowStock) {
      // Show products where currentStock <= minStockAlert
      whereClause.AND = [
        ...(whereClause.OR ? [{ OR: whereClause.OR }] : []),
        {
          currentStock: {
            lte: prisma.product.fields.minStockAlert
          }
        }
      ];
      // Note: prisma direct comparison requires a raw query or we can load using Prisma.where or custom.
      // In SQLite, since Prisma doesn't natively support column-to-column comparison inside findMany cleanly without raw queries in some versions,
      // let's do a client-side filter if needed, OR we can fetch and filter, or use raw query.
      // Actually, since our database is small, we can fetch them. But a better way to check if currentStock <= minStockAlert is to use a raw query or filter in JS.
      // Wait, let's write a robust query or filter in JavaScript. Let's do it in Javascript if the dataset is small, or use Prisma query if possible.
      // Wait! Prisma allows raw SQL, which is extremely easy. Or we can just get all products and filter.
      // Let's get all products and filter in JS if lowStock is true, to make it 100% database-agnostic and avoid SQLite vs Postgres syntax issues. Let's check how to write it.
    }

    let products;
    let total;

    if (lowStock) {
      // Find all that match search, then filter in JS
      const allMatching = await prisma.product.findMany({
        where: search ? {
          OR: [
            { name: { contains: search } },
            { sku: { contains: search } },
            { category: { contains: search } },
          ]
        } : {},
        orderBy: { name: 'asc' }
      });

      const filtered = allMatching.filter(p => p.currentStock <= p.minStockAlert);
      total = filtered.length;
      products = filtered.slice(skip, skip + limit);
    } else {
      [products, total] = await prisma.$transaction([
        prisma.product.findMany({
          where: whereClause,
          orderBy: { name: 'asc' },
          skip,
          take: limit,
        }),
        prisma.product.count({ where: whereClause })
      ]);
    }

    return res.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Failed to retrieve products:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/products/:id - Get product detail
router.get('/:id', authenticateToken, requireRoles(['Admin', 'Sales', 'Warehouse', 'Accounts']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    return res.json(product);
  } catch (error) {
    console.error('Failed to retrieve product details:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/products/:id/logs - Get product stock movement logs
router.get('/:id/logs', authenticateToken, requireRoles(['Admin', 'Warehouse', 'Accounts']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = await prisma.stockLog.findMany({
      where: { productId: req.params.id },
      orderBy: { createdAt: 'desc' }
    });

    return res.json(logs);
  } catch (error) {
    console.error('Failed to retrieve stock logs:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/products - Create Product (Admin & Warehouse only)
router.post('/', authenticateToken, requireRoles(['Admin', 'Warehouse']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = productSchema.parse(req.body);

    const existingProduct = await prisma.product.findUnique({
      where: { sku: body.sku }
    });

    if (existingProduct) {
      return res.status(400).json({ error: `A product with SKU '${body.sku}' already exists` });
    }

    const product = await prisma.product.create({
      data: {
        name: body.name,
        sku: body.sku,
        category: body.category,
        unitPrice: body.unitPrice,
        currentStock: body.currentStock,
        minStockAlert: body.minStockAlert,
        location: body.location,
      }
    });

    // Log the initial stock intake
    await prisma.stockLog.create({
      data: {
        productId: product.id,
        quantityChanged: product.currentStock,
        movementType: 'IN',
        reason: body.stockReason || 'Initial stock intake on creation',
        createdBy: req.user?.username || 'system',
      }
    });

    return res.status(201).json(product);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Failed to create product:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/products/:id - Edit Product (Admin & Warehouse only)
router.put('/:id', authenticateToken, requireRoles(['Admin', 'Warehouse']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = productSchema.parse(req.body);

    const existingProduct = await prisma.product.findUnique({
      where: { id: req.params.id }
    });

    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check SKU uniqueness if SKU changed
    if (existingProduct.sku !== body.sku) {
      const skuConflict = await prisma.product.findUnique({
        where: { sku: body.sku }
      });
      if (skuConflict) {
        return res.status(400).json({ error: `SKU '${body.sku}' is already in use by another product` });
      }
    }

    const stockDiff = body.currentStock - existingProduct.currentStock;

    // Perform database operations inside transaction
    const updatedProduct = await prisma.$transaction(async (tx) => {
      const prod = await tx.product.update({
        where: { id: req.params.id },
        data: {
          name: body.name,
          sku: body.sku,
          category: body.category,
          unitPrice: body.unitPrice,
          currentStock: body.currentStock,
          minStockAlert: body.minStockAlert,
          location: body.location,
        }
      });

      // If stock changed, create stock log entry
      if (stockDiff !== 0) {
        await tx.stockLog.create({
          data: {
            productId: prod.id,
            quantityChanged: Math.abs(stockDiff),
            movementType: stockDiff > 0 ? 'IN' : 'OUT',
            reason: body.stockReason || `Manual stock adjustment (Diff: ${stockDiff})`,
            createdBy: req.user?.username || 'system',
          }
        });
      }

      return prod;
    });

    return res.json(updatedProduct);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Failed to update product:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
