import { createTodoSchema, updateTodoSchema } from '../../src/validators/todoValidators';

describe('To-Do List Validators and Logic', () => {
  it('should validate valid todo input', () => {
    const input = {
      title: 'Pay Electricity Bill',
      description: 'Monthly utility bill via net banking',
      priority: 'HIGH'
    };

    const parsed = createTodoSchema.parse(input);
    expect(parsed.title).toBe('Pay Electricity Bill');
    expect(parsed.priority).toBe('HIGH');
  });

  it('should reject empty todo title', () => {
    expect(() => {
      createTodoSchema.parse({ title: '   ' });
    }).toThrow();
  });

  it('should allow valid updates including completion flag', () => {
    const updateInput = {
      isCompleted: true,
      priority: 'LOW'
    };

    const parsed = updateTodoSchema.parse(updateInput);
    expect(parsed.isCompleted).toBe(true);
    expect(parsed.priority).toBe('LOW');
  });
});
