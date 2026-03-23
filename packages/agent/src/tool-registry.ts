import type { AgentTool } from './types.js';

export class ToolRegistry {
  private readonly _tools = new Map<string, AgentTool>();

  register(tool: AgentTool): void {
    this._tools.set(tool.name, tool);
  }

  unregister(name: string): void {
    this._tools.delete(name);
  }

  get(name: string): AgentTool | undefined {
    return this._tools.get(name);
  }

  has(name: string): boolean {
    return this._tools.has(name);
  }

  all(): AgentTool[] {
    return Array.from(this._tools.values());
  }

  /** Serialize tools to the OpenAI function-calling format */
  toOpenAITools(): Array<{
    type: 'function';
    function: { name: string; description: string; parameters: Record<string, unknown> };
  }> {
    return this.all().map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  async execute(
    name: string,
    args: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<unknown> {
    const tool = this._tools.get(name);
    if (!tool) throw new Error(`Tool "${name}" is not registered`);
    return tool.execute(args, signal);
  }
}
