import type { Request, Response } from 'express';
import { parseInput } from '../../utils/validation.js';
import {
  createProductSchema,
  productIdSchema,
  productListQuerySchema,
  updateInventorySchema,
  updateProductSchema,
} from './product.schemas.js';
import type { ProductService } from './product.service.js';

export class ProductController {
  constructor(private readonly products: ProductService) {}

  listPublic = async (request: Request, response: Response): Promise<void> => {
    const result = await this.products.listPublic(
      parseInput(productListQuerySchema, request.query),
    );
    response.json({ data: { products: result.products }, meta: result.meta });
  };

  listAdmin = async (request: Request, response: Response): Promise<void> => {
    const result = await this.products.listAdmin(parseInput(productListQuerySchema, request.query));
    response.json({ data: { products: result.products }, meta: result.meta });
  };

  detail = async (request: Request, response: Response): Promise<void> => {
    const id = parseInput(productIdSchema, request.params.productId);
    response.json({ data: { product: await this.products.getPublic(id) } });
  };

  create = async (request: Request, response: Response): Promise<void> => {
    const product = await this.products.create(parseInput(createProductSchema, request.body));
    response.status(201).json({ data: { product } });
  };

  update = async (request: Request, response: Response): Promise<void> => {
    const id = parseInput(productIdSchema, request.params.productId);
    const product = await this.products.update(id, parseInput(updateProductSchema, request.body));
    response.json({ data: { product } });
  };

  updateInventory = async (request: Request, response: Response): Promise<void> => {
    const id = parseInput(productIdSchema, request.params.productId);
    const product = await this.products.updateInventory(
      id,
      parseInput(updateInventorySchema, request.body),
    );
    response.json({ data: { product } });
  };

  deactivate = async (request: Request, response: Response): Promise<void> => {
    const id = parseInput(productIdSchema, request.params.productId);
    response.json({ data: { product: await this.products.deactivate(id) } });
  };
}
