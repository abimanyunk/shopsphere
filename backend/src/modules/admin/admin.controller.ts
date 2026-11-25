import type { Request, Response } from 'express';
import { parseInput } from '../../utils/validation.js';
import { orderIdSchema } from '../orders/order.schemas.js';
import type { OrderService } from '../orders/order.service.js';
import { adminOrderListQuerySchema, updateOrderStatusSchema } from './admin.schemas.js';
import type { AdminService } from './admin.service.js';

export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly orders: OrderService,
  ) {}

  dashboard = async (_request: Request, response: Response): Promise<void> => {
    response.json({ data: { metrics: await this.admin.dashboard() } });
  };

  ordersList = async (request: Request, response: Response): Promise<void> => {
    const result = await this.orders.listAdmin(
      parseInput(adminOrderListQuerySchema, request.query),
    );
    response.json({ data: { orders: result.orders }, meta: result.meta });
  };

  orderDetail = async (request: Request, response: Response): Promise<void> => {
    const orderId = parseInput(orderIdSchema, request.params.orderId);
    response.json({ data: { order: await this.orders.adminDetail(orderId) } });
  };

  updateOrderStatus = async (request: Request, response: Response): Promise<void> => {
    const orderId = parseInput(orderIdSchema, request.params.orderId);
    const input = parseInput(updateOrderStatusSchema, request.body);
    response.json({ data: { order: await this.orders.updateStatus(orderId, input.status) } });
  };
}
