import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Users
  const salt = bcrypt.genSaltSync(10);
  const passwordAdmin = bcrypt.hashSync('admin123', salt);
  const passwordSales = bcrypt.hashSync('sales123', salt);
  const passwordWarehouse = bcrypt.hashSync('warehouse123', salt);
  const passwordAccounts = bcrypt.hashSync('accounts123', salt);

  const users = [
    { username: 'admin', passwordHash: passwordAdmin, name: 'Admin Administrator', role: 'Admin' },
    { username: 'sales', passwordHash: passwordSales, name: 'Sales representative', role: 'Sales' },
    { username: 'warehouse', passwordHash: passwordWarehouse, name: 'Warehouse Supervisor', role: 'Warehouse' },
    { username: 'accounts', passwordHash: passwordAccounts, name: 'Accounts Officer', role: 'Accounts' }
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { username: user.username },
      update: {},
      create: user
    });
  }
  console.log('Users seeded!');

  // 2. Create Customers
  const customers = [
    {
      name: 'John Doe',
      mobile: '9876543210',
      email: 'john@acme.com',
      businessName: 'Acme Distribution Corp',
      gstNumber: '27AAAAA1111A1Z1',
      customerType: 'Distributor',
      address: '101, Industrial Area Phase II, Mumbai, MH - 400011',
      status: 'Active',
      followUpDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // in 2 days
      notes: 'Prefers bulk delivery on weekends. Very reliable customer.'
    },
    {
      name: 'Alice Smith',
      mobile: '9123456789',
      email: 'alice@alpharetails.com',
      businessName: 'Alpha Retail Outlets',
      gstNumber: '27BBBBB2222B1Z2',
      customerType: 'Retail',
      address: 'Plot 42, Sector 15, Vashi, Navi Mumbai - 400703',
      status: 'Active',
      followUpDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // in 5 days
      notes: 'Interested in power tools discount promotion.'
    },
    {
      name: 'Robert Vance',
      mobile: '8888877777',
      email: 'bob@vancerefrigeration.com',
      businessName: 'Vance Refrigeration',
      gstNumber: '27CCCCC3333C1Z3',
      customerType: 'Wholesale',
      address: 'Suite 200, Scranton Business Park, MH - 400099',
      status: 'Lead',
      followUpDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago (overdue!)
      notes: 'Initial cold call completed. Wants catalog and price list for copper piping.'
    },
    {
      name: 'Dinesh Kumar',
      mobile: '7777766666',
      email: 'dinesh@krishnastore.com',
      businessName: 'Krishna General Store',
      gstNumber: '',
      customerType: 'Retail',
      address: 'Shop No. 4, MG Road, Pune, MH - 411001',
      status: 'Inactive',
      followUpDate: null,
      notes: 'Not responding to calls lately. Temporarily marked inactive.'
    }
  ];

  for (const customer of customers) {
    const createdCustomer = await prisma.customer.create({
      data: customer
    });
    
    // Seed some initial follow up notes
    if (createdCustomer.status === 'Lead') {
      await prisma.customerNote.create({
        data: {
          customerId: createdCustomer.id,
          note: 'Sent introductory mail with company details.',
          createdBy: 'sales',
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
        }
      });
      await prisma.customerNote.create({
        data: {
          customerId: createdCustomer.id,
          note: 'Called to discuss requirements. Bob requested a customized catalog.',
          createdBy: 'sales',
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        }
      });
    } else if (createdCustomer.status === 'Active') {
      await prisma.customerNote.create({
        data: {
          customerId: createdCustomer.id,
          note: 'Onboarded customer. Handover completed to accounts.',
          createdBy: 'admin',
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
        }
      });
    }
  }
  console.log('Customers and Follow-up Notes seeded!');

  // 3. Create Products
  const products = [
    {
      name: 'Heavy Duty Steel Rods (12mm)',
      sku: 'STEEL-HD-12MM',
      category: 'Steel Materials',
      unitPrice: 450.00,
      currentStock: 120,
      minStockAlert: 30,
      location: 'Warehouse A - Rack 3'
    },
    {
      name: 'Industrial Power Drill (18V)',
      sku: 'DRILL-IND-18V',
      category: 'Power Tools',
      unitPrice: 3200.00,
      currentStock: 15,
      minStockAlert: 5,
      location: 'Warehouse B - Shelf A1'
    },
    {
      name: 'Copper Cable 100m Bundle',
      sku: 'COP-CAB-100M',
      category: 'Cabling & Wiring',
      unitPrice: 1850.00,
      currentStock: 8, // Low Stock! Alert limit is 15
      minStockAlert: 15,
      location: 'Warehouse A - Rack 8'
    },
    {
      name: 'Safety Helmet - Red',
      sku: 'HELMET-RED',
      category: 'Safety Gear',
      unitPrice: 350.00,
      currentStock: 200,
      minStockAlert: 20,
      location: 'Warehouse C - Bin 12'
    },
    {
      name: 'Work Gloves - Heavy Duty Leather',
      sku: 'GLOVES-LTH-HD',
      category: 'Safety Gear',
      unitPrice: 120.00,
      currentStock: 2, // Low Stock! Alert limit is 25
      minStockAlert: 25,
      location: 'Warehouse C - Bin 15'
    },
    {
      name: 'Brass Fittings 1/2 Inch',
      sku: 'BRASS-FIT-050',
      category: 'Plumbing',
      unitPrice: 75.00,
      currentStock: 500,
      minStockAlert: 50,
      location: 'Warehouse A - Rack 1'
    }
  ];

  for (const product of products) {
    const createdProduct = await prisma.product.create({
      data: product
    });

    // Create initial stock movement log for seeding
    await prisma.stockLog.create({
      data: {
        productId: createdProduct.id,
        quantityChanged: createdProduct.currentStock,
        movementType: 'IN',
        reason: 'Initial stock intake from manufacturer setup',
        createdBy: 'warehouse',
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
      }
    });
  }
  console.log('Products and Stock Logs seeded!');

  console.log('Database Seeding Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
