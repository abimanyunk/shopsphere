import type { PrismaClient } from '@prisma/client';

export interface DashboardMetrics {
  customers: number;
  activeProducts: number;
  lowStockProducts: number;
  orders: number;
  pendingOrders: number;
  confirmedRevenue: string;
}

export class AdminService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly lowStockThreshold: number,
  ) {}

  async dashboard(): Promise<DashboardMetrics> {
    const [customers, activeProducts, lowStockProducts, orders, pendingOrders, revenue] =
      await this.prisma.$transaction([
        this.prisma.user.count({ where: { role: 'CUSTOMER', isActive: true } }),
        this.prisma.product.count({ where: { isActive: true } }),
        this.prisma.product.count({
          where: { isActive: true, stockQuantity: { lte: this.lowStockThreshold } },
        }),
        this.prisma.order.count(),
        this.prisma.order.count({ where: { status: { in: ['PENDING', 'CONFIRMED'] } } }),
        this.prisma.payment.aggregate({
          where: { status: 'SUCCEEDED' },
          _sum: { amount: true },
        }),
      ]);
    return {
      customers,
      activeProducts,
      lowStockProducts,
      orders,
      pendingOrders,
      confirmedRevenue: (revenue._sum.amount ?? 0).toString(),
    };
  }
}
