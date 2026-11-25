import type { Request, Response } from 'express';
import { z } from 'zod';
import { parseInput } from '../../utils/validation.js';
import { createCategorySchema, updateCategorySchema } from './category.schemas.js';
import type { CategoryService } from './category.service.js';

export class CategoryController {
  constructor(private readonly categories: CategoryService) {}

  listPublic = async (_request: Request, response: Response): Promise<void> => {
    response.json({ data: { categories: await this.categories.listPublic() } });
  };

  listAdmin = async (_request: Request, response: Response): Promise<void> => {
    response.json({ data: { categories: await this.categories.listAdmin() } });
  };

  create = async (request: Request, response: Response): Promise<void> => {
    const category = await this.categories.create(parseInput(createCategorySchema, request.body));
    response.status(201).json({ data: { category } });
  };

  update = async (request: Request, response: Response): Promise<void> => {
    const id = parseInput(z.uuid(), request.params.categoryId);
    const category = await this.categories.update(
      id,
      parseInput(updateCategorySchema, request.body),
    );
    response.json({ data: { category } });
  };
}
