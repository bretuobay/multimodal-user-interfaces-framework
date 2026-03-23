import { ShowcaseLab } from '../components/showcase-lab';

export const metadata = {
  title: 'MUIX Showcase Lab',
  description:
    'A flagship multimodal demo for MUIX featuring streaming agent interactions, motion gestures, capabilities, and live runtime inspection.',
};

export const dynamic = 'force-dynamic';

export default function Home() {
  return <ShowcaseLab />;
}
