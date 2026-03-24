import { highlightCode } from '@repo/ui';
import { ShowcaseLab } from '../components/showcase-lab';

export const metadata = {
  title: 'MUIX Showcase Lab',
  description:
    'A flagship multimodal demo for MUIX featuring streaming agent interactions, motion gestures, capabilities, and live runtime inspection.',
};

export const dynamic = 'force-dynamic';

const demoSnippet = `import { createAgentChannel } from "@muix/agent";
import { createMotionChannel, createGestureRecognizer } from "@muix/motion";
import { createSession } from "@muix/core";

const session = createSession({ id: "showcase-lab" });
const agent = createAgentChannel({ endpoint: "/api/chat" });
const motion = createMotionChannel({ id: "motion-source" });
const gestures = motion.pipe(createGestureRecognizer());

session.addChannel("agent");
session.addChannel("motion");
session.addChannel("gestures");`;

export default async function Home() {
  const demoSnippetHtml = await highlightCode(demoSnippet, 'ts');

  return (
    <ShowcaseLab
      codeExample={{
        code: demoSnippet,
        html: demoSnippetHtml,
        language: 'ts',
        title: 'runtime-setup.ts',
      }}
    />
  );
}
