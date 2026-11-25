import type { Request, Response } from 'express';
import { parseInput } from '../../utils/validation.js';
import { addCartItemSchema, cartItemIdSchema, updateCartItemSchema } from './cart.schemas.js';
import type { CartService } from './cart.service.js';

export class CartController {
  constructor(private readonly carts: CartService) {}

  get = async (request: Request, response: Response): Promise<void> => {
    response.json({ data: { cart: await this.carts.get(request.auth!.user.id) } });
  };

  add = async (request: Request, response: Response): Promise<void> => {
    const cart = await this.carts.add(
      request.auth!.user.id,
      parseInput(addCartItemSchema, request.body),
    );
    response.status(201).json({ data: { cart } });
  };

  update = async (request: Request, response: Response): Promise<void> => {
    const itemId = parseInput(cartItemIdSchema, request.params.itemId);
    const cart = await this.carts.update(
      request.auth!.user.id,
      itemId,
      parseInput(updateCartItemSchema, request.body),
    );
    response.json({ data: { cart } });
  };

  remove = async (request: Request, response: Response): Promise<void> => {
    const itemId = parseInput(cartItemIdSchema, request.params.itemId);
    response.json({ data: { cart: await this.carts.remove(request.auth!.user.id, itemId) } });
  };
}
