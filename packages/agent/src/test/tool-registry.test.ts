import { describe, it, expect, vi } from 'vitest';
import { ToolRegistry } from '../tool-registry.js';

describe('ToolRegistry', () => {
  it('registers and retrieves a tool', () => {
    const registry = new ToolRegistry();
    const tool = {
      name: 'calculator',
      description: 'Math operations',
      parameters: { type: 'object', properties: { expr: { type: 'string' } } },
      execute: vi.fn().mockResolvedValue(42),
    };
    registry.register(tool);
    expect(registry.has('calculator')).toBe(true);
    expect(registry.get('calculator')).toBe(tool);
  });

  it('unregisters a tool', () => {
    const registry = new ToolRegistry();
    registry.register({ name: 'calc', description: '', parameters: {}, execute: vi.fn() });
    registry.unregister('calc');
    expect(registry.has('calc')).toBe(false);
  });

  it('all() returns all tools', () => {
    const registry = new ToolRegistry();
    registry.register({ name: 'a', description: '', parameters: {}, execute: vi.fn() });
    registry.register({ name: 'b', description: '', parameters: {}, execute: vi.fn() });
    expect(registry.all()).toHaveLength(2);
  });

  it('toOpenAITools() serializes correctly', () => {
    const registry = new ToolRegistry();
    registry.register({
      name: 'get_weather',
      description: 'Get weather',
      parameters: { type: 'object', properties: { city: { type: 'string' } } },
      execute: vi.fn(),
    });
    const tools = registry.toOpenAITools();
    expect(tools).toHaveLength(1);
    expect(tools[0]).toEqual({
      type: 'function',
      function: {
        name: 'get_weather',
        description: 'Get weather',
        parameters: { type: 'object', properties: { city: { type: 'string' } } },
      },
    });
  });

  it('execute() calls the tool', async () => {
    const registry = new ToolRegistry();
    const execute = vi.fn().mockResolvedValue('result');
    registry.register({ name: 'tool', description: '', parameters: {}, execute });
    const controller = new AbortController();
    const result = await registry.execute('tool', { x: 1 }, controller.signal);
    expect(result).toBe('result');
    expect(execute).toHaveBeenCalledWith({ x: 1 }, controller.signal);
  });

  it('execute() throws for unknown tool', async () => {
    const registry = new ToolRegistry();
    await expect(
      registry.execute('ghost', {}, new AbortController().signal),
    ).rejects.toThrow('not registered');
  });
});
