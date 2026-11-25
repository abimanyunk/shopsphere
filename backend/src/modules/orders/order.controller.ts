import type { Request, Response } from 'express';
import { parseInput } from '../../utils/validation.js';
import { checkoutSchema, orderIdSchema, orderListQuerySchema } from './order.schemas.js';
import type { OrderService } from './order.service.js';

export class OrderController {
  constructor(private readonly orders: OrderService) {}

  checkout = async (request: Request, response: Response): Promise<void> => {
    const order = await this.orders.checkout(
      request.auth!.user.id,
      parseInput(checkoutSchema, request.body),
    );
    response.status(201).json({ data: { order } });
  };

  list = async (request: Request, response: Response): Promise<void> => {
    const result = await this.orders.list(
      request.auth!.user.id,
      parseInput(orderListQuerySchema, request.query),
    );
    response.json({ data: { orders: result.orders }, meta: result.meta });
  };

  detail = async (request: Request, response: Response): Promise<void> => {
    const orderId = parseInput(orderIdSchema, request.params.orderId);
    response.json({ data: { order: await this.orders.detail(request.auth!.user.id, orderId) } });
  };

  cancel = async (request: Request, response: Response): Promise<void> => {
    const orderId = parseInput(orderIdSchema, request.params.orderId);
    response.json({ data: { order: await this.orders.cancel(request.auth!.user.id, orderId) } });
  };
}
