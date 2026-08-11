import { Router, Response } from 'express';
import prisma from '../services/db';
import { authenticateToken, requireRoles, AuthenticatedRequest } from '../middlewares/auth';

const router = Router();

// GET /api/dashboard/stats - Retrieve Dashboard KPIs and activity logs
router.get('/stats', authenticateToken, requireRoles(['Admin', 'Accounts', 'Sales', 'Warehouse']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    // 1. Fetch KPI Counts
    const activeLeads = await prisma.customer.count({ where: { status: 'Lead' } });
    const activeCustomers = await prisma.customer.count({ where: { status: 'Active' } });
    const draftChallans = await prisma.salesChallan.count({ where: { status: 'Draft' } });
    
    // Total Revenue from Confirmed Challans
    const revenueAggregation = await prisma.salesChallan.aggregate({
      where: { status: 'Confirmed' },
      _sum: {
        totalAmount: true
      }
    });
    const totalRevenue = revenueAggregation._sum.totalAmount || 0;

    // Low stock items count (currentStock <= minStockAlert)
    // Using a raw query or simple fetch + JS mapping for safety
    const allProducts = await prisma.product.findMany({
      select: { id: true, name: true, sku: true, currentStock: true, minStockAlert: true, unitPrice: true }
    });
    const lowStockProducts = allProducts.filter(p => p.currentStock <= p.minStockAlert);
    const lowStockCount = lowStockProducts.length;

    // Total Inventory Value (CurrentStock * UnitPrice)
    const totalInventoryValue = allProducts.reduce((sum, p) => sum + (p.currentStock * p.unitPrice), 0);

    // 2. Fetch Recent Activities
    // Recent Stock Movements (top 5) with Product details
    const recentStockLogs = await prisma.stockLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        product: {
          select: { name: true, sku: true }
        }
      }
    });

    // Recent Follow-up Notes (top 5) with Customer details
    const recentNotes = await prisma.customerNote.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        customer: {
          select: { name: true, businessName: true }
        }
      }
    });

    // Top 5 Products below/near min stock alert
    const topLowStockAlerts = lowStockProducts
      .sort((a, b) => {
        // Sort by how critical it is (ratio of current stock to alert limit)
        const ratioA = a.minStockAlert > 0 ? a.currentStock / a.minStockAlert : 1;
        const ratioB = b.minStockAlert > 0 ? b.currentStock / b.minStockAlert : 1;
        return ratioA - ratioB;
      })
      .slice(0, 5);

    // Recent Challans (top 5)
    const recentChallans = await prisma.salesChallan.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        customer: {
          select: { name: true, businessName: true }
        }
      }
    });

    return res.json({
      kpis: {
        activeLeads,
        activeCustomers,
        draftChallans,
        totalRevenue,
        lowStockCount,
        totalInventoryValue
      },
      recentStockLogs,
      recentNotes,
      topLowStockAlerts,
      recentChallans
    });
  } catch (error) {
    console.error('Failed to compile dashboard metrics:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
