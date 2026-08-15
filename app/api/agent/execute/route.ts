import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const { taskId } = await req.json();

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const { data: task, error: taskError } = await supabase
      .from('agent_tasks')
      .select('*, system_agents(*)')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task or assigned Agent not found' }, { status: 404 });
    }

    await supabase
      .from('agent_tasks')
      .update({ status: 'IN_PROGRESS', updated_at: new Date().toISOString() })
      .eq('id', taskId);

    const systemPrompt = `You are ${task.system_agents.agent_name}, an autonomous AI agent for NeuraOps Co. Global.
Role: ${task.system_agents.role}
Specialization: ${JSON.stringify(task.system_agents.capabilities || {})}

Instructions:
- Adhere strictly to medical compliance, accuracy, and HIPAA standards.
- Return the execution response ONLY as valid JSON.
- Structure your output clearly with actionable insight.`;

    const userPrompt = `Execute Task: ${task.task_name}
Description: ${task.task_description}
Payload Data: ${JSON.stringify(task.payload)}`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textOutput = response.content[0].type === 'text' ? response.content[0].text : '';
    let parsedResult;

    try {
      parsedResult = JSON.parse(textOutput);
    } catch {
      parsedResult = { raw_output: textOutput };
    }

    const { data: updatedTask, error: updateError } = await supabase
      .from('agent_tasks')
      .update({
        status: 'COMPLETED',
        execution_result: parsedResult,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .select();

    if (updateError) {
      throw new Error(`Database Update Failed: ${updateError.message}`);
    }

    return NextResponse.json({ success: true, task: updatedTask });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
